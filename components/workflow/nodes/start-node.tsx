"use client";

import { memo } from "react";
import { Play } from "lucide-react";
import { type NodeProps, type Node } from "@xyflow/react";
import { NodeShell } from "./node-shell";

function StartNodeComponent({ id, selected }: NodeProps<Node>) {
  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="emerald"
      icon={Play}
      eyebrow="Entry Point"
      title="Start Sequence"
      description="Kick off the campaign flow when a lead enters this automation."
      badge="Start"
      minWidthClassName="min-w-[260px]"
      targetHandle={false}
    />
  );
}

export const StartNode = memo(StartNodeComponent);
