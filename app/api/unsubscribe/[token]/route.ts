import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyUnsubscribeToken,
  addToSuppression,
} from "@/lib/compliance";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const decodedToken = decodeURIComponent(token);
  const campaignLeadId = verifyUnsubscribeToken(decodedToken);

  if (!campaignLeadId) {
    return new NextResponse(
      `<!DOCTYPE html>
<html><head><title>Invalid Link</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
  <h1>Invalid or Expired Link</h1>
  <p>This unsubscribe link is no longer valid.</p>
</body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const supabase = getSupabase();

  // Look up the campaign lead to get the email address
  const { data: campaignLead } = await supabase
    .from("campaign_leads")
    .select("id, lead_id, status, lead:leads(email)")
    .eq("id", campaignLeadId)
    .maybeSingle();

  // Supabase FK joins return an object for single-row joins via maybeSingle()
  const leadData = campaignLead?.lead as unknown as { email: string } | null;
  if (!leadData?.email) {
    return new NextResponse(
      `<!DOCTYPE html>
<html><head><title>Not Found</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
  <h1>Not Found</h1>
  <p>We could not find a matching subscription.</p>
</body></html>`,
      { status: 404, headers: { "Content-Type": "text/html" } }
    );
  }

  const email = leadData.email;

  // Add to global suppression list
  await addToSuppression(supabase, email, "unsubscribed");

  // Record the unsubscribe event
  await supabase.from("unsubscribes").insert({
    campaign_lead_id: campaignLeadId,
    email: email.toLowerCase(),
    token: decodedToken,
  });

  // Mark the campaign lead as completed so the engine stops processing them
  if (campaignLead && campaignLead.status !== "completed" && campaignLead.status !== "failed") {
    await supabase
      .from("campaign_leads")
      .update({ status: "completed" })
      .eq("id", campaignLeadId);
  }

  // Log the unsubscribe action
  await supabase.from("logs").insert({
    campaign_lead_id: campaignLeadId,
    action: "unsubscribe",
    status: "success",
    metadata: { email },
  });

  return new NextResponse(
    `<!DOCTYPE html>
<html><head><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
  <h1>You have been unsubscribed</h1>
  <p>You will no longer receive emails from this campaign.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:24px;">You can close this tab.</p>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
