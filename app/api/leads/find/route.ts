import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { findLeads } from "@/lib/lead-finder";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const { query, productId } = body as { query: string; productId: string };

  if (!query || !productId) {
    return NextResponse.json(
      { error: "query and productId are required" },
      { status: 400 }
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("name, description")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const candidates = await findLeads(query, product);
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("Find leads failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
