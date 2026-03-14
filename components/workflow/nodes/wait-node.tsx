"use client";

import { memo, useCallback } from "react";
import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { Clock } from "lucide-react";
import type { WaitNodeData } from "@/types";
import { NodeShell, nodeBadgeClassName, nodeInputClassName } from "./node-shell";

type WaitNodeType = Node<WaitNodeData, "wait">;

function WaitNodeComponent({ id, data, selected }: NodeProps<WaitNodeType>) {
  const { updateNodeData } = useReactFlow();

  const handleDuration = useCallback(
    (value: string) => {
      const num = parseInt(value) || 1;
      updateNodeData(id, { duration: num });
    },
    [id, updateNodeData]
  );

  const handleUnit = useCallback(
    (value: string) => {
      updateNodeData(id, { unit: value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="amber"
      icon={Clock}
      eyebrow="Timing"
      title="Delay Step"
      description="Pause the automation before continuing to the next action."
      badge="Wait"
      minWidthClassName="min-w-[280px]"
    >
      <div className="grid grid-cols-[88px_1fr] gap-2">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Amount
          </span>
          <input
            className={nodeInputClassName("amber")}
            type="number"
            min={1}
            value={(data.duration as number) || 1}
            onChange={(e) => handleDuration(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Unit
          </span>
          <select
            className={nodeInputClassName("amber")}
            value={(data.unit as string) || "days"}
            onChange={(e) => handleUnit(e.target.value)}
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white/55 px-3 py-2 text-[11px] text-slate-600 ring-1 ring-black/5 dark:bg-slate-950/35 dark:text-slate-300 dark:ring-white/10">
        <span>Next action resumes after the delay window closes.</span>
        <span className={nodeBadgeClassName("amber")}>
          {(data.duration as number) || 1} {(data.unit as string) || "days"}
        </span>
      </div>
    </NodeShell>
  );
}

export const WaitNode = memo(WaitNodeComponent);
