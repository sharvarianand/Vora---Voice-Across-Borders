"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { LeadsTable } from "@/components/leads/leads-table";
import { UserPlus, Loader2, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Lead, CampaignLead } from "@/types";
import Link from "next/link";

export default function CampaignLeadsPage() {
  const params = useParams();
  const productId = params.productId as string;
  const campaignId = params.campaignId as string;
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCampaignLeads = useCallback(() => {
    fetch(`/api/campaigns/${campaignId}/leads`)
      .then((r) => r.json())
      .then(setCampaignLeads)
      .catch(console.error);
  }, [campaignId]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      fetchCampaignLeads();
    }, 15000);

    return () => clearInterval(timer);
  }, [fetchCampaignLeads]);

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

  const assignedLeadIds = new Set(campaignLeads.map((cl) => cl.lead_id));
  const unassignedLeads = allLeads.filter((l) => !assignedLeadIds.has(l.id));

  const statusColors: Record<string, string> = {
    queued: "bg-gray-100 text-gray-700",
    waiting: "bg-amber-100 text-amber-700",
    active: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${productId}/campaigns/${campaignId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Campaign Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {campaignLeads.length} lead{campaignLeads.length !== 1 ? "s" : ""}{" "}
            assigned
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleProcessNow}
          disabled={processing}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          Process Now
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Leads
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Leads to Campaign</DialogTitle>
            </DialogHeader>
            {unassignedLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All leads are already assigned to this campaign.
              </p>
            ) : (
              <>
                <LeadsTable
                  leads={unassignedLeads}
                  selectable
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                />
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </p>
                  <Button
                    onClick={handleAssign}
                    disabled={selectedIds.size === 0 || assigning}
                  >
                    {assigning && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Assign {selectedIds.size} Lead
                    {selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
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
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leads assigned yet. Click &quot;Assign Leads&quot; to add
                  leads to this campaign.
                </TableCell>
              </TableRow>
            ) : (
              campaignLeads.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell className="font-medium">
                    {cl.lead?.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cl.lead?.email || "—"}
                  </TableCell>
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
                    {cl.replied ? (
                      <Badge variant="default" className="text-xs">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No
                      </Badge>
                    )}
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
