"use client";

import { memo, useCallback } from "react";
import { Handle, Position, useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { MessageSquareReply } from "lucide-react";
import type { AutoReplyNodeData } from "@/types";
import {
  NodeShell,
  nodeInputClassName,
  nodeSoftHandleLabelClassName,
} from "./node-shell";

type AutoReplyNodeType = Node<AutoReplyNodeData, "auto_reply">;

function AutoReplyNodeComponent({ id, data, selected }: NodeProps<AutoReplyNodeType>) {
  const { updateNodeData } = useReactFlow();

  const handleTonePrompt = useCallback(
    (value: string) => updateNodeData(id, { tone_prompt: value }),
    [id, updateNodeData]
  );

  const handleToggle = useCallback(
    (key: "use_product_context" | "use_campaign_context", value: boolean) => {
      updateNodeData(id, { [key]: value });
    },
    [id, updateNodeData]
  );

  const tonePrompt = typeof data.tone_prompt === "string" ? data.tone_prompt : "";
  const useProduct = data.use_product_context !== false;
  const useCampaign = data.use_campaign_context !== false;

  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="teal"
      icon={MessageSquareReply}
      eyebrow="Auto Reply"
      title="AI Auto Reply"
      description="Replies automatically when the lead's question can be fully answered from the knowledge base."
      badge="AI"
      minWidthClassName="min-w-[300px]"
      sourceHandle={false}
    >
      {/* Tone / instructions */}
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Tone instructions
        </span>
        <textarea
          className={nodeInputClassName("teal")}
          rows={2}
          placeholder="Be concise and professional. Keep replies under 150 words."
          value={tonePrompt}
          onChange={(e) => handleTonePrompt(e.target.value)}
        />
      </label>

      {/* Context toggles */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Knowledge base
        </span>
        <label className="flex items-center gap-2 cursor-pointer nodrag select-none">
          <input
            type="checkbox"
            checked={useProduct}
            onChange={(e) => handleToggle("use_product_context", e.target.checked)}
            className="nodrag h-3.5 w-3.5 rounded accent-teal-500"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">Include product knowledge base</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer nodrag select-none">
          <input
            type="checkbox"
            checked={useCampaign}
            onChange={(e) => handleToggle("use_campaign_context", e.target.checked)}
            className="nodrag h-3.5 w-3.5 rounded accent-teal-500"
          />
          <span className="text-xs text-slate-600 dark:text-slate-300">Include campaign knowledge base</span>
        </label>
      </div>

      {/* Branch output labels */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-black/5 dark:bg-slate-950/35 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <span className={nodeSoftHandleLabelClassName("teal")}>Answered</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">sent reply</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-black/5 dark:bg-slate-950/35 dark:ring-white/10">
          <div className="flex items-center justify-between">
            <span className={nodeSoftHandleLabelClassName("teal")}>Unanswered</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">escalate</span>
          </div>
        </div>
      </div>

      {/* Dual source handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="answered"
        className="!h-3 !w-3 !border-2 !border-white !bg-teal-600 shadow-sm dark:!border-slate-950 dark:!bg-teal-300"
        style={{ left: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="unanswered"
        className="!h-3 !w-3 !border-2 !border-white !bg-amber-500 shadow-sm dark:!border-slate-950 dark:!bg-amber-300"
        style={{ left: "70%" }}
      />
    </NodeShell>
  );
}

export const AutoReplyNode = memo(AutoReplyNodeComponent);
