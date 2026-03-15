import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, leads:leads(count), campaigns:campaigns(count)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/products error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/products exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const productData: Record<string, unknown> = {
      name: body.name,
      description: body.description || null,
      gmail_label_prefix: `Rosey/${body.name}`,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error("POST /api/products error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/products exception:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
