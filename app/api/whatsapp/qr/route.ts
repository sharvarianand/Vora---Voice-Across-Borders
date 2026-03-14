import { NextResponse } from "next/server";

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL ?? "http://127.0.0.1:3002";

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/qr`, { cache: "no-store" });
    if (res.status === 404) {
      return NextResponse.json({ connected: true });
    }
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "gateway_unreachable" }, { status: 503 });
  }
}
