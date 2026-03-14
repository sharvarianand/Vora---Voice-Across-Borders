"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { ConditionNodeData } from "@/types";
import {
  NodeShell,
  nodeInputClassName,
  nodeSoftHandleLabelClassName,
} from "./node-shell";

type ConditionNodeType = Node<ConditionNodeData, "condition">;

function ConditionNodeComponent({ id, data, selected }: NodeProps<ConditionNodeType>) {
  const { updateNodeData } = useReactFlow();

  const handleCheck = useCallback(
    (value: string) => {
      updateNodeData(id, { check: value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="violet"
      icon={GitBranch}
      eyebrow="Decision"
      title="Branch on Reply"
      description="Route the lead based on whether they have responded to your outreach."
      badge="Logic"
      minWidthClassName="min-w-[300px]"
      sourceHandle={false}
    >
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Condition
        </span>
        <select
          className={nodeInputClassName("violet")}
          value={(data.check as string) || "replied"}
          onChange={(e) => handleCheck(e.target.value)}
        >
          <option value="replied">Lead replied</option>
          <option value="not_replied">Lead did not reply</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-black/5 dark:bg-slate-950/35 dark:ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <span className={nodeSoftHandleLabelClassName("violet")}>Yes path</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">continue</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-black/5 dark:bg-slate-950/35 dark:ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <span className={nodeSoftHandleLabelClassName("violet")}>No path</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">retry or exit</span>
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-900 shadow-sm dark:!border-slate-950 dark:!bg-slate-100"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-900 shadow-sm dark:!border-slate-950 dark:!bg-slate-100"
        style={{ left: "70%" }}
      />
    </NodeShell>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
