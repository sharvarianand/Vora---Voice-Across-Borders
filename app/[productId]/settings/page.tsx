"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { toast } from "sonner";
import { useLingoContext } from "@lingo.dev/compiler/react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Upload, FileText,
  HelpCircle, Save, Loader2, X, Check, Package,
  MessageCircle, Wifi, WifiOff, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { KnowledgeBaseItem, AutomationContext } from "@/types";

// ── KB item card ──────────────────────────────────────────────────────────────

function KbItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: KnowledgeBaseItem;
  onUpdate: (updated: KnowledgeBaseItem) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [q, setQ] = useState(item.question ?? "");
  const [a, setA] = useState(item.answer ?? "");
  const [content, setContent] = useState(item.content ?? "");
  const [label, setLabel] = useState(item.label ?? "");

  const isDirty =
    q !== (item.question ?? "") ||
    a !== (item.answer ?? "") ||
    content !== (item.content ?? "") ||
    label !== (item.label ?? "");

  function save() {
    if (item.type === "faq") {
      onUpdate({ ...item, question: q, answer: a, label: label || undefined });
    } else {
      onUpdate({ ...item, content, label: label || undefined });
    }
  }

  return (
    <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {item.type === "faq" ? (
            <HelpCircle className="h-3.5 w-3.5 text-teal-500 shrink-0" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
          <span className="text-xs font-medium truncate text-foreground">
            {item.type === "faq"
              ? (item.question || "Untitled FAQ")
              : (item.label || item.content?.slice(0, 50) || "Text block")}
          </span>
          <Badge variant="secondary" className="text-[10px] shrink-0 py-0 px-1.5">
            {item.type === "faq" ? "FAQ" : "Text"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t bg-muted/20">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Label (optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Pricing FAQ"
              className="h-7 text-xs"
            />
          </div>
          {item.type === "faq" ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Question</label>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="What is the pricing?"
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Answer</label>
                <Textarea
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                  placeholder="Our plans start at $49/month…"
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="text-xs resize-none"
              />
            </div>
          )}
          {isDirty && (
            <Button size="sm" className="h-7 text-xs" onClick={save}>
              <Save className="h-3 w-3 mr-1.5" /> Save changes
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  knowledge_base: AutomationContext;
}

// ── WhatsApp connection panel ─────────────────────────────────────────────────

function WhatsAppSettings() {
  const [status, setStatus] = useState<{ connected: boolean; phone: string | null } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(async () => {
    const [statusRes, qrRes] = await Promise.all([
      fetch("/api/whatsapp/status")
        .then((r) => r.json())
        .catch(() => ({ connected: false, phone: null })),
      fetch("/api/whatsapp/qr")
        .then((r) => r.json())
        .catch(() => ({})),
    ]);
    setStatus(statusRes);
    setQr(qrRes.qr ?? null);
  }, []);

  useEffect(() => {
    const immediateId = window.setTimeout(() => {
      void refresh();
    }, 0);
    // Poll every 3 s so the UI updates automatically after scanning
    const id = setInterval(refresh, 3_000);
    return () => {
      window.clearTimeout(immediateId);
      clearInterval(id);
    };
  }, [refresh]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/whatsapp/session", { method: "DELETE" });
    setStatus({ connected: false, phone: null });
    setQr(null);
    setTimeout(refresh, 4_000);
    setDisconnecting(false);
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-teal-600" />
          WhatsApp Connection
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a WhatsApp account to send messages via workflow automation.
          Start the worker (<code className="font-mono text-xs bg-muted px-1 rounded">pnpm worker</code>),
          then scan the QR code below with your WhatsApp mobile app.
        </p>
      </div>

      {status === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking connection…
        </div>
      )}

      {status?.connected ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Connected</span>
              {status.phone && (
                <span className="text-xs text-muted-foreground">+{status.phone}</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-destructive hover:bg-destructive/5"
            >
              {disconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              Disconnect
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            ✓ Send WhatsApp nodes in your campaigns will use this account.
          </p>
        </div>
      ) : qr ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm text-amber-600">
            <QrCode className="h-4 w-4" />
            Open WhatsApp → Linked Devices → Link a device, then scan:
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-3 inline-block dark:border-slate-700 dark:bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="WhatsApp QR code" className="w-56 h-56" />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Waiting for scan… (refreshes automatically)
          </p>
        </div>
      ) : status && !status.connected ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground space-y-1">
          <p className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Worker not running or WhatsApp not yet initialised.
          </p>
          <p>
            Run <code className="font-mono text-xs bg-muted px-1 rounded">pnpm worker</code> on your
            GCP VM, then return here — the QR will appear automatically.
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProductSettingsPage() {
  const params = useParams();
  const productId = params.productId as string;
  const { locale } = useLingoContext();

  const [loading, setLoading] = useState(true);

  // Details form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);

  // KB editor
  const [kbItems, setKbItems] = useState<KnowledgeBaseItem[]>([]);
  const [savingKb, setSavingKb] = useState(false);

  // Tab
  const [settingsTab, setSettingsTab] = useState<"kb" | "whatsapp">("kb");

  // Add FAQ inline form
  const [addFaqOpen, setAddFaqOpen] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  // Paste text dialog
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteLabel, setPasteLabel] = useState("");

  // CSV dialog
  const [csvPreview, setCsvPreview] = useState<{ q: string; a: string }[] | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}`)
      .then((r) => r.json())
      .then((data: ProductData) => {
        setName(data.name ?? "");
        setDescription(data.description ?? "");
        setKbItems(data.knowledge_base?.items ?? []);
      })
      .catch(() => toast.error("Failed to load product"))
      .finally(() => setLoading(false));
  }, [productId, locale]);

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error();
      await res.json();
      setDetailsDirty(false);
      toast.success("Product details saved");
    } catch {
      toast.error("Failed to save product details");
    } finally {
      setSavingDetails(false);
    }
  }

  const persistKb = useCallback(async (items: KnowledgeBaseItem[]) => {
    setSavingKb(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledge_base: { items } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Knowledge base saved");
    } catch {
      toast.error("Failed to save knowledge base");
    } finally {
      setSavingKb(false);
    }
  }, [productId]);

  function updateItem(id: string, updated: KnowledgeBaseItem) {
    const next = kbItems.map((it) => (it.id === id ? updated : it));
    setKbItems(next);
    persistKb(next);
  }

  function deleteItem(id: string) {
    const next = kbItems.filter((it) => it.id !== id);
    setKbItems(next);
    persistKb(next);
  }

  function addFaq() {
    if (!newQ.trim() || !newA.trim()) return;
    const next: KnowledgeBaseItem[] = [
      ...kbItems,
      { id: nanoid(8), type: "faq", question: newQ.trim(), answer: newA.trim() },
    ];
    setKbItems(next);
    persistKb(next);
    setNewQ(""); setNewA(""); setAddFaqOpen(false);
  }

  function addPasteText() {
    if (!pasteText.trim()) return;
    const next: KnowledgeBaseItem[] = [
      ...kbItems,
      { id: nanoid(8), type: "text", content: pasteText.trim(), label: pasteLabel.trim() || undefined },
    ];
    setKbItems(next);
    persistKb(next);
    setPasteText(""); setPasteLabel(""); setPasteDialogOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const rows = result.data;
      const qKey = Object.keys(rows[0] || {}).find((k) => /question|q/i.test(k));
      const aKey = Object.keys(rows[0] || {}).find((k) => /answer|a/i.test(k));
      if (!qKey || !aKey) {
        toast.error("CSV must have columns named 'question' and 'answer'");
        return;
      }
      const preview = rows
        .filter((r) => r[qKey]?.trim() && r[aKey]?.trim())
        .map((r) => ({ q: r[qKey].trim(), a: r[aKey].trim() }));
      setCsvPreview(preview);
      setCsvDialogOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function confirmCsvImport() {
    if (!csvPreview) return;
    const newItems: KnowledgeBaseItem[] = csvPreview.map((row) => ({
      id: nanoid(8), type: "faq", question: row.q, answer: row.a,
    }));
    const next = [...kbItems, ...newItems];
    setKbItems(next);
    persistKb(next);
    setCsvPreview(null); setCsvDialogOpen(false);
    toast.success(`Imported ${newItems.length} FAQs`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto space-y-8 pb-12">

        {/* ── Header ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Product Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Edit your product details and manage the knowledge base shared across all campaigns.
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-0 border-b border-border">
          {(["kb", "whatsapp"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSettingsTab(tab)}
              className={[
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                settingsTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab === "kb" ? "Knowledge Base" : "WhatsApp"}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {settingsTab === "kb" && (
          <>
        {/* ── Product Details ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Product Details</h2>
            {detailsDirty && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={saveDetails}
                disabled={savingDetails || !name.trim()}
              >
                {savingDetails
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-background p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Product name</label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setDetailsDirty(true); }}
                placeholder="e.g. Rosey CRM"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Description
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  fed to the AI as product context
                </span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setDetailsDirty(true); }}
                placeholder="Describe what the product does, who it's for, and its key value propositions…"
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Product Knowledge Base ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Product Knowledge Base</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                FAQs and context inherited by <span className="font-medium">all campaigns</span> for this product.
                The Auto Reply node uses this alongside campaign-specific context.
              </p>
            </div>
            {savingKb && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setAddFaqOpen((v) => !v)}>
              <HelpCircle className="h-3.5 w-3.5" /> Add FAQ
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => setPasteDialogOpen(true)}>
              <FileText className="h-3.5 w-3.5" /> Paste Text
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload CSV
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Inline new FAQ form */}
          {addFaqOpen && (
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">New FAQ</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setAddFaqOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Question</label>
                <Input
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                  placeholder="What is your refund policy?"
                  className="h-7 text-xs"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Answer</label>
                <Textarea
                  value={newA}
                  onChange={(e) => setNewA(e.target.value)}
                  placeholder="We offer a 30-day money-back guarantee…"
                  rows={3}
                  className="text-xs resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addFaq(); }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={addFaq} disabled={!newQ.trim() || !newA.trim()}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddFaqOpen(false); setNewQ(""); setNewA(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Items */}
          {kbItems.length === 0 && !addFaqOpen ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              No product-level knowledge base items yet. Add FAQs, paste text, or upload a CSV.
            </div>
          ) : (
            <div className="space-y-2">
              {kbItems.map((item) => (
                <KbItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(updated) => updateItem(item.id, updated)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}

        {settingsTab === "whatsapp" && <WhatsAppSettings />}
      </div>

      {/* ── Paste Text Dialog ── */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Paste Plain Text</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Label (optional)</label>
              <Input value={pasteLabel} onChange={(e) => setPasteLabel(e.target.value)} placeholder="e.g. Company overview" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Content</label>
              <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} placeholder="We are a B2B SaaS company that…" className="text-sm resize-none" autoFocus />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
            <Button onClick={addPasteText} disabled={!pasteText.trim()}>
              <Plus className="h-4 w-4 mr-1.5" /> Add to context
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Preview Dialog ── */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import {csvPreview?.length ?? 0} FAQs from CSV</DialogTitle></DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {csvPreview?.slice(0, 10).map((row, i) => (
              <div key={i} className="rounded-lg border p-2.5 text-xs space-y-0.5">
                <p className="font-medium">Q: {row.q}</p>
                <p className="text-muted-foreground">A: {row.a}</p>
              </div>
            ))}
            {(csvPreview?.length ?? 0) > 10 && (
              <p className="text-xs text-center text-muted-foreground">…and {(csvPreview?.length ?? 0) - 10} more</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmCsvImport}>
              <Upload className="h-4 w-4 mr-1.5" /> Import all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
