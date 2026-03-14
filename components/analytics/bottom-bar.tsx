"use client";

import { Shield, Radio, Gauge, TrendingUp } from "lucide-react";
import type {
  EnrichedAnalytics,
  ComplianceAudit,
  DeliverabilityDashboard,
  WarmupDashboard,
} from "@/types";

interface BottomBarProps {
  analytics: EnrichedAnalytics | null;
  compliance: ComplianceAudit | null;
  deliverability: DeliverabilityDashboard | null;
  warmup: WarmupDashboard | null;
}

export function BottomBar({
  analytics,
  compliance,
  deliverability,
  warmup,
}: BottomBarProps) {
  const canSpamOk =
    compliance &&
    compliance.unsubscribeRate < 0.01 &&
    compliance.bounceCount < (compliance.totalEmailsSent || 1) * 0.1;

  const bounceRatePct = deliverability
    ? (deliverability.bounceRate * 100).toFixed(1)
    : "—";

  const warmupLabel = warmup?.enabled
    ? `Day ${warmup.schedule?.day_number || "?"} · ${warmup.schedule?.phase || "?"}`
    : "Off";

  const dailyLimit = warmup?.enabled
    ? warmup.schedule?.daily_limit || "—"
    : deliverability?.currentDailyLimit || "Unlimited";

  return (
    <div className="flex items-center gap-6 px-6 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
      {/* Compliance */}
      <div className="flex items-center gap-1.5">
        <Shield
          className={`h-3.5 w-3.5 ${
            canSpamOk ? "text-foreground" : "text-muted-foreground"
          }`}
        />
        <span>{canSpamOk ? "CAN-SPAM Compliant" : "Review Compliance"}</span>
      </div>

      <Separator />

      {/* Rate limit / budget */}
      <div className="flex items-center gap-1.5">
        <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
        <span>
          Daily budget: <strong className="text-foreground">{dailyLimit}</strong> emails
        </span>
      </div>

      <Separator />

      {/* Warmup */}
      <div className="flex items-center gap-1.5">
        <Radio
          className={`h-3.5 w-3.5 text-muted-foreground`}
        />
        <span>
          Warmup: <strong className="text-foreground">{warmupLabel}</strong>
        </span>
      </div>

      <Separator />

      {/* Bounce rate */}
      <div className="flex items-center gap-1.5">
        <TrendingUp
          className={`h-3.5 w-3.5 ${
            deliverability && deliverability.bounceRate < 0.03
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        />
        <span>
          Bounce: <strong className="text-foreground">{bounceRatePct}%</strong>
        </span>
      </div>

      {/* Spacer + reply rate */}
      <div className="ml-auto flex items-center gap-1.5">
        <span>
          Reply rate:{" "}
          <strong className="text-foreground">
            {analytics?.replyRate ?? "—"}%
          </strong>
        </span>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-3 w-px bg-border" />;
}
