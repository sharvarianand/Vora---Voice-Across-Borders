"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import Papa from "papaparse";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, FileText, HelpCircle, Lock, Save, Loader2, X, Pencil, Check } from "lucide-react";
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

interface AutomationPanelProps {
  campaignId: string;
  productId: string;
}

interface AutomationData {
  automation_context: AutomationContext;
  product_knowledge_base: AutomationContext;
  product: { id: string; name: string; description: string | null } | null;
}

// ── Inline FAQ editor ─────────────────────────────────────────────────────────

function FaqItemCard({
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
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
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

// ── Read-only product KB item ─────────────────────────────────────────────────

function ReadonlyItemCard({ item }: { item: KnowledgeBaseItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border bg-muted/30 overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {item.type === "faq" ? (
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs truncate text-muted-foreground">
            {item.type === "faq" ? (item.question || "Untitled") : (item.label || "Text block")}
          </span>
          <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-1.5 border-t text-xs text-muted-foreground">
          {item.type === "faq" ? (
            <>
              <p className="font-medium text-foreground/70">Q: {item.question}</p>
              <p>A: {item.answer}</p>
            </>
          ) : (
            <p className="whitespace-pre-wrap">{item.content}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function AutomationPanel({ campaignId, productId }: AutomationPanelProps) {
  const [data, setData] = useState<AutomationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Product editing state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [productDirty, setProductDirty] = useState(false);

  // Campaign-level items (editable)
  const [campaignItems, setCampaignItems] = useState<KnowledgeBaseItem[]>([]);

  // Dialogs
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteLabel, setPasteLabel] = useState("");

  // New FAQ inline form
  const [addFaqOpen, setAddFaqOpen] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  // CSV upload state
  const [csvPreview, setCsvPreview] = useState<{ q: string; a: string }[] | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}/automation`)
      .then((r) => r.json())
      .then((d: AutomationData) => {
        setData(d);
        setCampaignItems(d.automation_context?.items ?? []);
        setProductName(d.product?.name ?? "");
        setProductDescription(d.product?.description ?? "");
      })
      .catch(() => toast.error("Failed to load automation context"))
      .finally(() => setLoading(false));
  }, [campaignId]);

  async function saveProduct() {
    if (!data?.product) return;
    setSavingProduct(true);
    try {
      const res = await fetch(`/api/products/${data.product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productName.trim(), description: productDescription.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setData((prev) => prev ? { ...prev, product: { ...prev.product!, name: updated.name, description: updated.description } } : prev);
      setProductDirty(false);
      toast.success("Product updated");
    } catch {
      toast.error("Failed to save product");
    } finally {
      setSavingProduct(false);
    }
  }

  // Save campaign items
  const persistItems = useCallback(
    async (items: KnowledgeBaseItem[]) => {
      setSaving(true);
      try {
        await fetch(`/api/campaigns/${campaignId}/automation`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automation_context: { items } }),
        });
        toast.success("Knowledge base saved");
      } catch {
        toast.error("Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [campaignId]
  );

  function updateItem(id: string, updated: KnowledgeBaseItem) {
    const next = campaignItems.map((it) => (it.id === id ? updated : it));
    setCampaignItems(next);
    persistItems(next);
  }

  function deleteItem(id: string) {
    const next = campaignItems.filter((it) => it.id !== id);
    setCampaignItems(next);
    persistItems(next);
  }

  function addFaq() {
    if (!newQ.trim() || !newA.trim()) return;
    const next: KnowledgeBaseItem[] = [
      ...campaignItems,
      { id: nanoid(8), type: "faq", question: newQ.trim(), answer: newA.trim() },
    ];
    setCampaignItems(next);
    persistItems(next);
    setNewQ("");
    setNewA("");
    setAddFaqOpen(false);
  }

  function addPasteText() {
    if (!pasteText.trim()) return;
    const next: KnowledgeBaseItem[] = [
      ...campaignItems,
      { id: nanoid(8), type: "text", content: pasteText.trim(), label: pasteLabel.trim() || undefined },
    ];
    setCampaignItems(next);
    persistItems(next);
    setPasteText("");
    setPasteLabel("");
    setPasteDialogOpen(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
      const rows = result.data;
      const qKey = Object.keys(rows[0] || {}).find((k) =>
        /question|q/i.test(k)
      );
      const aKey = Object.keys(rows[0] || {}).find((k) =>
        /answer|a/i.test(k)
      );
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
      id: nanoid(8),
      type: "faq",
      question: row.q,
      answer: row.a,
    }));
    const next = [...campaignItems, ...newItems];
    setCampaignItems(next);
    persistItems(next);
    setCsvPreview(null);
    setCsvDialogOpen(false);
    toast.success(`Imported ${newItems.length} FAQs`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  const productItems = data?.product_knowledge_base?.items ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

        {/* ── Header ── */}
        <div>
          <h2 className="text-lg font-semibold">Automation</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage the knowledge base used by the{" "}
            <span className="font-medium text-teal-600 dark:text-teal-400">Auto Reply</span> node.
            The AI will only answer questions it can fully resolve from this context.
          </p>
        </div>

        {/* ── Product details (editable) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              Product
              {data?.product && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  {data.product.name}
                </Badge>
              )}
            </h3>
            {productDirty && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={saveProduct}
                disabled={savingProduct || !productName.trim()}
              >
                {savingProduct ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Save
              </Button>
            )}
          </div>

          <div className="rounded-xl border bg-background p-3 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Product name</label>
              <Input
                value={productName}
                onChange={(e) => { setProductName(e.target.value); setProductDirty(true); }}
                placeholder="e.g. Rosey CRM"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Product description
                <span className="ml-1 text-muted-foreground/60 normal-case font-normal">(fed to AI as context)</span>
              </label>
              <Textarea
                value={productDescription}
                onChange={(e) => { setProductDescription(e.target.value); setProductDirty(true); }}
                placeholder="Describe what the product does, who it's for, and its key value propositions…"
                rows={4}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Product Knowledge Base (read-only) ── */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Product Knowledge Base
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inherited by all campaigns for this product.{" "}
              <Link href={`/${productId}/settings`} className="underline underline-offset-2 hover:text-foreground transition-colors">
                Edit in Product Settings
              </Link>
            </p>
          </div>

          {productItems.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              No product-level knowledge base items yet.
            </div>
          ) : (
            <div className="space-y-2">
              {productItems.map((item) => (
                <ReadonlyItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Campaign Knowledge Base (editable) ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Campaign Knowledge Base</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                FAQs and context specific to this campaign.
              </p>
            </div>
            {saving && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setAddFaqOpen((v) => !v)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Add FAQ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setPasteDialogOpen(true)}
            >
              <FileText className="h-3.5 w-3.5" />
              Paste Text
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addFaq();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={addFaq} disabled={!newQ.trim() || !newA.trim()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddFaqOpen(false); setNewQ(""); setNewA(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Items list */}
          {campaignItems.length === 0 && !addFaqOpen ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
              No campaign-level context yet. Add FAQs, paste text, or upload a CSV.
            </div>
          ) : (
            <div className="space-y-2">
              {campaignItems.map((item) => (
                <FaqItemCard
                  key={item.id}
                  item={item}
                  onUpdate={(updated) => updateItem(item.id, updated)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Paste Text Dialog ── */}
      <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Paste Plain Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Label (optional)</label>
              <Input
                value={pasteLabel}
                onChange={(e) => setPasteLabel(e.target.value)}
                placeholder="e.g. Company overview"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Content — paste any text, docs, or context
              </label>
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder="We are a B2B SaaS company that…"
                className="text-sm resize-none"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
            <Button onClick={addPasteText} disabled={!pasteText.trim()}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add to context
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Preview Dialog ── */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import {csvPreview?.length ?? 0} FAQs from CSV</DialogTitle>
          </DialogHeader>
          <div className="max-h-60 overflow-y-auto space-y-2 py-2">
            {csvPreview?.slice(0, 10).map((row, i) => (
              <div key={i} className="rounded-lg border p-2.5 text-xs space-y-0.5">
                <p className="font-medium">Q: {row.q}</p>
                <p className="text-muted-foreground">A: {row.a}</p>
              </div>
            ))}
            {(csvPreview?.length ?? 0) > 10 && (
              <p className="text-xs text-center text-muted-foreground">
                …and {(csvPreview?.length ?? 0) - 10} more
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmCsvImport}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
