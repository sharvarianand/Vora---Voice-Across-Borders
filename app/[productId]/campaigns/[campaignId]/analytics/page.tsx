"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/analytics/dashboard-shell";

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const productId = params.productId as string;
  const campaignId = params.campaignId as string;
  const [campaignName, setCampaignName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then((data) => setCampaignName(data.name || ""))
      .catch(() => {});
  }, [campaignId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Link href={`/${productId}/campaigns/${campaignId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">Back to campaign</span>
      </div>
      <div className="flex-1 min-h-0">
        <DashboardShell campaignId={campaignId} campaignName={campaignName} />
      </div>
    </div>
  );
}
