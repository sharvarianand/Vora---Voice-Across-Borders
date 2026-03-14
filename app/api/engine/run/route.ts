import { processActiveCampaigns } from "@/lib/engine";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const workerSecret = process.env.WORKER_SECRET;

  // Allow unauthenticated in dev, or check secret in production
  if (workerSecret && authHeader !== `Bearer ${workerSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processActiveCampaigns();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Engine run error:", error);
    return NextResponse.json(
      { error: "Engine execution failed" },
      { status: 500 }
    );
  }
}
