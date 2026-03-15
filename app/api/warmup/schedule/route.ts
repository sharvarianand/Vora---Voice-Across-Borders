import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateWarmupProjection } from "@/lib/deliverability";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const campaignId = request.nextUrl.searchParams.get("campaignId");

  if (!campaignId) {
    return NextResponse.json(
      { error: "campaignId query parameter is required" },
      { status: 400 }
    );
  }

  const { data: warmup } = await supabase
    .from("warmup_schedules")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!warmup) {
    return NextResponse.json({
      enabled: false,
      schedule: null,
      projection: generateWarmupProjection(),
    });
  }

  return NextResponse.json({
    enabled: true,
    schedule: warmup,
    projection: generateWarmupProjection(),
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { campaignId, enabled } = body;

  if (!campaignId) {
    return NextResponse.json(
      { error: "campaignId is required" },
      { status: 400 }
    );
  }

  if (enabled === false) {
    // Disable warm-up: delete the schedule
    await supabase
      .from("warmup_schedules")
      .delete()
      .eq("campaign_id", campaignId);

    return NextResponse.json({ enabled: false, schedule: null });
  }

  // Enable warm-up: create or reset the schedule
  const { data: existing } = await supabase
    .from("warmup_schedules")
    .select("id")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (existing) {
    // Reset existing schedule
    const { data: updated } = await supabase
      .from("warmup_schedules")
      .update({
        day_number: 1,
        daily_limit: 10,
        phase: "warmup",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId)
      .select()
      .single();

    return NextResponse.json({ enabled: true, schedule: updated });
  }

  // Create new schedule
  const { data: created, error } = await supabase
    .from("warmup_schedules")
    .insert({
      campaign_id: campaignId,
      day_number: 1,
      daily_limit: 10,
      phase: "warmup",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ enabled: true, schedule: created }, { status: 201 });
}
