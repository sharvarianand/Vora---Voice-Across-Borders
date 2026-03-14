import type { SupabaseClient } from "@supabase/supabase-js";

interface ReplySyncResult {
  checked: number;
  updated: number;
}

interface CandidateLead {
  id: string;
  thread_id: string | null;
  status: string;
  lead: { email: string | null } | null;
}

export async function syncCampaignReplyStatus(
  supabase: SupabaseClient,
  campaignId: string
): Promise<ReplySyncResult> {
  const senderEmail = process.env.GMAIL_USER_EMAIL;
  if (!senderEmail) {
    return { checked: 0, updated: 0 };
  }

  const { data: candidates, error } = await supabase
    .from("campaign_leads")
    .select("id, thread_id, status, lead:leads(email)")
    .eq("campaign_id", campaignId)
    .not("thread_id", "is", null);

  if (error || !candidates?.length) {
    return { checked: 0, updated: 0 };
  }

  const { hasThreadReceivedReply } = await import("@/lib/gmail");
  const matchedIds: string[] = [];
  const nonMatchedIds: string[] = [];
  const waitingIds: string[] = [];

  for (const candidate of candidates as unknown as CandidateLead[]) {
    if (!candidate.thread_id || !candidate.lead?.email) {
      nonMatchedIds.push(candidate.id);
      continue;
    }
    try {
      const hasReply = await hasThreadReceivedReply(
        candidate.thread_id,
        senderEmail,
        candidate.lead.email
      );
      if (hasReply) {
        matchedIds.push(candidate.id);
      } else {
        nonMatchedIds.push(candidate.id);
      }
      if (hasReply && candidate.status === "waiting") {
        waitingIds.push(candidate.id);
      }
    } catch {
      // Non-fatal; reply detection will retry on a future request/sweep.
    }
  }

  const now = new Date().toISOString();
  if (matchedIds.length) {
    await supabase
      .from("campaign_leads")
      .update({
        replied: true,
        last_action_time: now,
      })
      .in("id", matchedIds);
  }

  if (nonMatchedIds.length) {
    await supabase
      .from("campaign_leads")
      .update({
        replied: false,
      })
      .in("id", nonMatchedIds);
  }

  if (waitingIds.length) {
    await supabase
      .from("campaign_leads")
      .update({ next_action_time: now })
      .in("id", waitingIds);
  }

  return { checked: candidates.length, updated: matchedIds.length };
}
