"use client";

import { Play, Mail, Clock, GitBranch, Square, MessageSquareReply } from "lucide-react";

const nodeItems = [
  { type: "start", label: "Start", icon: Play, color: "text-green-600 bg-green-100" },
  { type: "send_email", label: "Send Email", icon: Mail, color: "text-blue-600 bg-blue-100" },
  { type: "wait", label: "Wait / Delay", icon: Clock, color: "text-amber-600 bg-amber-100" },
  { type: "condition", label: "If / Else", icon: GitBranch, color: "text-purple-600 bg-purple-100" },
  { type: "auto_reply", label: "Auto Reply", icon: MessageSquareReply, color: "text-teal-600 bg-teal-100" },
  { type: "end", label: "End", icon: Square, color: "text-red-600 bg-red-100" },
];

export function NodePalette() {
  function onDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="w-52 border-r bg-muted/30 p-4 shrink-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Nodes
      </h3>
      <div className="space-y-2">
        {nodeItems.map(({ type, label, icon: Icon, color }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            className="flex items-center gap-2.5 rounded-md border bg-background px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded ${color}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
