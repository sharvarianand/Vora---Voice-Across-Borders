import { createClient } from "@/lib/supabase/server";
import { syncCampaignReplyStatus } from "@/lib/reply-sync";
import { NextRequest, NextResponse } from "next/server";
import type {
  PipelineStage,
  DailyVolume,
  FollowupEffectiveness,
  ActivityEvent,
  LeadPerformance,
  CampaignHealthScore,
  EnrichedAnalytics,
} from "@/types";

function calculateHealthScore(
  replyRate: number,
  bounceRate: number,
  completionRate: number,
  unsubRate: number,
  dailySends: number[],
  emailsSent: number
): CampaignHealthScore {
  const hasData = emailsSent > 0;

  // Reply rate: 0-35 points (>20% = full marks)
  const replyScore = Math.min(35, Math.round((replyRate / 20) * 35));
  const replyDetail = `${replyRate.toFixed(1)}% reply rate`;

  // Bounce rate: 0-25 points (lower is better, <2% = full marks)
  // Score 0 when no emails have been sent yet (no real data)
  const bounceScore = !hasData
    ? 0
    : bounceRate <= 0.02
      ? 25
      : bounceRate >= 0.1
        ? 0
        : Math.round(25 * (1 - (bounceRate - 0.02) / 0.08));
  const bounceDetail = hasData
    ? `${(bounceRate * 100).toFixed(1)}% bounce rate`
    : "No data yet";

  // Completion rate: 0-20 points
  const completionScore = Math.min(20, Math.round(completionRate * 20));
  const completionDetail = `${(completionRate * 100).toFixed(0)}% completed`;

  // Unsub rate: 0-10 points (lower = better, <0.5% = full marks)
  // Score 0 when no emails have been sent yet (no real data)
  const unsubScore = !hasData
    ? 0
    : unsubRate <= 0.005
      ? 10
      : unsubRate >= 0.05
        ? 0
        : Math.round(10 * (1 - (unsubRate - 0.005) / 0.045));
  const unsubDetail = hasData
    ? `${(unsubRate * 100).toFixed(2)}% unsub rate`
    : "No data yet";

  // Velocity/consistency: 0-10 points (are you sending regularly?)
  const activeDays = dailySends.filter((d) => d > 0).length;
  const totalDays = Math.max(dailySends.length, 1);
  const velocityRatio = activeDays / totalDays;
  const velocityScore = Math.min(10, Math.round(velocityRatio * 10));
  const velocityDetail = `${activeDays} active send days`;

  const overall = replyScore + bounceScore + completionScore + unsubScore + velocityScore;

  let grade: "A" | "B" | "C" | "D" | "F";
  if (overall >= 85) grade = "A";
  else if (overall >= 70) grade = "B";
  else if (overall >= 55) grade = "C";
  else if (overall >= 40) grade = "D";
  else grade = "F";

  return {
    overall,
    factors: {
      replyRate: { score: replyScore, max: 35, detail: replyDetail },
      bounceRate: { score: bounceScore, max: 25, detail: bounceDetail },
      completionRate: { score: completionScore, max: 20, detail: completionDetail },
      unsubRate: { score: unsubScore, max: 10, detail: unsubDetail },
      velocity: { score: velocityScore, max: 10, detail: velocityDetail },
    },
    grade,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Sync replies (non-fatal)
  try {
    await syncCampaignReplyStatus(supabase, id);
  } catch {
    // Non-fatal
  }

  // Fetch campaign leads with lead data
  const { data: campaignLeads } = await supabase
    .from("campaign_leads")
    .select(
      "id, status, replied, followup_count, created_at, last_action_time, lead_id, lead:leads(id, name, email, company)"
    )
    .eq("campaign_id", id);

  const cls = campaignLeads || [];
  const clIds = cls.map((cl) => cl.id);

  // Fetch logs
  const { data: logs } =
    clIds.length > 0
      ? await supabase
          .from("logs")
          .select("id, action, status, created_at, campaign_lead_id, metadata")
          .in("campaign_lead_id", clIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const allLogs = logs || [];

  // ── Basic counters ────────────────────────────────────────────────────────
  const totalLeads = cls.length;
  const emailsSent = allLogs.filter(
    (l) => l.action === "send_email" && l.status === "success"
  ).length;
  const emailsSkipped = allLogs.filter(
    (l) => l.action === "send_email" && l.status === "skipped"
  ).length;
  const emailsFailed = allLogs.filter(
    (l) => l.action === "error" && l.status === "failed"
  ).length;
  const emailsAttempted = emailsSent + emailsSkipped + emailsFailed;
  const replies = cls.filter((cl) => cl.replied).length;
  const replyRate = totalLeads > 0 ? (replies / totalLeads) * 100 : 0;
  const completed = cls.filter((cl) => cl.status === "completed").length;
  const failed = cls.filter((cl) => cl.status === "failed").length;
  const inProgress = cls.filter(
    (cl) =>
      cl.status === "queued" ||
      cl.status === "waiting" ||
      cl.status === "active"
  ).length;
  const totalFollowups = cls.reduce(
    (sum, cl) => sum + (cl.followup_count || 0),
    0
  );

  // ── Pipeline funnel ───────────────────────────────────────────────────────
  const queued = cls.filter((cl) => cl.status === "queued").length;
  const waiting = cls.filter((cl) => cl.status === "waiting").length;
  const active = cls.filter((cl) => cl.status === "active").length;

  const pipeline: PipelineStage[] = [
    { stage: "Queued", count: queued, color: "#71717a" },
    { stage: "Active", count: active, color: "#60a5fa" },
    { stage: "Waiting", count: waiting, color: "#fbbf24" },
    { stage: "Replied", count: replies, color: "#a78bfa" },
    { stage: "Completed", count: completed, color: "#34d399" },
    { stage: "Failed", count: failed, color: "#f87171" },
  ];

  // ── Daily volume (last 30 days) ───────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sendLogs = allLogs.filter(
    (l) => l.action === "send_email" && l.status === "success"
  );

  const dailyMap = new Map<string, { sent: number; replies: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { sent: 0, replies: 0 });
  }

  for (const log of sendLogs) {
    const key = log.created_at.slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.get(key)!.sent++;
    }
  }

  // Map replies by date using last_action_time of replied leads
  for (const cl of cls) {
    if (cl.replied && cl.last_action_time) {
      const key = cl.last_action_time.slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.get(key)!.replies++;
      }
    }
  }

  const dailyVolume: DailyVolume[] = Array.from(dailyMap.entries()).map(
    ([date, data]) => ({ date, ...data })
  );

  // ── Follow-up effectiveness ───────────────────────────────────────────────
  // Group emails by follow-up step (derived from followup_count per lead)
  const followupMap = new Map<number, { sent: number; replies: number }>();

  for (const cl of cls) {
    const steps = (cl.followup_count || 0) + 1; // +1 for initial email
    for (let step = 1; step <= steps; step++) {
      if (!followupMap.has(step)) {
        followupMap.set(step, { sent: 0, replies: 0 });
      }
      followupMap.get(step)!.sent++;
    }
    if (cl.replied) {
      const replyStep = steps;
      if (followupMap.has(replyStep)) {
        followupMap.get(replyStep)!.replies++;
      }
    }
  }

  const followupEffectiveness: FollowupEffectiveness[] = Array.from(
    followupMap.entries()
  )
    .sort(([a], [b]) => a - b)
    .slice(0, 5) // max 5 steps
    .map(([step, data]) => ({
      step,
      label:
        step === 1
          ? "Initial Email"
          : `Follow-up ${step - 1}`,
      sent: data.sent,
      replies: data.replies,
      replyRate:
        data.sent > 0
          ? Math.round((data.replies / data.sent) * 1000) / 10
          : 0,
    }));

  // ── Recent activity feed (last 50 events) ─────────────────────────────────
  const clMap = new Map(cls.map((cl) => [cl.id, cl]));

  const recentActivity: ActivityEvent[] = allLogs.slice(0, 50).map((log) => {
    const cl = clMap.get(log.campaign_lead_id);
    const leadData = cl?.lead as unknown;
    const lead = (Array.isArray(leadData) ? leadData[0] : leadData) as { name: string; email: string } | undefined;
    return {
      id: log.id,
      action: log.action,
      status: log.status,
      leadName: lead?.name || "Unknown",
      leadEmail: lead?.email || "",
      createdAt: log.created_at,
      metadata: log.metadata as Record<string, unknown> | null,
    };
  });

  // ── Lead performance table ────────────────────────────────────────────────
  const leadPerformance: LeadPerformance[] = cls.map((cl) => {
    const leadData = cl.lead as unknown;
    const lead = (Array.isArray(leadData) ? leadData[0] : leadData) as { id: string; name: string; email: string; company: string | null } | undefined;
    return {
      id: lead?.id || cl.lead_id,
      campaignLeadId: cl.id,
      name: lead?.name || "Unknown",
      email: lead?.email || "",
      company: lead?.company || null,
      status: cl.status,
      replied: cl.replied,
      followupCount: cl.followup_count || 0,
      lastActionTime: cl.last_action_time,
    };
  });

  // ── Health score ──────────────────────────────────────────────────────────
  // Fetch compliance data for bounce/unsub rates
  let bounceRate = 0;
  let unsubRate = 0;

  if (clIds.length > 0) {
    const { data: events } = await supabase
      .from("deliverability_events")
      .select("event_type")
      .in("campaign_lead_id", clIds);

    const totalEvents = events || [];
    const sentCount = totalEvents.filter((e) => e.event_type === "sent").length;
    const bounces = totalEvents.filter(
      (e) => e.event_type === "bounced_hard" || e.event_type === "bounced_soft"
    ).length;
    bounceRate = sentCount > 0 ? bounces / sentCount : 0;
  }

  // Get unsub rate
  const { count: unsubCount } = await supabase
    .from("unsubscribes")
    .select("id", { count: "exact", head: true });

  const totalSentForUnsub = emailsSent || 1;
  unsubRate = (unsubCount || 0) / totalSentForUnsub;

  const completionRate = totalLeads > 0 ? completed / totalLeads : 0;
  const dailySends = dailyVolume.map((d) => d.sent);

  const healthScore = calculateHealthScore(
    replyRate,
    bounceRate,
    completionRate,
    unsubRate,
    dailySends,
    emailsSent
  );

  const result: EnrichedAnalytics = {
    totalLeads,
    emailsSent,
    emailsSkipped,
    emailsFailed,
    emailsAttempted,
    replies,
    replyRate: Math.round(replyRate * 10) / 10,
    completed,
    failed,
    inProgress,
    totalFollowups,
    pipeline,
    dailyVolume,
    followupEffectiveness,
    recentActivity,
    leadPerformance,
    healthScore,
  };

  return NextResponse.json(result);
}
