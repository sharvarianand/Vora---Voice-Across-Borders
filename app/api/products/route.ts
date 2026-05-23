import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeLocale } from "@/lib/lingo";
import { localizePlainText } from "@/lib/lingo-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*, leads:leads(count), campaigns:campaigns(count)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/products error:", error);
      return NextResponse.json([]);
    }

    const targetLocale = normalizeLocale(
      request.cookies.get("vora_locale")?.value ?? null
    );

    if (!targetLocale || targetLocale === "en" || !data?.length) {
      return NextResponse.json(data ?? []);
    }

    const localized = await Promise.all(
      data.map(async (product) => ({
        ...product,
        name: await localizePlainText(String(product.name ?? ""), targetLocale),
        description: product.description
          ? await localizePlainText(String(product.description), targetLocale)
          : null,
      }))
    );

    return NextResponse.json(localized);
  } catch (err) {
    console.error("GET /api/products exception:", err);
    return NextResponse.json([]);
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
