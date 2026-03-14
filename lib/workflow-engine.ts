import type { WorkflowEdge, WorkflowJSON, WorkflowNode } from "@/types";

export type NormalizedWorkflowNodeType =
  | "start"
  | "send_email"
  | "send_whatsapp"
  | "wait"
  | "condition"
  | "auto_reply"
  | "end";

export interface ParsedWorkflowNode extends WorkflowNode {
  normalizedType: NormalizedWorkflowNodeType;
}

export interface ParsedWorkflowEdge extends WorkflowEdge {
  conditionKey?: string;
}

export interface ParsedWorkflow {
  startNodeId: string;
  nodesById: Map<string, ParsedWorkflowNode>;
  outgoingBySource: Map<string, ParsedWorkflowEdge[]>;
}

export interface WorkflowHandlerResult {
  branch?: string;
  delayMs?: number;
  nextNodeId?: string;
  stop?: boolean;
}

export type WorkflowHandler<TContext> = (
  node: ParsedWorkflowNode,
  context: TContext
) => Promise<WorkflowHandlerResult | void> | WorkflowHandlerResult | void;

export type WorkflowHandlers<TContext> = Record<
  NormalizedWorkflowNodeType,
  WorkflowHandler<TContext>
>;

export interface WorkflowRunResult {
  status: "completed" | "waiting";
  currentNodeId: string;
  steps: number;
  waitUntil?: string;
}

export interface RunWorkflowOptions {
  maxSteps?: number;
  startNodeId?: string;
}

export function normalizeNodeType(type: string): NormalizedWorkflowNodeType {
  switch (type) {
    case "start":
      return "start";
    case "send_email":
    case "sendEmail":
    case "sendFollowup":
      return "send_email";
    case "send_whatsapp":
      return "send_whatsapp";
    case "wait":
      return "wait";
    case "condition":
    case "checkReply":
      return "condition";
    case "auto_reply":
      return "auto_reply";
    case "end":
      return "end";
    default:
      throw new Error(`Unsupported workflow node type: ${type}`);
  }
}

export function parseWorkflow(workflow: WorkflowJSON): ParsedWorkflow {
  const nodesById = new Map<string, ParsedWorkflowNode>();
  const outgoingBySource = new Map<string, ParsedWorkflowEdge[]>();

  for (const node of workflow.nodes || []) {
    nodesById.set(node.id, {
      ...node,
      normalizedType: normalizeNodeType(node.type),
    });
  }

  for (const edge of workflow.edges || []) {
    const parsedEdge: ParsedWorkflowEdge = {
      ...edge,
      conditionKey: edge.sourceHandle || edge.condition,
    };
    const outgoing = outgoingBySource.get(edge.source) || [];
    outgoing.push(parsedEdge);
    outgoingBySource.set(edge.source, outgoing);
  }

  const startNode = Array.from(nodesById.values()).find(
    (node) => node.normalizedType === "start"
  );

  if (!startNode) {
    throw new Error("Workflow must include a start node");
  }

  for (const node of nodesById.values()) {
    if (node.normalizedType !== "condition" && node.normalizedType !== "auto_reply") continue;

    const outgoing = outgoingBySource.get(node.id) || [];
    const branchKeys = new Set(
      outgoing.map((edge) => edge.conditionKey).filter(Boolean)
    );

    if (node.normalizedType === "condition") {
      if (!branchKeys.has("yes") || !branchKeys.has("no")) {
        throw new Error(
          `Condition node ${node.id} must define both "yes" and "no" branches`
        );
      }
    } else {
      // auto_reply
      if (!branchKeys.has("answered") || !branchKeys.has("unanswered")) {
        throw new Error(
          `Auto Reply node ${node.id} must define both "answered" and "unanswered" branches`
        );
      }
    }
  }

  return {
    startNodeId: startNode.id,
    nodesById,
    outgoingBySource,
  };
}

function resolveNextNodeId(
  workflow: ParsedWorkflow,
  node: ParsedWorkflowNode,
  result: WorkflowHandlerResult
): string | null {
  if (result.nextNodeId) {
    if (!workflow.nodesById.has(result.nextNodeId)) {
      throw new Error(`Node ${result.nextNodeId} not found`);
    }
    return result.nextNodeId;
  }

  const outgoing = workflow.outgoingBySource.get(node.id) || [];
  if (!outgoing.length) return null;

  if (result.branch) {
    const conditionedEdge = outgoing.find(
      (edge) => edge.conditionKey === result.branch
    );
    if (!conditionedEdge) {
      throw new Error(
        `No outgoing edge from ${node.id} for branch "${result.branch}"`
      );
    }
    return conditionedEdge.target;
  }

  if (outgoing.length === 1) {
    return outgoing[0].target;
  }

  const defaultEdge = outgoing.find((edge) => !edge.conditionKey);
  if (defaultEdge) {
    return defaultEdge.target;
  }

  throw new Error(`Node ${node.id} requires an explicit branch selection`);
}

// Example:
// await runWorkflow(workflowJson, { email: "lead@example.com" }, handlers)
export async function runWorkflow<TContext>(
  workflow: ParsedWorkflow | WorkflowJSON,
  context: TContext,
  handlers: WorkflowHandlers<TContext>,
  options: RunWorkflowOptions = {}
): Promise<WorkflowRunResult> {
  const parsedWorkflow =
    "nodesById" in workflow ? workflow : parseWorkflow(workflow);

  let currentNodeId = options.startNodeId || parsedWorkflow.startNodeId;
  let steps = 0;
  const maxSteps = options.maxSteps ?? Math.max(parsedWorkflow.nodesById.size * 2, 10);

  while (true) {
    steps++;
    if (steps > maxSteps) {
      throw new Error("Workflow exceeded maximum synchronous steps");
    }

    const node = parsedWorkflow.nodesById.get(currentNodeId);
    if (!node) {
      throw new Error(`Node ${currentNodeId} not found`);
    }

    const handler = handlers[node.normalizedType];
    const result = (await handler(node, context)) || {};

    if (node.normalizedType === "end" || result.stop) {
      return {
        status: "completed",
        currentNodeId: node.id,
        steps,
      };
    }

    const nextNodeId = resolveNextNodeId(parsedWorkflow, node, result);
    if (!nextNodeId) {
      return {
        status: "completed",
        currentNodeId: node.id,
        steps,
      };
    }

    if (result.delayMs && result.delayMs > 0) {
      return {
        status: "waiting",
        currentNodeId: nextNodeId,
        steps,
        waitUntil: new Date(Date.now() + result.delayMs).toISOString(),
      };
    }

    currentNodeId = nextNodeId;
  }
}
