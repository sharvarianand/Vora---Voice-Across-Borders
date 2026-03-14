import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { enrichLead } from "@/lib/enrichment";
import type { Lead } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  try {
    const enrichedData = await enrichLead(lead as Lead);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ enriched_data: enrichedData })
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ enriched_data: enrichedData });
  } catch (err) {
    console.error("Enrichment failed for lead", id, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Enrichment failed" },
      { status: 500 }
    );
  }
}
