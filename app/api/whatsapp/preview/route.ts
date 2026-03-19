import { NextRequest, NextResponse } from "next/server";
import { generateWhatsAppMessage } from "@/lib/openai";
import { normalizeLocale } from "@/lib/lingo";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const targetLocale = normalizeLocale(req.cookies.get("vora_locale")?.value ?? null);
    const result = await generateWhatsAppMessage(prompt, null, undefined, {
      targetLocale: targetLocale ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
