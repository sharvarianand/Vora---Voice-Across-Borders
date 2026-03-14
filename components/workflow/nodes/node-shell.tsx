"use client";

import type { LucideIcon } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Handle, Position, NodeToolbar, useReactFlow } from "@xyflow/react";
import { cn } from "@/lib/utils";

type Accent = "emerald" | "blue" | "amber" | "violet" | "rose" | "teal";

const accentStyles: Record<
  Accent,
  {
    shell: string;
    selectedRing: string;
    iconWrap: string;
    icon: string;
    eyebrow: string;
    title: string;
    handle: string;
    softHandle: string;
    input: string;
    badge: string;
  }
> = {
  emerald: {
    shell:
      "border-emerald-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-emerald-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-emerald-950/30",
    selectedRing: "ring-2 ring-emerald-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-emerald-100 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900/60",
    icon: "text-emerald-600 dark:text-emerald-300",
    eyebrow: "text-emerald-700/80 dark:text-emerald-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-emerald-600 dark:!bg-emerald-300",
    softHandle:
      "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    input:
      "border-slate-200 bg-white focus:border-emerald-300 focus:ring-emerald-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  blue: {
    shell:
      "border-blue-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-blue-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-blue-950/30",
    selectedRing: "ring-2 ring-blue-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-blue-100 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-900/60",
    icon: "text-blue-600 dark:text-blue-300",
    eyebrow: "text-blue-700/80 dark:text-blue-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-blue-600 dark:!bg-blue-300",
    softHandle:
      "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    input:
      "border-slate-200 bg-white focus:border-blue-300 focus:ring-blue-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-blue-700",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  },
  amber: {
    shell:
      "border-amber-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-amber-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-amber-950/30",
    selectedRing: "ring-2 ring-amber-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-amber-100 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900/60",
    icon: "text-amber-600 dark:text-amber-300",
    eyebrow: "text-amber-700/80 dark:text-amber-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-amber-600 dark:!bg-amber-300",
    softHandle:
      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    input:
      "border-slate-200 bg-white focus:border-amber-300 focus:ring-amber-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-amber-700",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  violet: {
    shell:
      "border-purple-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-purple-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-purple-950/30",
    selectedRing: "ring-2 ring-violet-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-purple-100 ring-1 ring-purple-200 dark:bg-purple-950/40 dark:ring-purple-900/60",
    icon: "text-purple-600 dark:text-purple-300",
    eyebrow: "text-purple-700/80 dark:text-purple-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-purple-600 dark:!bg-purple-300",
    softHandle:
      "border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
    input:
      "border-slate-200 bg-white focus:border-purple-300 focus:ring-purple-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-purple-700",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  },
  rose: {
    shell:
      "border-red-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-red-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-red-950/30",
    selectedRing: "ring-2 ring-rose-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-red-100 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900/60",
    icon: "text-red-600 dark:text-red-300",
    eyebrow: "text-red-700/80 dark:text-red-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-red-600 dark:!bg-red-300",
    softHandle:
      "border-red-200 bg-red-100 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
    input:
      "border-slate-200 bg-white focus:border-red-300 focus:ring-red-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-red-700",
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  },
  teal: {
    shell:
      "border-teal-200/80 bg-white shadow-[0_12px_30px_-26px_rgba(15,23,42,0.2)] dark:border-teal-900/60 dark:[&]:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-teal-950/30",
    selectedRing: "ring-2 ring-teal-500/70 ring-offset-2 dark:ring-offset-slate-950",
    iconWrap: "bg-teal-100 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:ring-teal-900/60",
    icon: "text-teal-600 dark:text-teal-300",
    eyebrow: "text-teal-700/80 dark:text-teal-300/80",
    title: "text-slate-950 dark:text-slate-50",
    handle: "!bg-teal-600 dark:!bg-teal-300",
    softHandle:
      "border-teal-200 bg-teal-100 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300",
    input:
      "border-slate-200 bg-white focus:border-teal-300 focus:ring-teal-200/40 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-teal-700",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
  },
};

interface NodeShellProps {
  accent: Accent;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
  minWidthClassName?: string;
  targetHandle?: boolean;
  sourceHandle?: boolean;
  id?: string;
  selected?: boolean;
}

export function nodeInputClassName(accent: Accent) {
  return cn(
    "nodrag w-full rounded-xl border px-3 py-2 text-xs text-slate-700 shadow-sm outline-none transition focus:ring-4 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500",
    accentStyles[accent].input
  );
}

export function nodeBadgeClassName(accent: Accent) {
  return cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
    accentStyles[accent].badge
  );
}

export function nodeSoftHandleLabelClassName(accent: Accent) {
  return cn(
    "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
    accentStyles[accent].softHandle
  );
}

export function NodeShell({
  accent,
  icon: Icon,
  eyebrow,
  title,
  description,
  badge,
  children,
  className,
  minWidthClassName = "min-w-[240px]",
  targetHandle = true,
  sourceHandle = true,
  id,
  selected = false,
}: NodeShellProps) {
  const styles = accentStyles[accent];
  const { deleteElements } = useReactFlow();

  return (
    <>
      {id ? (
        <NodeToolbar isVisible={selected} position={Position.Top} align="end" offset={6}>
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="flex items-center gap-1.5 rounded-xl bg-red-500 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-md transition hover:bg-red-600 active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </NodeToolbar>
      ) : null}
      <div
        className={cn(
          "relative overflow-visible rounded-[24px] border px-4 py-4 transition-all",
          minWidthClassName,
          styles.shell,
          selected && styles.selectedRing,
          className
        )}
      >
        {targetHandle ? (
          <Handle
            type="target"
            position={Position.Top}
            className={cn(
              "!h-3 !w-3 !border-2 !border-white shadow-sm dark:!border-slate-950",
              styles.handle
            )}
          />
        ) : null}

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", styles.iconWrap)}>
              <Icon className={cn("h-5 w-5", styles.icon)} />
            </div>
            <div className="space-y-1">
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.22em]", styles.eyebrow)}>
                {eyebrow}
              </p>
              <div>
                <h3 className={cn("text-sm font-semibold leading-none", styles.title)}>{title}</h3>
                {description ? (
                  <p className="mt-1 max-w-[18rem] text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          {badge ? <span className={nodeBadgeClassName(accent)}>{badge}</span> : null}
        </div>

        {children ? <div className="space-y-3">{children}</div> : null}

        {sourceHandle ? (
          <Handle
            type="source"
            position={Position.Bottom}
            className={cn(
              "!h-3 !w-3 !border-2 !border-white shadow-sm dark:!border-slate-950",
              styles.handle
            )}
          />
        ) : null}
      </div>
    </>
  );
}
