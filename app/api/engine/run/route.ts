import { processActiveCampaigns } from "@/lib/engine";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const workerSecret = process.env.WORKER_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  // Allow unauthenticated in dev mode, require secret in production
  if (isProduction && workerSecret && authHeader !== `Bearer ${workerSecret}`) {
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
