import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateMessage } from "@/lib/openai";
import type { Lead, EnrichedLeadData, KnowledgeBaseItem } from "@/types";

// GET /api/campaigns/[id]/preview-email — returns list of leads for the picker
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("product_id")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, company, enriched_data")
    .eq("product_id", campaign.product_id)
    .order("name", { ascending: true });

  return NextResponse.json(
    (leads ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      company: l.company,
      is_enriched: !!l.enriched_data,
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { prompt, lead_id } = (await req.json()) as { prompt: string; lead_id?: string };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Get the campaign to find the product
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("product_id, automation_context")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch product for description + product-level KB
  const { data: product } = await supabase
    .from("products")
    .select("description, knowledge_base")
    .eq("id", campaign.product_id)
    .single();

  const productDescription = product?.description ?? undefined;
  const productKbItems: KnowledgeBaseItem[] = (product?.knowledge_base as { items: KnowledgeBaseItem[] } | null)?.items ?? [];
  const campaignKbItems: KnowledgeBaseItem[] = (campaign.automation_context as { items: KnowledgeBaseItem[] } | null)?.items ?? [];
  const knowledgeBaseItems: KnowledgeBaseItem[] = [...productKbItems, ...campaignKbItems];

  // If a specific lead_id is given use it; otherwise prefer enriched, then first
  let lead: Lead | null = null;
  if (lead_id) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();
    lead = data as Lead | null;
  }

  if (!lead) {
    const { data: leads } = await supabase
      .from("leads")
      .select("*")
      .eq("product_id", campaign.product_id)
      .limit(20);

    if (!leads?.length) {
      return NextResponse.json({ error: "No leads found for this product" }, { status: 404 });
    }
    lead = (leads.find((l) => l.enriched_data) ?? leads[0]) as Lead;
  }

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const enrichedData = (lead.enriched_data as EnrichedLeadData | null) ?? null;

  try {
    const { subject, body } = await generateMessage(prompt, lead, productDescription, {
      senderEmail: process.env.GMAIL_USER_EMAIL,
      isFollowUp: false,
      enrichedData,
      knowledgeBase: knowledgeBaseItems,
    });

    return NextResponse.json({
      subject,
      body,
      lead_name: lead.name,
      lead_company: lead.company,
      is_enriched: !!enrichedData,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
