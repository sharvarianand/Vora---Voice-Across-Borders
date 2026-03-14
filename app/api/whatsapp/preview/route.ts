import { NextRequest, NextResponse } from "next/server";
import { generateWhatsAppMessage } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const result = await generateWhatsAppMessage(prompt, null);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
