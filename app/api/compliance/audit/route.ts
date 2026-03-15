import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Count suppressed emails
  const { count: suppressionCount } = await supabase
    .from("suppression_list")
    .select("id", { count: "exact", head: true });

  // Count unsubscribes
  const { count: unsubscribeCount } = await supabase
    .from("unsubscribes")
    .select("id", { count: "exact", head: true });

  // Count bounces from logs
  const { count: bounceCount } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "send_email")
    .eq("status", "failed");

  // Total emails sent
  const { count: totalSent } = await supabase
    .from("logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "send_email")
    .eq("status", "success");

  const sent = totalSent ?? 0;
  const unsubs = unsubscribeCount ?? 0;
  const unsubscribeRate = sent > 0 ? unsubs / sent : 0;

  // Recent unsubscribes (last 50)
  const { data: recentUnsubscribes } = await supabase
    .from("unsubscribes")
    .select("id, email, created_at, campaign_lead_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    suppressionCount: suppressionCount ?? 0,
    unsubscribeCount: unsubs,
    bounceCount: bounceCount ?? 0,
    totalEmailsSent: sent,
    unsubscribeRate: Math.round(unsubscribeRate * 10000) / 10000,
    recentUnsubscribes: recentUnsubscribes || [],
  });
}
