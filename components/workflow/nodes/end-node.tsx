"use client";

import { memo } from "react";
import { Square } from "lucide-react";
import { type NodeProps, type Node } from "@xyflow/react";
import { NodeShell } from "./node-shell";

function EndNodeComponent({ id, selected }: NodeProps<Node>) {
  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="rose"
      icon={Square}
      eyebrow="Exit Point"
      title="Complete Flow"
      description="Stop processing this lead after the campaign reaches its terminal state."
      badge="End"
      minWidthClassName="min-w-[260px]"
      sourceHandle={false}
    />
  );
}

export const EndNode = memo(EndNodeComponent);
