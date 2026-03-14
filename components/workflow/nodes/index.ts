import type { NodeTypes } from "@xyflow/react";
import { StartNode } from "./start-node";
import { SendEmailNode } from "./send-email-node";
import { SendWhatsAppNode } from "./send-whatsapp-node";
import { WaitNode } from "./wait-node";
import { ConditionNode } from "./condition-node";
import { AutoReplyNode } from "./auto-reply-node";
import { EndNode } from "./end-node";

export const nodeTypes: NodeTypes = {
  start: StartNode,
  send_email: SendEmailNode,
  send_whatsapp: SendWhatsAppNode,
  wait: WaitNode,
  condition: ConditionNode,
  auto_reply: AutoReplyNode,
  end: EndNode,
};

export { StartNode, SendEmailNode, SendWhatsAppNode, WaitNode, ConditionNode, AutoReplyNode, EndNode };
