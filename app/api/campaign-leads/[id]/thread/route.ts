import { createClient } from "@/lib/supabase/server";
import { getThreadMessages } from "@/lib/gmail";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaignLead, error } = await supabase
    .from("campaign_leads")
    .select("*, lead:leads(*)")
    .eq("id", id)
    .single();

  if (error || !campaignLead) {
    return NextResponse.json({ error: "Campaign lead not found" }, { status: 404 });
  }

  if (!campaignLead.thread_id) {
    return NextResponse.json({ messages: [], campaignLead });
  }

  try {
    const messages = await getThreadMessages(campaignLead.thread_id);
    return NextResponse.json({ messages, campaignLead });
  } catch (err) {
    console.error("Failed to fetch thread:", err);
    return NextResponse.json(
      { error: "Failed to fetch thread from Gmail" },
      { status: 500 }
    );
  }
}
