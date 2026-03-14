"use client";

import {
  Activity,
  Mail,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
} from "lucide-react";
import type {
  EnrichedAnalytics,
  DeliverabilityDashboard,
  WarmupDashboard,
} from "@/types";

// ── Score gauge SVG ─────────────────────────────────────────────────────────

function ScoreGauge({
  score,
  grade,
  size = 120,
}: {
  score: number;
  grade: string;
  size?: number;
}) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 85
      ? "#34d399"
      : score >= 70
        ? "#60a5fa"
        : score >= 55
          ? "#fbbf24"
          : score >= 40
            ? "#fb923c"
            : "#f87171";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center gap-1">
        <span className="text-2xl font-bold">{score}</span>
        <span
          className="text-sm font-semibold"
          style={{ color }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

// ── Command Center ──────────────────────────────────────────────────────────

interface CommandCenterProps {
  analytics: EnrichedAnalytics | null;
  deliverability: DeliverabilityDashboard | null;
  warmup: WarmupDashboard | null;
}

export function CommandCenter({
  analytics,
  deliverability,
  warmup,
}: CommandCenterProps) {
  if (!analytics) return null;

  const { healthScore } = analytics;
  const alerts: { icon: React.ElementType; text: string; color: string }[] = [];

  // Generate alerts
  if (analytics.failed > 0) {
    alerts.push({
      icon: AlertTriangle,
      text: `${analytics.failed} failed lead${analytics.failed > 1 ? "s" : ""}`,
      color: "text-foreground",
    });
  }
  if (analytics.replyRate > 15) {
    alerts.push({
      icon: TrendingUp,
      text: `${analytics.replyRate}% reply rate — strong!`,
      color: "text-foreground",
    });
  }
  if (deliverability && deliverability.bounceRate > 0.05) {
    alerts.push({
      icon: AlertTriangle,
      text: `High bounce rate: ${(deliverability.bounceRate * 100).toFixed(1)}%`,
      color: "text-muted-foreground",
    });
  }
  if (warmup?.enabled && warmup.schedule) {
    alerts.push({
      icon: Zap,
      text: `Warmup day ${warmup.schedule.day_number} — ${warmup.schedule.phase}`,
      color: "text-muted-foreground",
    });
  }
  if (analytics.replies > 0) {
    alerts.push({
      icon: MessageSquare,
      text: `${analytics.replies} replied — check inbox`,
      color: "text-muted-foreground",
    });
  }

  return (
    <div className="p-4 space-y-6">
      {/* Health Score */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Campaign Health
        </h3>
        <div className="flex justify-center">
          <ScoreGauge
            score={healthScore.overall}
            grade={healthScore.grade}
          />
        </div>
        {/* Factor bars */}
        <div className="mt-4 space-y-2">
          {Object.entries(healthScore.factors).map(([key, factor]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-muted-foreground capitalize">
                  {key === "replyRate"
                    ? "Reply Rate"
                    : key === "bounceRate"
                      ? "Bounce Rate"
                      : key === "completionRate"
                        ? "Completion"
                        : key === "unsubRate"
                          ? "Unsub Rate"
                          : "Velocity"}
                </span>
                <span className="text-[11px] text-muted-foreground" title={`${factor.score}/${factor.max} pts`}>
                  {factor.detail}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${getFactorFillPercent(key, factor)}%`,
                    backgroundColor:
                      factor.score / factor.max >= 0.7
                        ? "#34d399"
                        : factor.score / factor.max >= 0.4
                          ? "#fbbf24"
                          : "#f87171",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Stats
        </h3>
        <div className="space-y-2">
          <QuickStat
            icon={Mail}
            label="Emails Sent"
            value={analytics.emailsSent.toString()}
            color="text-muted-foreground"
          />
          <QuickStat
            icon={MessageSquare}
            label="Replies"
            value={analytics.replies.toString()}
            color="text-muted-foreground"
          />
          <QuickStat
            icon={TrendingUp}
            label="Reply Rate"
            value={`${analytics.replyRate}%`}
            color="text-muted-foreground"
          />
          <QuickStat
            icon={Activity}
            label="Follow-ups"
            value={analytics.totalFollowups.toString()}
            color="text-muted-foreground"
          />
          <QuickStat
            icon={CheckCircle}
            label="Completed"
            value={`${analytics.completed}/${analytics.totalLeads}`}
            color="text-muted-foreground"
          />
          {deliverability && (
            <QuickStat
              icon={Shield}
              label="Bounce Rate"
              value={`${(deliverability.bounceRate * 100).toFixed(1)}%`}
              color="text-muted-foreground"
            />
          )}
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Alerts
          </h3>
          <div className="space-y-1.5">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/50"
              >
                <alert.icon className={`h-3.5 w-3.5 flex-shrink-0 ${alert.color}`} />
                <span className="text-foreground/80">{alert.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFactorFillPercent(
  key: string,
  factor: { score: number; max: number; detail: string }
) {
  // For percent-based factors, keep bar width aligned with displayed values.
  if (key !== "velocity") {
    const pctMatch = factor.detail.match(/(\d+(?:\.\d+)?)%/);
    if (pctMatch) {
      return Math.max(0, Math.min(100, Number(pctMatch[1])));
    }
  }

  // Velocity detail is "N active send days", so fall back to score normalization.
  return Math.max(0, Math.min(100, (factor.score / factor.max) * 100));
}

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
