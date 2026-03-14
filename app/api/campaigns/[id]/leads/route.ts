import { createClient } from "@/lib/supabase/server";
import { syncCampaignReplyStatus } from "@/lib/reply-sync";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  try {
    await syncCampaignReplyStatus(supabase, id);
  } catch {
    // Non-fatal; fallback to returning current DB values.
  }

  const { data, error } = await supabase
    .from("campaign_leads")
    .select("*, lead:leads(*)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const leadIds: string[] = body.lead_ids;

  if (!leadIds?.length) {
    return NextResponse.json({ error: "lead_ids is required" }, { status: 400 });
  }

  // Get the campaign to find the start node
  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("workflow_json")
    .eq("id", id)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const startNode = campaign.workflow_json.nodes?.find(
    (n: { type: string }) => n.type === "start"
  );
  const startNodeId = startNode?.id || "1";
  const now = new Date().toISOString();

  const rows = leadIds.map((leadId) => ({
    campaign_id: id,
    lead_id: leadId,
    current_node_id: startNodeId,
    status: "queued" as const,
    next_action_time: now,
    last_action_time: now,
  }));

  const { data, error } = await supabase
    .from("campaign_leads")
    .upsert(rows, { onConflict: "campaign_id,lead_id" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assigned: data.length });
}
