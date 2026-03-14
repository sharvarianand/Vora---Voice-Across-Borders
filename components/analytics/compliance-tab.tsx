"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Ban, Mail } from "lucide-react";
import type { ComplianceAudit, EnrichedAnalytics } from "@/types";

interface ComplianceTabProps {
  compliance: ComplianceAudit | null;
  analytics?: EnrichedAnalytics | null;
}

export function ComplianceTab({ compliance }: ComplianceTabProps) {
  if (!compliance) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Unable to load compliance data
      </div>
    );
  }

  const canSpamCompliant =
    compliance.unsubscribeRate < 0.01 && compliance.bounceCount < compliance.totalEmailsSent * 0.1;

  const metrics = [
    {
      label: "Total Emails Sent",
      value: compliance.totalEmailsSent,
      icon: Mail,
      color: "text-foreground bg-muted",
    },
    {
      label: "Suppressed Emails",
      value: compliance.suppressionCount,
      icon: Ban,
      color: "text-foreground bg-muted",
    },
    {
      label: "Unsubscribes",
      value: compliance.unsubscribeCount,
      icon: AlertTriangle,
      color: "text-foreground bg-muted",
    },
    {
      label: "Bounces",
      value: compliance.bounceCount,
      icon: AlertTriangle,
      color: "text-foreground bg-muted",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Status banner */}
      <Card className="border bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {canSpamCompliant ? (
              <CheckCircle className="h-5 w-5 text-foreground" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {canSpamCompliant
                  ? "CAN-SPAM Compliant"
                  : "Review Compliance Status"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {canSpamCompliant
                  ? "Your campaigns meet CAN-SPAM requirements. Unsubscribe links are included and bounce rates are healthy."
                  : "Your unsubscribe or bounce rates may need attention. Review the metrics below."}
              </p>
            </div>
            <Badge
              variant={canSpamCompliant ? "default" : "secondary"}
              className="ml-auto"
            >
              {canSpamCompliant ? "Passing" : "Review"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.color}`}
              >
                <m.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Unsubscribe Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-3xl font-bold">
                  {(compliance.unsubscribeRate * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Industry threshold: &lt; 0.5%
                </p>
              </div>
              <div className="w-32">
                <RateBar
                  value={compliance.unsubscribeRate * 100}
                  max={1}
                  threshold={0.5}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Bounce Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-3xl font-bold">
                  {compliance.totalEmailsSent > 0
                    ? (
                        (compliance.bounceCount / compliance.totalEmailsSent) *
                        100
                      ).toFixed(2)
                    : "0.00"}
                  %
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Target: &lt; 2%
                </p>
              </div>
              <div className="w-32">
                <RateBar
                  value={
                    compliance.totalEmailsSent > 0
                      ? (compliance.bounceCount / compliance.totalEmailsSent) *
                        100
                      : 0
                  }
                  max={5}
                  threshold={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent unsubscribes */}
      {compliance.recentUnsubscribes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Recent Unsubscribes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Email</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.recentUnsubscribes.slice(0, 10).map((unsub) => (
                    <tr
                      key={unsub.id}
                      className="border-b border-muted/50 last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium">{unsub.email}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(unsub.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Rate bar component ──────────────────────────────────────────────────────

function RateBar({
  value,
  max,
  threshold,
}: {
  value: number;
  max: number;
  threshold: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const thresholdPct = (threshold / max) * 100;
  const isOver = value > threshold;

  return (
    <div className="space-y-1">
      <div className="h-3 bg-muted rounded-full overflow-hidden relative">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full"
          style={{
            width: `${thresholdPct}%`,
            background:
              "linear-gradient(90deg, rgba(16,185,129,0.32) 0%, rgba(16,185,129,0.15) 100%)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-full"
          style={{
            width: `${100 - thresholdPct}%`,
            background:
              "linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.22) 100%)",
          }}
        />
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-red-400" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span className="text-[9px] text-muted-foreground/80">
          Threshold {threshold}%
        </span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
