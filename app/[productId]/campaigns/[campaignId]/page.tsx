"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLingoContext } from "@lingo.dev/compiler/react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/stores/workflow-store";
import { nodeTypes } from "@/components/workflow/nodes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { AnalyticsPanel } from "@/components/campaign/analytics-panel";
import { LeadsPanel } from "@/components/campaign/leads-panel";
import { InboxPanel } from "@/components/campaign/inbox-panel";
import { AutomationPanel } from "@/components/campaign/automation-panel";
import {
  Save, Play, StopCircle, Loader2, BarChart3, Users, Mail, Clock,
  GitBranch, Square, ChevronLeft, Workflow, Inbox, Gauge, RefreshCw,
  MessageSquareReply, BrainCircuit, Settings, MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/types";

type View = "workflow" | "leads" | "analytics" | "automation" | "inbox" | "settings";

function BuilderInner() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const campaignId = params.campaignId as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [view, setView] = useState<View>("workflow");
  const [rateLimitValue, setRateLimitValue] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { locale } = useLingoContext();

  const nodeItems = [
    { type: "start", label: <>Start</>, icon: Play, color: "text-green-600 bg-green-100" },
    { type: "send_email", label: <>Send Email</>, icon: Mail, color: "text-blue-600 bg-blue-100" },
    { type: "send_whatsapp", label: <>Send WhatsApp</>, icon: MessageCircle, color: "text-teal-600 bg-teal-100" },
    { type: "wait", label: <>Wait / Delay</>, icon: Clock, color: "text-amber-600 bg-amber-100" },
    { type: "condition", label: <>If / Else</>, icon: GitBranch, color: "text-purple-600 bg-purple-100" },
    { type: "auto_reply", label: <>Auto Reply</>, icon: MessageSquareReply, color: "text-teal-600 bg-teal-100" },
    { type: "end", label: <>End</>, icon: Square, color: "text-red-600 bg-red-100" },
  ];

  const sidebarNav: { view: View; label: React.ReactNode; icon: React.ElementType }[] = [
    { view: "workflow", label: <>Workflow Editor</>, icon: Workflow },
    { view: "leads", label: <>Leads</>, icon: Users },
    { view: "analytics", label: <>Analytics</>, icon: BarChart3 },
    { view: "automation", label: <>Automation</>, icon: BrainCircuit },
    { view: "inbox", label: <>Inbox</>, icon: Inbox },
  ];

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    loadWorkflow,
    clear,
  } = useWorkflowStore();

  const { screenToFlowPosition, toObject } = useReactFlow();

  useEffect(() => {
    if (!locale) return;
    clear();
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaign(data);
        setRateLimitValue(
          data.email_rate_limit_per_hour != null
            ? String(data.email_rate_limit_per_hour)
            : ""
        );
        loadWorkflow(data.workflow_json?.nodes || [], data.workflow_json?.edges || []);
      })
      .catch(() => toast.error("Failed to load campaign"));
  }, [campaignId, loadWorkflow, clear, locale]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  async function handleRateLimitSave(value: string) {
    const parsed = value.trim() === "" ? null : parseInt(value, 10);
    if (parsed !== null && (isNaN(parsed) || parsed < 1)) return;
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_rate_limit_per_hour: parsed }),
      });
      if (!res.ok) throw new Error("Failed to save rate limit");
      const data = await res.json();
      setCampaign(data);
      toast.success(
        parsed === null
          ? "Rate limit removed"
          : `Rate limit set to ${parsed} emails/hr`
      );
    } catch {
      toast.error("Failed to update rate limit");
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const flow = toObject();
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_json: {
            nodes: flow.nodes.map((n) => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: n.data,
            })),
            edges: flow.edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle || undefined,
            })),
            viewport: flow.viewport,
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }, [campaignId, toObject]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetch(`/api/campaigns/${campaignId}`).then((r) => r.json());
      setCampaign(data);
      setRateLimitValue(
        data.email_rate_limit_per_hour != null
          ? String(data.email_rate_limit_per_hour)
          : ""
      );
      loadWorkflow(data.workflow_json?.nodes || [], data.workflow_json?.edges || []);
      setRefreshKey((k) => k + 1);
      toast.success("Refreshed");
    } catch {
      toast.error("Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }, [campaignId, loadWorkflow]);

  async function handleStop() {
    setStopping(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to stop campaign");
      const data = await res.json();
      setCampaign(data);
      toast.success("Campaign completed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop campaign");
    } finally {
      setStopping(false);
    }
  }

  async function handleActivate() {
    await handleSave();
    setActivating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/run`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setCampaign(data);
      toast.success("Campaign is now active!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to activate campaign"
      );
    } finally {
      setActivating(false);
    }
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Loading campaign...
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
  };

  function onDragStart(e: React.DragEvent, nodeType: string) {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{campaign.name}</h2>
          <Badge
            className={`text-xs ${statusColors[campaign.status] || ""}`}
            variant="secondary"
          >
            {campaign.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {view === "workflow" && (
            <>
              {/* Email rate limit */}
            <div className="flex items-center gap-1.5 border rounded-md px-2 py-1 bg-muted/40">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                type="number"
                min={1}
                placeholder="∞"
                value={rateLimitValue}
                onChange={(e) => setRateLimitValue(e.target.value)}
                onBlur={() => handleRateLimitSave(rateLimitValue)}
                onKeyDown={(e) => e.key === "Enter" && handleRateLimitSave(rateLimitValue)}
                className="h-6 w-16 border-0 bg-transparent text-xs px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">emails/hr</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
            {(campaign.status === "draft" || campaign.status === "completed") && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Activate Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will start processing the workflow for all assigned leads. Make sure you have assigned leads before activating. The workflow will be auto-saved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleActivate} disabled={activating}>
                      {activating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Yes, Activate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {campaign.status === "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will complete the campaign. Leads currently in progress will be stopped.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStop} disabled={stopping}>
                      {stopping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Yes, Stop
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} title="Refresh all data">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 border-r bg-muted/30 p-3 shrink-0 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 w-full text-muted-foreground"
            onClick={() => router.push(`/${productId}/campaigns`)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Separator className="my-1" />
          {sidebarNav.map(({ view: v, label, icon: Icon }) => (
            <Button
              key={v}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 w-full",
                view === v && "bg-primary/10 text-primary"
              )}
              onClick={() => setView(v)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}

          {/* Node palette — only when workflow editor is active */}
          {view === "workflow" && (
            <>
              <Separator className="my-1" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">
                Nodes
              </h3>
              <div className="space-y-1.5">
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
            </>
          )}

          {/* Campaign settings — pinned to bottom */}
          <div className="mt-auto flex flex-col gap-1">
            <Separator className="my-1" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 w-full",
                view === "settings" && "bg-primary/10 text-primary"
              )}
              onClick={() => setView("settings")}
            >
              <Settings className="h-4 w-4" />
              Campaign Settings
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 h-full overflow-hidden">
          {view === "workflow" && (
            <div className="h-full w-full">
              <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
              className="bg-background"
            >
              <Controls />
              <MiniMap pannable zoomable />
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            </ReactFlow>
            </div>
          )}
          {view === "leads" && (
            <LeadsPanel key={refreshKey} campaignId={campaignId} productId={productId} />
          )}
          {view === "analytics" && (
            <AnalyticsPanel key={refreshKey} campaignId={campaignId} />
          )}
          {view === "automation" && (
            <AutomationPanel campaignId={campaignId} productId={productId} />
          )}
          {view === "inbox" && (
            <InboxPanel key={refreshKey} campaignId={campaignId} productId={productId} />
          )}
          {view === "settings" && campaign && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-lg space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Campaign Settings</h2>
                  <p className="text-sm text-muted-foreground mt-1">Manage settings for this campaign.</p>
                </div>
                <Separator />
                {/* Campaign name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campaign Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={campaign.name}
                      onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                      placeholder="Campaign name"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/campaigns/${campaignId}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: campaign.name }),
                          });
                          if (!res.ok) throw new Error();
                          toast.success("Campaign name updated");
                        } catch {
                          toast.error("Failed to update name");
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                {/* Email rate limit */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Rate Limit</label>
                  <p className="text-xs text-muted-foreground">Max emails sent per hour. Leave blank for no limit.</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={rateLimitValue}
                      onChange={(e) => setRateLimitValue(e.target.value)}
                      placeholder="e.g. 20"
                      className="w-36"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRateLimitSave(rateLimitValue)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <div>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"} className="capitalize">
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignBuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  );
}

