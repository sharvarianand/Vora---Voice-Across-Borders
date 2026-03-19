"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useLingoContext } from "@lingo.dev/compiler/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Megaphone } from "lucide-react";
import type { Campaign } from "@/types";

export function CampaignSelector() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const productId = params?.productId as string | undefined;
  const campaignId = params?.campaignId as string | undefined;
  const { locale } = useLingoContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/campaigns?productId=${productId}`)
      .then((r) => r.json())
      .then(setCampaigns)
      .catch(console.error);
  }, [productId, locale]);

  if (!productId) return null;

  // Determine if we're on campaigns section
  const isCampaignsSection = pathname?.includes("/campaigns");

  return (
    <Select
      value={campaignId || ""}
      onValueChange={(value) => {
        if (value === "__campaigns__") {
          router.push(`/${productId}/campaigns`);
        } else if (value) {
          router.push(`/${productId}/campaigns/${value}`);
        }
      }}
    >
      <SelectTrigger
        className={`w-[200px] h-9 ${!isCampaignsSection ? "opacity-60" : ""}`}
      >
        <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
        <SelectValue placeholder="Select campaign" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__campaigns__">
          <span className="text-muted-foreground">All Campaigns</span>
        </SelectItem>
        {campaigns.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
