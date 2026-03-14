import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { AutomationContext } from "@/types";

/**
 * GET /api/campaigns/[id]/automation
 * Returns the campaign's automation_context plus the parent product's
 * knowledge_base (read-only, inherited) in one call.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, product_id, automation_context")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, knowledge_base")
    .eq("id", campaign.product_id)
    .maybeSingle();

  return NextResponse.json({
    automation_context: campaign.automation_context ?? { items: [] },
    product_knowledge_base: product?.knowledge_base ?? { items: [] },
    product: product ? { id: product.id, name: product.name, description: product.description } : null,
  });
}

/**
 * PATCH /api/campaigns/[id]/automation
 * Updates only the campaign's automation_context.
 * Body: { automation_context: AutomationContext }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const automationContext = body.automation_context as AutomationContext | undefined;
  if (!automationContext || !Array.isArray(automationContext.items)) {
    return NextResponse.json(
      { error: "automation_context must be an object with an items array" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update({ automation_context: automationContext })
    .eq("id", id)
    .select("id, automation_context")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
