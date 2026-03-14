import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getDeliverabilityStats } from "@/lib/deliverability";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const stats = await getDeliverabilityStats(supabase, id);

  return NextResponse.json(stats);
}
