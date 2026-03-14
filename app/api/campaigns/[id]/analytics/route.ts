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
    // Non-fatal; analytics still renders from current DB values.
  }

  // Get campaign leads stats
  const { data: campaignLeads } = await supabase
    .from("campaign_leads")
    .select("id, status, replied, followup_count, created_at, last_action_time")
    .eq("campaign_id", id);

  const clIds = (campaignLeads || []).map((cl) => cl.id);

  // Get logs for this campaign
  const { data: logs } = clIds.length > 0
    ? await supabase
        .from("logs")
        .select("action, status, created_at, campaign_lead_id")
        .in("campaign_lead_id", clIds)
    : { data: [] };

  const cls = campaignLeads || [];
  const allLogs = logs || [];

  const totalLeads = cls.length;
  const emailsSent = allLogs.filter(
    (l) => l.action === "send_email" && l.status === "success"
  ).length;
  const emailsSkipped = allLogs.filter(
    (l) => l.action === "send_email" && l.status === "skipped"
  ).length;
  const replies = cls.filter((cl) => cl.replied).length;
  const replyRate = totalLeads > 0 ? (replies / totalLeads) * 100 : 0;
  const completed = cls.filter((cl) => cl.status === "completed").length;
  const failed = cls.filter((cl) => cl.status === "failed").length;
  const inProgress = cls.filter(
    (cl) => cl.status === "queued" || cl.status === "waiting" || cl.status === "active"
  ).length;
  const totalFollowups = cls.reduce((sum, cl) => sum + (cl.followup_count || 0), 0);

  return NextResponse.json({
    totalLeads,
    emailsSent,
    emailsSkipped,
    replies,
    replyRate: Math.round(replyRate * 10) / 10,
    completed,
    failed,
    inProgress,
    totalFollowups,
  });
}
