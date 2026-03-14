import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL ?? "http://127.0.0.1:3002";

export async function DELETE() {
  try {
    const res = await fetch(`${GATEWAY_URL}/session`, {
      method: "DELETE",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 503 });
  }
}
