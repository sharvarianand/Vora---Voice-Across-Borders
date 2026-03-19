"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import { useReactFlow, type NodeProps, type Node } from "@xyflow/react";
import { useParams } from "next/navigation";
import { Mail, Sparkles, Loader2, X, ChevronDown, ChevronUp, Search, User } from "lucide-react";
import type { SendEmailNodeData } from "@/types";
import { NodeShell, nodeInputClassName } from "./node-shell";

type SendEmailNodeType = Node<SendEmailNodeData, "send_email">;

interface LeadPickerItem {
  id: string;
  name: string;
  email: string;
  company: string | null;
  is_enriched: boolean;
}

interface PreviewResult {
  subject: string;
  body: string;
  lead_name: string;
  lead_company: string | null;
  is_enriched: boolean;
}

function SendEmailNodeComponent({ id, data, selected }: NodeProps<SendEmailNodeType>) {
  const { updateNodeData } = useReactFlow();
  const params = useParams();
  const campaignId = params?.campaignId as string | undefined;

  const mode = (data.mode as string) || "personalized";

  // Lead picker state
  const [leads, setLeads] = useState<LeadPickerItem[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadPickerItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Preview state
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showBody, setShowBody] = useState(false);

  // Fetch leads when mode is personalized
  useEffect(() => {
    if (mode !== "personalized" || !campaignId || leadsLoaded) return;
    setLeadsLoading(true);
    fetch(`/api/campaigns/${campaignId}/preview-email`)
      .then((r) => r.json())
      .then((data: LeadPickerItem[]) => {
        setLeads(Array.isArray(data) ? data : []);
        setLeadsLoaded(true);
      })
      .catch(() => setLeads([]))
      .finally(() => setLeadsLoading(false));
  }, [mode, campaignId, leadsLoaded]);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as unknown as globalThis.Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filteredLeads = search.trim()
    ? leads.filter(
        (l) =>
          l.name.toLowerCase().includes(search.toLowerCase()) ||
          l.email.toLowerCase().includes(search.toLowerCase()) ||
          (l.company ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  const handlePromptChange = useCallback(
    (value: string) => {
      updateNodeData(id, { prompt: value });
      setPreview(null);
      setPreviewError(null);
    },
    [id, updateNodeData]
  );

  const handleModeChange = useCallback(
    (newMode: "personalized" | "same_for_all") => {
      updateNodeData(id, { mode: newMode, cached_subject: undefined, cached_body: undefined });
      setPreview(null);
      setPreviewError(null);
      setSelectedLead(null);
      setSearch("");
    },
    [id, updateNodeData]
  );

  const generatePreview = useCallback(
    async (lead: LeadPickerItem) => {
      const prompt = (data.prompt as string) || "";
      if (!prompt.trim()) {
        setPreviewError("Add an email prompt first.");
        return;
      }
      if (!campaignId) {
        setPreviewError("Cannot preview outside of a campaign.");
        return;
      }
      setPreviewing(true);
      setPreview(null);
      setPreviewError(null);
      setShowBody(false);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/preview-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, lead_id: lead.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Preview failed");
        setPreview(json as PreviewResult);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Preview failed");
      } finally {
        setPreviewing(false);
      }
    },
    [data.prompt, campaignId]
  );

  function selectLead(lead: LeadPickerItem) {
    setSelectedLead(lead);
    setSearch(lead.name);
    setDropdownOpen(false);
    setPreview(null);
    setPreviewError(null);
    generatePreview(lead);
  }

  return (
    <NodeShell
      id={id}
      selected={selected}
      accent="blue"
      icon={Mail}
      eyebrow="Outreach"
      title={<>Send AI Email</>}
      description={<>Describe the email you want to send — subject and body are generated automatically.</>}
      badge="Action"
      minWidthClassName="min-w-[320px]"
    >
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <>Email Prompt</>
        </span>
        <textarea
          className={nodeInputClassName("blue")}
          placeholder=""
          rows={4}
          value={(data.prompt as string) || ""}
          onChange={(e) => handlePromptChange(e.target.value)}
        />
      </label>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed -mt-1">
        <>Example: We are launching a new promo for our strawberry flavour — write a fun, humorous email for our leads.</>
      </p>

      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <>Generation Mode</>
        </span>
        <div className="flex rounded-md overflow-hidden border border-blue-200 dark:border-blue-800">
          <button
            type="button"
            onClick={() => handleModeChange("personalized")}
            className={`flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
              mode === "personalized"
                ? "bg-blue-500 text-white"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800"
            }`}
          >
            <>Personalized</>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("same_for_all")}
            className={`flex-1 px-3 py-1.5 text-[11px] font-medium border-l border-blue-200 dark:border-blue-800 transition-colors ${
              mode === "same_for_all"
                ? "bg-blue-500 text-white"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800"
            }`}
          >
            <>Same for all</>
          </button>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          {mode === "personalized"
            ? "AI generates a unique email for each lead using their details and web-scraped intelligence."
            : "AI generates one email for all leads. Use {{name}}, {{company}}, {{industry}} for personal touches."}
        </p>
      </div>

      {/* ── Personalized preview ─────────────────────────────────────────── */}
      {mode === "personalized" && (
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Preview for a Lead
          </span>

          {/* Searchable lead picker */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-1.5 rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 px-2.5 py-1.5">
              {leadsLoading ? (
                <Loader2 className="h-3 w-3 text-slate-400 animate-spin shrink-0" />
              ) : (
                <Search className="h-3 w-3 text-slate-400 shrink-0" />
              )}
              <input
                ref={searchRef}
                type="text"
                placeholder={leadsLoading ? "Loading leads…" : leads.length === 0 ? "No leads found" : "Search leads by name, email or company…"}
                value={search}
                disabled={leadsLoading || leads.length === 0}
                className="flex-1 bg-transparent text-[11px] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none min-w-0"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                  if (selectedLead && e.target.value !== selectedLead.name) {
                    setSelectedLead(null);
                    setPreview(null);
                  }
                }}
                onFocus={() => setDropdownOpen(true)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedLead(null);
                    setPreview(null);
                    setPreviewError(null);
                    setDropdownOpen(false);
                    searchRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {dropdownOpen && filteredLeads.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 shadow-lg max-h-44 overflow-y-auto">
                {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onPointerDown={(e) => e.preventDefault()} // prevent blur before click
                    onClick={() => selectLead(lead)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <User className="h-3 w-3 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">
                          {lead.name}
                        </span>
                        {lead.is_enriched && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[8px] font-semibold text-green-700 dark:text-green-400 shrink-0">
                            <Sparkles className="h-2 w-2" />
                            Enriched
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {lead.company ? `${lead.company} · ` : ""}{lead.email}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {dropdownOpen && search.trim() && filteredLeads.length === 0 && !leadsLoading && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 shadow-lg px-3 py-2">
                <p className="text-[11px] text-slate-400">No leads match &quot;{search}&quot;</p>
              </div>
            )}
          </div>

          {previewError && (
            <p className="text-[10px] text-red-500 dark:text-red-400">{previewError}</p>
          )}

          {previewing && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-500 dark:text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating preview for {selectedLead?.name ?? ""}…
            </div>
          )}

          {preview && (
            <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 overflow-hidden">
              {/* Lead badge */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-blue-200 dark:border-blue-800 bg-blue-100/60 dark:bg-blue-900/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Preview for{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {preview.lead_name}
                    </span>
                    {preview.lead_company ? ` · ${preview.lead_company}` : ""}
                  </span>
                  {preview.is_enriched && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 dark:text-green-400">
                      <Sparkles className="h-2.5 w-2.5" />
                      Enriched
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPreview(null); setSearch(""); setSelectedLead(null); }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Subject */}
              <div className="px-3 py-2 border-b border-blue-200 dark:border-blue-800">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">
                  Subject
                </p>
                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
                  {preview.subject}
                </p>
              </div>

              {/* Body toggle */}
              <div className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => setShowBody((v) => !v)}
                  className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showBody ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showBody ? "Hide body" : "Show email body"}
                </button>
                {showBody && (
                  <div
                    className="mt-2 max-h-48 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed prose prose-xs dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: preview.body }}
                  />
                )}
              </div>

              <div className="px-3 pb-2">
                <button
                  type="button"
                  onClick={() => selectedLead && generatePreview(selectedLead)}
                  disabled={previewing}
                  className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline disabled:opacity-50"
                >
                  Regenerate preview
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "same_for_all" && data.cached_subject && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 space-y-1">
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Pre-generated
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
            {data.cached_subject as string}
          </p>
          <button
            type="button"
            onClick={() => updateNodeData(id, { cached_subject: undefined, cached_body: undefined })}
            className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 underline"
          >
            Clear · regenerate on next run
          </button>
        </div>
      )}
    </NodeShell>
  );
}

export const SendEmailNode = memo(SendEmailNodeComponent);
