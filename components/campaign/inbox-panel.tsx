"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLingoContext } from "@lingo.dev/compiler/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  PenLine,
  Mail,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CampaignLead, ThreadMessage } from "@/types";

interface InboxPanelProps {
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

type ComposeMode = "manual" | "ai";

/**
 * Strip elements/attributes that bleed styles into the host page:
 * - <style>, <script>, <link> blocks
 * - fixed pixel widths/min-widths in inline styles (causes table overflow)
 */
function sanitizeEmailHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    // Clamp hardcoded pixel widths so nothing blows out the bubble width
    .replace(/\bwidth\s*:\s*\d+px/gi, "max-width:100%")
    .replace(/\bmin-width\s*:\s*\d+px/gi, "min-width:0");
}

function extractName(address: string): string {
  const match = address.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return address.split("@")[0];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const sameDay =
      d.toDateString() === now.toDateString();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ThreadMessage }) {
  return (
    <div
      className={cn(
        "flex flex-col max-w-[80%] mb-4",
        msg.isOutbound ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">
          {extractName(msg.isOutbound ? msg.to : msg.from)}
        </span>
        <span className="text-xs text-muted-foreground/60">{formatDate(msg.date)}</span>
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm shadow-sm",
          msg.isOutbound
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm border"
        )}
      >
        <div
          className="break-words overflow-x-auto [&_img]:max-w-full [&_table]:max-w-full [&_table]:w-auto [&_a]:underline [&_p]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-60"
          dangerouslySetInnerHTML={{ __html: msg.body ? sanitizeEmailHtml(msg.body) : "(empty)" }}
        />
      </div>
    </div>
  );
}

// ─── Compose box ──────────────────────────────────────────────────────────────

interface ComposeBoxProps {
  campaignLeadId: string;
  defaultSubject: string;
  onSent: () => void;
}

function ComposeBox({ campaignLeadId, defaultSubject, onSent }: ComposeBoxProps) {
  const [mode, setMode] = useState<ComposeMode>("manual");
  const [subject, setSubject] = useState(defaultSubject ? `Re: ${defaultSubject}` : "");
  const [body, setBody] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/campaign-leads/${campaignLeadId}/compose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setPreview({ subject: data.subject, body: data.body });
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    const finalSubject = subject.trim();
    const finalBody = body.trim();
    if (!finalSubject || !finalBody) {
      toast.error("Subject and message body are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/campaign-leads/${campaignLeadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: finalSubject, htmlBody: finalBody }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Email sent");
      setSubject(defaultSubject ? `Re: ${defaultSubject}` : "");
      setBody("");
      setPrompt("");
      setPreview(null);
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t bg-background p-4 shrink-0 flex flex-col gap-2">
      {/* Mode toggle */}
      <div className="flex items-center gap-1">
        <Button
          variant={mode === "manual" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => { setMode("manual"); setPreview(null); }}
        >
          <PenLine className="h-3.5 w-3.5" />
          Manual
        </Button>
        <Button
          variant={mode === "ai" ? "secondary" : "ghost"}
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => { setMode("ai"); setPreview(null); }}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI-Assisted
        </Button>
      </div>

      {/* AI mode: prompt + generate */}
      {mode === "ai" && (
        <div className="flex gap-2">
          <Input
            placeholder="Describe what this email should say…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="shrink-0"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate
          </Button>
        </div>
      )}

      {/* Subject */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Subject</label>
        <Input
          placeholder="Email subject…"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Body</label>
        <Textarea
          placeholder={
            mode === "ai" && !preview
              ? "AI-generated body will appear here — edit before sending"
              : "Write your message here (HTML is supported)…"
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="text-sm font-mono resize-none min-h-[100px]"
          rows={5}
        />
      </div>

      {/* Footer: AI notice + send button */}
      <div className="flex items-center justify-between gap-2">
        {mode === "ai" && preview ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            AI draft ready — review and edit above before sending.
          </p>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          className="shrink-0 gap-1.5"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
}

// ─── InboxPanel ───────────────────────────────────────────────────────────────

export function InboxPanel({ campaignId }: InboxPanelProps) {
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);
  const { locale } = useLingoContext();

  const selectedLead = campaignLeads.find((cl) => cl.id === selectedId);

  const fetchLeads = useCallback(() => {
    fetch(`/api/campaigns/${campaignId}/leads`)
      .then((r) => r.json())
      .then((data: CampaignLead[]) => {
        setCampaignLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId]);

  // Initial load — inline to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/leads`)
      .then((r) => r.json())
      .then((data: CampaignLead[]) => {
        setCampaignLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [campaignId]);

  const fetchThread = useCallback((campaignLeadId: string) => {
    setThreadLoading(true);
    setThreadError(null);
    fetch(`/api/campaign-leads/${campaignLeadId}/thread`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        return data;
      })
      .then((data) => {
        setMessages(data.messages ?? []);
        setThreadLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load thread";
        setThreadError(msg);
        toast.error(msg);
        setThreadLoading(false);
      });
  }, []);

  // Load thread when selection changes — inline to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/campaign-leads/${selectedId}/thread`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        return data;
      })
      .then((data) => {
        setMessages(data.messages ?? []);
        setThreadError(null);
        setThreadLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load thread";
        setThreadError(msg);
        toast.error(msg);
        setThreadLoading(false);
      });
  }, [selectedId]);

  // Re-fetch everything when the user switches their preferred language from the navbar
  const prevLocaleRef = useRef(locale);
  useEffect(() => {
    if (locale === prevLocaleRef.current) return;
    prevLocaleRef.current = locale;
    // Re-translate the leads list (sidebar subjects)
    fetchLeads();
    // Re-translate the open thread (message bodies)
    if (selectedId) fetchThread(selectedId);
  }, [locale, fetchLeads, fetchThread, selectedId]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSelectLead(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setMessages([]);
    setThreadError(null);
    setThreadLoading(true);
  }

  function handleSent() {
    if (selectedId) fetchThread(selectedId);
    fetchLeads();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading inbox…
      </div>
    );
  }

  const leadsWithThreads = campaignLeads.filter((cl) => cl.thread_id);
  const leadsWithoutThreads = campaignLeads.filter((cl) => !cl.thread_id);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: lead list ── */}
      <div className="w-72 border-r shrink-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/30 shrink-0">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchLeads}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1">
          {campaignLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center gap-2 py-8">
              <Mail className="h-8 w-8 opacity-40" />
              <p>No leads in this campaign yet.</p>
            </div>
          )}

          {leadsWithThreads.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/90 backdrop-blur-sm">
                Active threads ({leadsWithThreads.length})
              </div>
              {leadsWithThreads.map((cl) => (
                <LeadListItem
                  key={cl.id}
                  campaignLead={cl}
                  isSelected={cl.id === selectedId}
                  onClick={() => handleSelectLead(cl.id)}
                />
              ))}
            </>
          )}

          {leadsWithoutThreads.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/90 backdrop-blur-sm">
                Not yet contacted ({leadsWithoutThreads.length})
              </div>
              {leadsWithoutThreads.map((cl) => (
                <LeadListItem
                  key={cl.id}
                  campaignLead={cl}
                  isSelected={cl.id === selectedId}
                  onClick={() => handleSelectLead(cl.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right: thread + compose ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedLead ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10 opacity-30" />
            <p className="text-sm">Select a conversation to view it</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {selectedLead.lead?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedLead.lead?.email}
                  {selectedLead.lead?.company && ` · ${selectedLead.lead.company}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedLead.replied && (
                  <Badge className="bg-green-100 text-green-700 text-xs">Replied</Badge>
                )}
                <Badge
                  className={cn("text-xs", statusColors[selectedLead.status] || "")}
                  variant="secondary"
                >
                  {selectedLead.status}
                </Badge>
                {selectedLead.thread_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                    title="Open in Gmail"
                  >
                    <a
                      href={`https://mail.google.com/mail/u/0/#all/${selectedLead.thread_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => fetchThread(selectedLead.id)}
                  title="Refresh thread"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {threadLoading ? (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading thread…
                </div>
              ) : threadError ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                  <Mail className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium text-destructive">Failed to load thread</p>
                  <p className="text-xs opacity-70 text-center max-w-xs">{threadError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchThread(selectedLead.id)}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <Mail className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No emails sent to this lead yet.</p>
                  <p className="text-xs opacity-70">
                    Use the compose box below to start a conversation.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.messageId} msg={msg} />
                  ))}
                  <div ref={threadBottomRef} />
                </>
              )}
            </div>

            <Separator />

            {/* Compose — key forces remount when lead changes so useState reinitialises */}
            <ComposeBox
              key={selectedLead.id}
              campaignLeadId={selectedLead.id}
              defaultSubject={selectedLead.thread_subject ?? ""}
              onSent={handleSent}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Lead list item ───────────────────────────────────────────────────────────

function LeadListItem({
  campaignLead,
  isSelected,
  onClick,
}: {
  campaignLead: CampaignLead;
  isSelected: boolean;
  onClick: () => void;
}) {
  const lead = campaignLead.lead;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/50",
        isSelected && "bg-primary/10 hover:bg-primary/10"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-sm font-medium truncate">{lead?.name ?? "Unknown"}</span>
          {campaignLead.replied && (
            <span className="text-xs text-green-600 font-medium shrink-0">Replied</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{lead?.email}</p>
        {campaignLead.thread_subject && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {campaignLead.thread_subject}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              statusColors[campaignLead.status] || "bg-gray-100 text-gray-700"
            )}
          >
            {campaignLead.status}
          </span>
        </div>
      </div>
      <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", isSelected && "text-primary")} />
    </button>
  );
}
