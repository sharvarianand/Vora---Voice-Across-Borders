"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Sparkles, Loader2, ExternalLink, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CandidateLead } from "@/types";

interface AiFindAssignDialogProps {
  productId: string;
  campaignId: string;
  onAssigned: () => void;
}

interface EditableLead extends CandidateLead {
  emailDraft: string;
}

export function AiFindAssignDialog({ productId, campaignId, onAssigned }: AiFindAssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<EditableLead[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"search" | "review">("search");

  function handleOpen() {
    setOpen(true);
    setStep("search");
    setCandidates([]);
    setSelectedIndices(new Set());
    setQuery("");
  }

  function handleClose() {
    if (!searching && !processing) setOpen(false);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), productId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Search failed");
      }
      const { candidates: found } = await res.json() as { candidates: CandidateLead[] };
      const editable: EditableLead[] = found.map((c) => ({
        ...c,
        emailDraft: c.email,
      }));
      setCandidates(editable);
      setSelectedIndices(new Set(editable.map((_, i) => i)));
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(i: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIndices.size === candidates.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(candidates.map((_, i) => i)));
    }
  }

  function updateEmail(i: number, value: string) {
    setCandidates((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, emailDraft: value } : c))
    );
  }

  async function handleFindAndAssign() {
    const toAdd = candidates.filter((_, i) => selectedIndices.has(i));
    if (toAdd.length === 0) return;
    setProcessing(true);
    let assigned = 0;
    const errors: string[] = [];

    for (const lead of toAdd) {
      try {
        const leadRes = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            name: lead.name,
            email: lead.emailDraft.trim()
              ? lead.emailDraft.trim()
              : `noemail-${crypto.randomUUID()}@placeholder.rosey`,
            company: lead.company,
            industry: lead.industry,
            custom_fields: {
              ...(lead.job_title ? { job_title: lead.job_title } : {}),
              ...(lead.source_url ? { source_url: lead.source_url } : {}),
              found_via: "ai_search",
            },
          }),
        });
        if (!leadRes.ok) {
          const err = await leadRes.json();
          throw new Error(err.error || "Failed to create lead");
        }
        const createdLead = await leadRes.json();
        const assignRes = await fetch(`/api/campaigns/${campaignId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_ids: [createdLead.id] }),
        });
        if (!assignRes.ok) {
          const err = await assignRes.json();
          throw new Error(err.error || "Failed to assign lead");
        }
        assigned++;
      } catch (err) {
        errors.push(
          `${lead.name}: ${err instanceof Error ? err.message : "failed"}`
        );
      }
    }

    setProcessing(false);

    if (assigned > 0) {
      toast.success(`Found and assigned ${assigned} leads to campaign`);
      onAssigned();
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} leads failed`);
    }

    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="gap-2">
        <Sparkles className="h-4 w-4" />
        AI Find & Assign
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Find & Assign Leads
            </DialogTitle>
            <DialogDescription>
              Describe the leads you want in natural language. We&apos;ll find
              them and automatically assign them to this campaign.
            </DialogDescription>
          </DialogHeader>

          {step === "search" && (
            <div className="flex flex-col gap-4 pt-2">
              <Textarea
                placeholder="e.g. Find 10 marketing directors at SaaS companies in the US with series A funding"
                className="min-h-[120px] resize-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) handleSearch();
                }}
                disabled={searching}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about roles, industries, company size, and location. Press ⌘↵ to search.
              </p>
              <Button
                onClick={handleSearch}
                disabled={!query.trim() || searching}
                className="self-end gap-2"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {searching ? "Searching…" : "Find Leads"}
              </Button>
            </div>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-3 min-h-0 flex-1">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 h-7 px-2 text-muted-foreground"
                  onClick={() => setStep("search")}
                  disabled={processing}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {candidates.length === 0
                      ? "No leads found"
                      : `${candidates.length} leads found`}
                  </span>
                  {candidates.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={toggleAll}>
                      {selectedIndices.size === candidates.length
                        ? "Deselect all"
                        : "Select all"}
                    </Button>
                  )}
                </div>
              </div>

              {candidates.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-10">
                  No leads found. Try a different search query.
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 border rounded-md divide-y">
                  {candidates.map((lead, i) => (
                    <div
                      key={i}
                      className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/40 transition-colors ${
                        selectedIndices.has(i) ? "bg-muted/20" : ""
                      }`}
                      onClick={() => toggleSelect(i)}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border accent-primary cursor-pointer shrink-0"
                        checked={selectedIndices.has(i)}
                        onChange={() => toggleSelect(i)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0 space-y-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{lead.name}</span>
                          {lead.job_title && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {lead.job_title}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {lead.company && <span>{lead.company}</span>}
                          {lead.industry && (
                            <>
                              {lead.company && <span>·</span>}
                              <span>{lead.industry}</span>
                            </>
                          )}
                          {lead.source_url && (
                            <>
                              <span>·</span>
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Source <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </>
                          )}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Input
                            placeholder="Email (optional)"
                            className="h-7 text-xs mt-1"
                            value={lead.emailDraft}
                            onChange={(e) => updateEmail(i, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {candidates.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-muted-foreground">
                    {`${selectedIndices.size} selected`}
                  </span>
                  <Button
                    onClick={handleFindAndAssign}
                    disabled={selectedIndices.size === 0 || processing}
                    className="gap-2"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {processing
                      ? "Processing…"
                      : `Find & Assign ${selectedIndices.size} leads`}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
