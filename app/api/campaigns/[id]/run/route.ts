import { createClient } from "@/lib/supabase/server";
import { processActiveCampaigns } from "@/lib/engine";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign, error: fetchErr } = await supabase
    .from("campaigns")
    .select("*, product:products(*)")
    .eq("id", id)
    .single();

  if (fetchErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status === "active") {
    return NextResponse.json({ error: "Campaign is already active" }, { status: 400 });
  }

  const nodes = campaign.workflow_json?.nodes || [];
  const hasStart = nodes.some((n: { type: string }) => n.type === "start");
  const hasEnd = nodes.some((n: { type: string }) => n.type === "end");
  if (!hasStart || !hasEnd) {
    return NextResponse.json(
      { error: "Workflow must have at least a Start and End node" },
      { status: 400 }
    );
  }

  // Auto-assign all product leads that aren't already in this campaign
  const startNode = nodes.find((n: { type: string }) => n.type === "start");
  const startNodeId = startNode?.id;
  if (!startNodeId) {
    return NextResponse.json(
      { error: "Workflow start node has no ID — please re-save the workflow and try again." },
      { status: 400 }
    );
  }

  // Collect all valid node IDs so we can heal stale campaign_leads rows
  const validNodeIds = new Set<string>(nodes.map((n: { id: string }) => n.id).filter(Boolean));

  const { data: allLeads } = await supabase
    .from("leads")
    .select("id")
    .eq("product_id", campaign.product_id);

  if (allLeads?.length) {
    const { data: existingAssignments } = await supabase
      .from("campaign_leads")
      .select("lead_id, id, current_node_id, status")
      .eq("campaign_id", id);

    // Fix any existing rows whose current_node_id no longer exists in the workflow
    const staleRows = (existingAssignments || []).filter(
      (a) => a.current_node_id && !validNodeIds.has(a.current_node_id)
    );
    if (staleRows.length > 0) {
      const staleIds = staleRows.map((r) => r.id);
      await supabase
        .from("campaign_leads")
        .update({ current_node_id: startNodeId, status: "queued", next_action_time: new Date().toISOString() })
        .in("id", staleIds);
    }

    const alreadyAssigned = new Set(
      (existingAssignments || []).map((a) => a.lead_id)
    );
    const newLeadIds = allLeads
      .map((l) => l.id)
      .filter((lid) => !alreadyAssigned.has(lid));

    if (newLeadIds.length > 0) {
      const now = new Date().toISOString();
      const rows = newLeadIds.map((leadId) => ({
        campaign_id: id,
        lead_id: leadId,
        current_node_id: startNodeId,
        status: "queued" as const,
        next_action_time: now,
        last_action_time: now,
      }));

      await supabase.from("campaign_leads").insert(rows);
    }
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const engineResult = await processActiveCampaigns();
  const totalAssigned = allLeads?.length || 0;
  return NextResponse.json({
    ...data,
    leads_assigned: totalAssigned,
    processed_now: engineResult.processed,
    engine_errors: engineResult.errors,
  });
}
