"use client";

import { memo, useCallback, useState } from "react";
import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { MessageCircle, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { WhatsAppNodeData } from "@/types";
import { NodeShell, nodeInputClassName } from "./node-shell";

type SendWhatsAppNodeType = Node<WhatsAppNodeData, "send_whatsapp">;

function SendWhatsAppNodeComponent({ id, data, selected }: NodeProps<SendWhatsAppNodeType>) {
  const { updateNodeData } = useReactFlow();

  const mode = (data.mode as string) || "personalized";
  const [showPreview, setShowPreview] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handlePromptChange = useCallback(
    (value: string) => {
      updateNodeData(id, { prompt: value });
      setPreviewBody(null);
      setPreviewError(null);
    },
    [id, updateNodeData]
  );

  const handleModeChange = useCallback(
    (newMode: "personalized" | "same_for_all") => {
      updateNodeData(id, { mode: newMode, cached_body: undefined });
      setPreviewBody(null);
      setPreviewError(null);
    },
    [id, updateNodeData]
  );

  const handlePreview = useCallback(async () => {
    const prompt = (data.prompt as string) || "";
    if (!prompt.trim()) return;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/whatsapp/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Preview failed");
      setPreviewBody(json.body ?? "");
      setShowPreview(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }, [data.prompt]);

  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="teal"
      icon={MessageCircle}
      eyebrow="Outreach"
      title="Send WhatsApp"
      description="AI-generated WhatsApp message sent to the lead's phone number."
      badge="Action"
      minWidthClassName="min-w-[300px]"
    >
      {/* Prompt */}
      <div className="px-3 pb-2">
        <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
          Message Prompt
        </label>
        <textarea
          className={nodeInputClassName + " min-h-[72px] resize-none"}
          placeholder="e.g. Follow up on our email about {{company}}'s outreach strategy..."
          value={(data.prompt as string) || ""}
          onChange={(e) => handlePromptChange(e.target.value)}
          rows={3}
        />
      </div>

      {/* Mode toggle */}
      <div className="px-3 pb-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
          Generation Mode
        </p>
        <div className="flex gap-1.5">
          {(["personalized", "same_for_all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={[
                "flex-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                mode === m
                  ? "border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
              ].join(" ")}
            >
              {m === "personalized" ? "Personalized" : "Same for all"}
            </button>
          ))}
        </div>
      </div>

      {/* Cache indicator for same_for_all */}
      {mode === "same_for_all" && data.cached_body && (
        <div className="mx-3 mb-3 rounded-md border border-teal-200 bg-teal-50/60 px-2.5 py-1.5 text-[11px] text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-300">
          ✓ Pre-generated message cached
        </div>
      )}

      {/* Preview button */}
      <div className="px-3 pb-3 flex items-center gap-2">
        <button
          disabled={previewing || !(data.prompt as string)?.trim()}
          onClick={handlePreview}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {previewing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Preview
        </button>
        {previewBody && (
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {showPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showPreview ? "Hide" : "Show"} preview
          </button>
        )}
      </div>

      {/* Preview body */}
      {showPreview && previewBody && (
        <div className="mx-3 mb-3 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[12px] text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 whitespace-pre-wrap">
          {previewBody}
        </div>
      )}

      {previewError && (
        <p className="mx-3 mb-3 text-[11px] text-red-500">{previewError}</p>
      )}
    </NodeShell>
  );
}

export const SendWhatsAppNode = memo(SendWhatsAppNodeComponent);
