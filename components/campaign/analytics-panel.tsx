"use client";

import { DashboardShell } from "@/components/analytics/dashboard-shell";

export function AnalyticsPanel({ campaignId }: { campaignId: string }) {
  return <DashboardShell campaignId={campaignId} />;
}
