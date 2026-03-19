"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLingoContext } from "@lingo.dev/compiler/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Megaphone, Loader2, MoreVertical, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/types";
import { getCampaignTemplates, type CampaignTemplate } from "@/lib/templates";

interface CampaignWithCounts extends Campaign {
   campaign_leads: [{ count: number }];
}

const statusColors: Record<string, string> = {
   draft: "bg-gray-100 text-gray-700",
   active: "bg-green-100 text-green-700",
   completed: "bg-blue-100 text-blue-700",
};

export default function CampaignsPage() {
   const campaignTemplates = getCampaignTemplates();
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;
  const [campaigns, setCampaigns] = useState<CampaignWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CampaignWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { locale } = useLingoContext();

  const fetchCampaigns = useCallback(() => {
    if (!locale) return;
    setLoading(true);
    fetch(`/api/campaigns?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId, locale]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          name: newName.trim(),
          ...(selectedTemplate ? { workflow_json: selectedTemplate.workflow } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const campaign = await res.json();
      setDialogOpen(false);
      setNewName("");
      setSelectedTemplate(null);
      router.push(`/${productId}/campaigns/${campaign.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Campaign deleted");
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete campaign");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage outreach campaigns
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. my-workflow-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Start from a template (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {campaignTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (selectedTemplate?.id === t.id) {
                          setSelectedTemplate(null);
                          if (!newName) setNewName("");
                        } else {
                          setSelectedTemplate(t);
                          if (!newName) setNewName(t.campaignName);
                        }
                      }}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-left text-xs transition-colors ${
                        selectedTemplate?.id === t.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "hover:border-muted-foreground/30 hover:bg-muted/50"
                      }`}
                    >
                      <Workflow className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{t.label}</p>
                        <p className="text-muted-foreground mt-0.5 leading-tight">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={creating || !newName.trim()}
              >
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedTemplate ? "Create from Template" : "Create & Open Builder"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] rounded-xl border bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No campaigns yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Create your first campaign to build a workflow and start outreach.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() =>
                router.push(`/${productId}/campaigns/${campaign.id}`)
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={`text-xs ${statusColors[campaign.status] || ""}`}
                      variant="secondary"
                    >
                      {campaign.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(campaign)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {`${campaign.campaign_leads?.[0]?.count ?? 0} leads assigned`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its associated leads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
