import type { SupabaseClient } from "@supabase/supabase-js";

// ── Warm-up schedule management ─────────────────────────────────────────────

export interface WarmupSchedule {
  id: string;
  campaign_id: string;
  day_number: number;
  daily_limit: number;
  phase: "warmup" | "rampup" | "full";
  started_at: string;
  updated_at: string;
}

export interface DeliverabilityEvent {
  id: string;
  campaign_lead_id: string;
  event_type: "sent" | "bounced_hard" | "bounced_soft" | "complaint";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DeliverabilityStats {
  sent: number;
  hardBounces: number;
  softBounces: number;
  complaints: number;
  bounceRate: number;
  warmupPhase: string | null;
  currentDailyLimit: number | null;
}

/**
 * Compute the daily send limit for a warm-up day using geometric growth.
 * Starts at 10, multiplies by 1.5 each day, capped at 500.
 */
function computeDailyLimit(dayNumber: number): number {
  const base = 10;
  const growthFactor = 1.5;
  const cap = 500;
  return Math.min(Math.floor(base * Math.pow(growthFactor, dayNumber - 1)), cap);
}

/**
 * Determine the warm-up phase based on the day number.
 * Days 1–7: warmup, Days 8–21: rampup, Day 22+: full
 */
function computePhase(dayNumber: number): "warmup" | "rampup" | "full" {
  if (dayNumber <= 7) return "warmup";
  if (dayNumber <= 21) return "rampup";
  return "full";
}

/**
 * Get the effective daily email limit for a campaign, accounting for warm-up.
 * Returns the minimum of the warm-up limit and the campaign's raw rate limit.
 */
export async function getEffectiveDailyLimit(
  supabase: SupabaseClient,
  campaignId: string,
  rawRateLimit?: number | null
): Promise<{ limit: number; warmup: WarmupSchedule | null }> {
  const { data: warmup } = await supabase
    .from("warmup_schedules")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!warmup) {
    return {
      limit: rawRateLimit ?? Infinity,
      warmup: null,
    };
  }

  const warmupLimit = warmup.daily_limit;
  const rawLimit = rawRateLimit ?? Infinity;

  return {
    limit: Math.min(warmupLimit, rawLimit),
    warmup: warmup as WarmupSchedule,
  };
}

/**
 * Advance the warm-up schedule by one day. Called once per engine tick.
 * Recalculates daily_limit and phase based on the new day number.
 */
export async function advanceWarmupDay(
  supabase: SupabaseClient,
  campaignId: string
): Promise<void> {
  const { data: warmup } = await supabase
    .from("warmup_schedules")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!warmup) return;

  // Only advance if a full day has passed since last update
  const lastUpdated = new Date(warmup.updated_at).getTime();
  const now = Date.now();
  const oneDayMs = 86_400_000;

  if (now - lastUpdated < oneDayMs) return;

  const newDay = warmup.day_number + 1;
  const newLimit = computeDailyLimit(newDay);
  const newPhase = computePhase(newDay);

  await supabase
    .from("warmup_schedules")
    .update({
      day_number: newDay,
      daily_limit: newLimit,
      phase: newPhase,
      updated_at: new Date().toISOString(),
    })
    .eq("id", warmup.id);
}

/**
 * Record a deliverability event (sent, bounce, complaint).
 */
export async function recordDeliverabilityEvent(
  supabase: SupabaseClient,
  campaignLeadId: string,
  eventType: "sent" | "bounced_hard" | "bounced_soft" | "complaint",
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase
    .from("deliverability_events")
    .insert({
      campaign_lead_id: campaignLeadId,
      event_type: eventType,
      metadata: metadata || {},
    });
}

/**
 * Classify a Gmail API error into a bounce type.
 * Returns null if the error is not a recognizable bounce.
 */
export function classifyBounceType(
  error: unknown
): "bounced_hard" | "bounced_soft" | null {
  if (!error || typeof error !== "object") return null;

  const message =
    ("message" in error && typeof error.message === "string"
      ? error.message
      : "") +
    ("code" in error && typeof error.code === "number"
      ? ` code:${error.code}`
      : "");

  const lower = message.toLowerCase();

  // Hard bounces — invalid recipient
  if (
    lower.includes("5.1.1") ||
    lower.includes("5.1.2") ||
    lower.includes("invalid") ||
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("user unknown")
  ) {
    return "bounced_hard";
  }

  // Soft bounces — temporary failures
  if (
    lower.includes("4.") ||
    lower.includes("quota") ||
    lower.includes("temporary") ||
    lower.includes("mailbox full") ||
    lower.includes("try again")
  ) {
    return "bounced_soft";
  }

  return null;
}

/**
 * Get aggregate deliverability stats for a campaign.
 */
export async function getDeliverabilityStats(
  supabase: SupabaseClient,
  campaignId: string
): Promise<DeliverabilityStats> {
  // Get all campaign_lead IDs for this campaign
  const { data: clRows } = await supabase
    .from("campaign_leads")
    .select("id")
    .eq("campaign_id", campaignId);

  const clIds = (clRows || []).map((r: { id: string }) => r.id);

  let sent = 0;
  let hardBounces = 0;
  let softBounces = 0;
  let complaints = 0;

  if (clIds.length > 0) {
    const { data: events } = await supabase
      .from("deliverability_events")
      .select("event_type")
      .in("campaign_lead_id", clIds);

    for (const event of events || []) {
      switch (event.event_type) {
        case "sent":
          sent++;
          break;
        case "bounced_hard":
          hardBounces++;
          break;
        case "bounced_soft":
          softBounces++;
          break;
        case "complaint":
          complaints++;
          break;
      }
    }
  }

  const totalBounces = hardBounces + softBounces;
  const bounceRate = sent > 0 ? totalBounces / sent : 0;

  // Get warm-up schedule
  const { data: warmup } = await supabase
    .from("warmup_schedules")
    .select("phase, daily_limit")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  return {
    sent,
    hardBounces,
    softBounces,
    complaints,
    bounceRate: Math.round(bounceRate * 10000) / 10000,
    warmupPhase: warmup?.phase || null,
    currentDailyLimit: warmup?.daily_limit || null,
  };
}

/**
 * Generate the projected warm-up ramp schedule from day 1 to full phase.
 */
export function generateWarmupProjection(): Array<{
  day: number;
  limit: number;
  phase: string;
}> {
  const projection = [];
  for (let day = 1; day <= 30; day++) {
    projection.push({
      day,
      limit: computeDailyLimit(day),
      phase: computePhase(day),
    });
  }
  return projection;
}
