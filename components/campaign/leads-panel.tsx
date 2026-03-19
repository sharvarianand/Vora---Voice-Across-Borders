"use client";

import { useEffect, useState, useCallback, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadsTable } from "@/components/leads/leads-table";
import { UserPlus, Loader2, Zap, Upload, FileText, CheckCircle2, Sparkles, ExternalLink, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import type { Lead, CampaignLead, CandidateLead } from "@/types";

interface LeadsPanelProps {
  campaignId: string;
  productId: string;
}

const statusColors: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  waiting: "bg-amber-100 text-amber-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

// ─── AI find & assign tab ─────────────────────────────────────────────────────
interface EditableLead extends CandidateLead {
  emailDraft: string;
}

function AiFindTab({
  productId,
  campaignId,
  onAssigned,
}: {
  productId: string;
  campaignId: string;
  onAssigned: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<EditableLead[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"search" | "review">("search");

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
      const { candidates: found } = (await res.json()) as { candidates: CandidateLead[] };
      const editable: EditableLead[] = found.map((c) => ({ ...c, emailDraft: c.email }));
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
    if (selectedIndices.size === candidates.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(candidates.map((_, i) => i)));
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
    const createdIds: string[] = [];

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
        const createdLead = (await leadRes.json()) as { id: string };
        createdIds.push(createdLead.id);

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
        errors.push(`${lead.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }

    setProcessing(false);

    if (assigned > 0) {
      toast.success(`Found and assigned ${assigned} leads to campaign`);
      onAssigned(createdIds);
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} leads failed`);
    }
  }

  if (step === "search") {
    return (
      <div className="space-y-4 pt-2">
        <Textarea
          placeholder="e.g. Find 15 VP Sales at B2B SaaS companies in Germany (50-500 employees) using HubSpot"
          className="min-h-[120px] resize-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) handleSearch();
          }}
          disabled={searching}
        />
        <p className="text-xs text-muted-foreground">
          Be specific about roles, industries, company size, location, and keywords. Press ⌘↵ to search.
        </p>
        <div className="flex justify-end">
          <Button onClick={handleSearch} disabled={!query.trim() || searching} className="gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {searching ? "Searching…" : "Find Leads"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 min-h-0">
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
            {candidates.length === 0 ? "No leads found" : `${candidates.length} leads found`}
          </span>
          {candidates.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={toggleAll}
              disabled={processing}
            >
              {selectedIndices.size === candidates.length ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="flex items-center justify-center text-muted-foreground text-sm py-10">
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
          <span className="text-sm text-muted-foreground">{`${selectedIndices.size} selected`}</span>
          <Button
            onClick={handleFindAndAssign}
            disabled={selectedIndices.size === 0 || processing}
            className="gap-2"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {processing ? "Processing…" : `Find & Assign ${selectedIndices.size}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Upload tab ──────────────────────────────────────────────────────────────
function UploadTab({
  productId,
  onUploaded,
}: {
  productId: string;
  onUploaded: (ids: string[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    if (chosen) {
      setFile(chosen);
      setResult(null);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productId", productId);
      const res = await fetch("/api/leads/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult({ imported: data.imported, total: data.total });
      toast.success(`Imported ${data.imported} lead${data.imported !== 1 ? "s" : ""}`);
      onUploaded(data.ids ?? []);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-muted-foreground">
        Upload a <strong>.csv</strong> or <strong>.json</strong> file. CSV must have{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">name</code> and{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> columns. JSON should
        be an array of lead objects.
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        {file ? (
          <div className="flex flex-col items-center gap-2 text-sm">
            <FileText className="h-8 w-8 text-primary" />
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Drag &amp; drop a file here, or click to browse</span>
            <span className="text-xs">Supports CSV and JSON</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={handleFile}
      />

      {result && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Imported {result.imported} of {result.total} leads successfully. Switch to &quot;Select
          Existing&quot; to assign them.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleUpload} disabled={!file || uploading}>
          {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Upload &amp; Import
        </Button>
      </div>

      {/* Sample download links */}
      <p className="text-xs text-muted-foreground">
        Need a sample?{" "}
        <a href="/sample-leads.csv" download className="underline">
          Download CSV template
        </a>
      </p>
    </div>
  );
}

// ─── Manual add tab ───────────────────────────────────────────────────────────
function ManualTab({
  productId,
  onAdded,
}: {
  productId: string;
  onAdded: (id: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    industry: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || null,
          industry: form.industry.trim() || null,
          tags: form.tags
            ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create lead");
      toast.success(`Lead "${form.name}" added. Switch to Select Existing to assign.`);
      onAdded(data.id ?? data[0]?.id ?? "");
      setForm({ name: "", email: "", company: "", industry: "", tags: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-name"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead-email"
            type="email"
            placeholder="jane@acme.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-company">Company</Label>
          <Input
            id="lead-company"
            placeholder="Acme Corp"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-industry">Industry</Label>
          <Input
            id="lead-industry"
            placeholder="SaaS"
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="lead-tags">Tags</Label>
          <Input
            id="lead-tags"
            placeholder="enterprise, fintech (comma-separated)"
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Lead
        </Button>
      </div>
    </form>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function LeadsPanel({ campaignId, productId }: LeadsPanelProps) {
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"select" | "upload" | "manual" | "ai">("select");

  const fetchCampaignLeads = useCallback(() => {
    fetch(`/api/campaigns/${campaignId}/leads`)
      .then((r) => r.json())
      .then(setCampaignLeads)
      .catch(console.error);
  }, [campaignId]);

  const refreshAllLeads = useCallback(() => {
    fetch(`/api/leads?productId=${productId}`)
      .then((r) => r.json())
      .then(setAllLeads)
      .catch(console.error);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/campaigns/${campaignId}/leads`).then((r) => r.json()),
      fetch(`/api/leads?productId=${productId}`).then((r) => r.json()),
    ])
      .then(([clData, leadsData]) => {
        setCampaignLeads(clData);
        setAllLeads(leadsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId, productId]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign() {
    if (selectedIds.size === 0) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: Array.from(selectedIds) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      toast.success(`Assigned ${data.assigned} leads to campaign`);
      setDialogOpen(false);
      setSelectedIds(new Set());
      setActiveTab("select");
      fetchCampaignLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign leads");
    } finally {
      setAssigning(false);
    }
  }

  async function handleProcessNow() {
    setProcessing(true);
    try {
      const res = await fetch("/api/engine/run", { method: "POST" });
      if (!res.ok) throw new Error("Engine run failed");
      const data = await res.json();
      toast.success(`Processed ${data.processed} leads (${data.errors} errors)`);
      fetchCampaignLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process");
    } finally {
      setProcessing(false);
    }
  }

  // Called after upload/manual add — refresh leads and auto-select new ones
  function handleNewLeads(ids: string[]) {
    refreshAllLeads();
    if (ids.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
      setActiveTab("select");
    }
  }

  const assignedLeadIds = new Set(campaignLeads.map((cl) => cl.lead_id));
  const unassignedLeads = allLeads.filter((l) => !assignedLeadIds.has(l.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {campaignLeads.length} lead{campaignLeads.length !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleProcessNow} disabled={processing}>
            {processing
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Zap className="h-4 w-4 mr-2" />}
            Process Now
          </Button>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedIds(new Set());
              setActiveTab("select");
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Leads
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle>Assign Leads to Campaign</DialogTitle>
              </DialogHeader>

              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as typeof activeTab)}
                className="flex flex-col flex-1 min-h-0"
              >
                <TabsList className="mx-6 mt-4 w-auto self-start">
                  <TabsTrigger value="select">Select Existing</TabsTrigger>
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="manual">Add Manually</TabsTrigger>
                  <TabsTrigger value="ai">AI Find</TabsTrigger>
                </TabsList>

                {/* Select Existing */}
                <TabsContent value="select" className="flex-1 overflow-y-auto px-6 pb-4">
                  {unassignedLeads.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground space-y-1">
                      <p>All product leads are already assigned.</p>
                      <p>Use <strong>Upload File</strong> or <strong>Add Manually</strong> to add new leads first.</p>
                    </div>
                  ) : (
                    <>
                      <LeadsTable
                        leads={unassignedLeads}
                        selectable
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                      />
                      <div className="flex items-center justify-between pt-3">
                        <p className="text-sm text-muted-foreground">
                          {selectedIds.size} selected
                        </p>
                        <Button
                          onClick={handleAssign}
                          disabled={selectedIds.size === 0 || assigning}
                        >
                          {assigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Assign {selectedIds.size > 0 ? selectedIds.size : ""} Lead
                          {selectedIds.size !== 1 ? "s" : ""}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Upload File */}
                <TabsContent value="upload" className="px-6 pb-6 overflow-y-auto">
                  <UploadTab
                    productId={productId}
                    onUploaded={handleNewLeads}
                  />
                </TabsContent>

                {/* Add Manually */}
                <TabsContent value="manual" className="px-6 pb-6 overflow-y-auto">
                  <ManualTab
                    productId={productId}
                    onAdded={(id) => handleNewLeads(id ? [id] : [])}
                  />
                </TabsContent>

                {/* AI Find */}
                <TabsContent value="ai" className="px-6 pb-6 overflow-y-auto">
                  <AiFindTab
                    productId={productId}
                    campaignId={campaignId}
                    onAssigned={handleNewLeads}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Node</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Follow-ups</TableHead>
              <TableHead>Replied</TableHead>
              <TableHead>Next Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaignLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No leads assigned yet. Click &quot;Assign Leads&quot; to add leads to this campaign.
                </TableCell>
              </TableRow>
            ) : (
              campaignLeads.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell className="font-medium">{cl.lead?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{cl.lead?.email || "—"}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {cl.current_node_id}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${statusColors[cl.status] || ""}`}
                      variant="secondary"
                    >
                      {cl.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{cl.followup_count}</TableCell>
                  <TableCell>
                    {cl.replied
                      ? <Badge variant="default" className="text-xs">Yes</Badge>
                      : <Badge variant="outline" className="text-xs">No</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {cl.next_action_time
                      ? new Date(cl.next_action_time).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
