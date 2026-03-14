"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Mail,
  Reply,
  TrendingUp,
  CheckCircle,
  Clock,
  ArrowRight,
  Activity,
} from "lucide-react";
import type { EnrichedAnalytics, ActivityEvent } from "@/types";
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";

const CHART_TOOLTIP_STYLE = {
  borderRadius: "10px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border))",
  backgroundColor: "hsl(var(--popover) / 0.96)",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 12px 32px hsl(var(--background) / 0.45)",
};

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  subtext,
  emphasis = "regular",
  progress,
  progressLabel,
  className,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: "slate" | "sky" | "emerald" | "amber";
  subtext?: string;
  emphasis?: "regular" | "hero";
  progress?: number;
  progressLabel?: string;
  className?: string;
}) {
  const toneStyles = {
    slate: {
      rail: "bg-slate-400/70",
      icon: "bg-slate-500/10 text-slate-700 dark:text-slate-200",
      track: "bg-slate-500/15",
      fill: "bg-slate-500/65",
    },
    sky: {
      rail: "bg-sky-400/80",
      icon: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
      track: "bg-sky-500/15",
      fill: "bg-sky-500/70",
    },
    emerald: {
      rail: "bg-emerald-400/80",
      icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      track: "bg-emerald-500/15",
      fill: "bg-emerald-500/70",
    },
    amber: {
      rail: "bg-amber-400/85",
      icon: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
      track: "bg-amber-500/15",
      fill: "bg-amber-500/75",
    },
  } as const;

  const style = toneStyles[tone];

  return (
    <Card className={`relative overflow-hidden border-border/70 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${className ?? ""}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${style.rail}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-tight">
          {label}
        </CardTitle>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <p className={`${emphasis === "hero" ? "text-3xl" : "text-[2rem]"} font-semibold leading-none tracking-tight`}>
          {value}
        </p>
        {progress !== undefined && (
          <div className="space-y-1">
            <div className={`h-1.5 w-full overflow-hidden rounded-full ${style.track}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${style.fill}`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            {progressLabel && (
              <p className="text-[11px] text-muted-foreground">{progressLabel}</p>
            )}
          </div>
        )}
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

// ── Pipeline Funnel ─────────────────────────────────────────────────────────

function PipelineFunnel({
  pipeline,
  total,
}: {
  pipeline: EnrichedAnalytics["pipeline"];
  total: number;
}) {
  if (total === 0) return null;
  const filtered = pipeline.filter((p) => p.count > 0);
  const sumCount = filtered.reduce((acc, s) => acc + s.count, 0) || 1;
  const stageStats = filtered.map((stage) => ({
    ...stage,
    pct: Math.round((stage.count / sumCount) * 100),
  }));
  const topStage = [...stageStats].sort((a, b) => b.count - a.count)[0];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
          <span className="rounded-full border border-border/80 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {total} leads
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative pt-0">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* Donut chart */}
          <div className="relative shrink-0 mx-auto">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, _name: any, item: any) => {
                    const payload = item?.payload as { pct?: number } | undefined;
                    return [`${value} leads (${payload?.pct ?? 0}%)`, item?.name ?? "Stage"];
                  }}
                />
                <Pie
                  data={stageStats}
                  dataKey="count"
                  nameKey="stage"
                  innerRadius={78}
                  outerRadius={122}
                  paddingAngle={3}
                  stroke="none"
                >
                  {stageStats.map((stage) => (
                    <Cell key={stage.stage} fill={stage.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold leading-none">{total}</span>
              <span className="mt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">leads</span>
            </div>
          </div>

          {/* Stage breakdown */}
          <div className="flex-1 w-full space-y-1.5 min-w-0">
            {stageStats.map((stage) => (
              <div key={stage.stage} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{stage.stage}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${stage.pct}%`, backgroundColor: stage.color }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{stage.pct}%</span>
                  <span className="w-5 text-right text-sm font-semibold tabular-nums">{stage.count}</span>
                </div>
              </div>
            ))}
            {topStage && (
              <p className="pt-1.5 px-3 text-[11px] text-muted-foreground">
                Top stage:{" "}
                <span className="font-semibold text-foreground">{topStage.stage}</span>
                {" "}·{" "}
                <span className="font-semibold text-foreground">{topStage.count}</span> leads
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Send Velocity Chart ─────────────────────────────────────────────────────

function SendVelocityChart({
  dailyVolume,
}: {
  dailyVolume: EnrichedAnalytics["dailyVolume"];
}) {
  const hasData = dailyVolume.some((d) => d.sent > 0 || d.replies > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Send vs Replies (Last 3 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No send data yet — activate a campaign to see trends
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatted = dailyVolume.map((d) => ({
    ...d,
    dateObj: new Date(d.date),
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  const latest = formatted.reduce(
    (max, d) => (d.dateObj > max ? d.dateObj : max),
    formatted[0].dateObj
  );
  const recentStart = new Date(latest);
  recentStart.setDate(recentStart.getDate() - 2);
  const recent = formatted.filter((d) => d.dateObj >= recentStart);

  const totalSent = recent.reduce((sum, day) => sum + day.sent, 0);
  const totalReplies = recent.reduce((sum, day) => sum + day.replies, 0);
  const rangeLabel = `${recentStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${latest.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Send vs Replies (Last 3 Days)
          </CardTitle>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Sent
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Replies
            </span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{rangeLabel}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={recent}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value, name) => [value, name === "sent" ? "Sent" : "Replies"]}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
            <Line
              type="monotone"
              dataKey="sent"
              name="Sent"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5, fill: "#f59e0b", strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="replies"
              name="Replies"
              stroke="#34d399"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Total Sent (3d)</p>
            <p className="text-sm font-semibold text-cyan-300">
              {totalSent}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Total Replies (3d)</p>
            <p className="text-sm font-semibold text-emerald-300">
              {totalReplies}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Follow-up Effectiveness ─────────────────────────────────────────────────

function FollowupChart({
  data,
}: {
  data: EnrichedAnalytics["followupEffectiveness"];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Follow-up Effectiveness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No follow-up data yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Follow-up Effectiveness
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            Bars = volume, line = reply rate
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 6, left: 6, bottom: 8 }}
            >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={34}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value, name) => {
                if (name === "replyRate") return [`${value}%`, "Reply Rate"];
                return [value, name === "sent" ? "Sent" : "Replies"];
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }}
            />
            <Bar
              dataKey="sent"
              fill="#60a5fa"
              radius={[4, 4, 0, 0]}
              name="sent"
              barSize={20}
              maxBarSize={24}
            />
            <Bar
              dataKey="replies"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
              name="replies"
              barSize={20}
              maxBarSize={24}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="replyRate"
              name="replyRate"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Activity Feed ───────────────────────────────────────────────────────────

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            No activity yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const actionIcons: Record<string, React.ElementType> = {
    send_email: Mail,
    start: ArrowRight,
    end: CheckCircle,
    condition: Activity,
    wait: Clock,
  };

  const actionColors: Record<string, string> = {
    success: "text-foreground",
    failed: "text-foreground",
    skipped: "text-muted-foreground",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
          {events.slice(0, 30).map((event) => {
            const Icon = actionIcons[event.action] || Activity;
            const color = actionColors[event.status] || "text-muted-foreground";
            const timeAgo = getRelativeTime(event.createdAt);
            return (
              <div
                key={event.id}
                className="flex items-start gap-2 py-1.5 text-xs border-b border-muted/50 last:border-0"
              >
                <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">
                      {event.leadName}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 border-0 ${
                        event.status === "success"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : event.status === "failed"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate">
                    {formatAction(event.action)} — {event.leadEmail}
                  </p>
                </div>
                <span className="text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Lead Performance Table ──────────────────────────────────────────────────

function LeadPerformanceTable({
  leads,
}: {
  leads: EnrichedAnalytics["leadPerformance"];
}) {
  if (leads.length === 0) return null;

  const statusColors: Record<string, string> = {
    queued: "bg-zinc-500/15 text-zinc-400",
    active: "bg-blue-500/15 text-blue-400",
    waiting: "bg-amber-500/15 text-amber-400",
    completed: "bg-emerald-500/15 text-emerald-400",
    failed: "bg-red-500/15 text-red-400",
    pending_review: "bg-violet-500/15 text-violet-400",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Lead Performance ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Lead</th>
                <th className="pb-2 font-medium">Company</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-center">Replied</th>
                <th className="pb-2 font-medium text-center">Follow-ups</th>
                <th className="pb-2 font-medium">Last Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((lead) => (
                <tr
                  key={lead.campaignLeadId}
                  className="border-b border-muted/50 last:border-0"
                >
                  <td className="py-2 pr-4">
                    <div className="font-medium truncate max-w-[150px]">
                      {lead.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {lead.email}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground truncate max-w-[120px]">
                    {lead.company || "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status] || ""}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    {lead.replied ? (
                      <span className="text-foreground">✓</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 text-center font-mono text-xs">
                    {lead.followupCount}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {lead.lastActionTime
                      ? getRelativeTime(lead.lastActionTime)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Showing 20 of {leads.length} leads
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Overview Tab (main export) ──────────────────────────────────────────────

interface OverviewTabProps {
  analytics: EnrichedAnalytics;
}

export function OverviewTab({ analytics }: OverviewTabProps) {
  const sendCoverage = analytics.totalLeads
    ? (analytics.emailsSent / analytics.totalLeads) * 100
    : 0;
  const replyRateFromSent = analytics.emailsSent
    ? (analytics.replies / analytics.emailsSent) * 100
    : 0;
  const completionRate = analytics.totalLeads
    ? (analytics.completed / analytics.totalLeads) * 100
    : 0;
  const inProgressRate = analytics.totalLeads
    ? (analytics.inProgress / analytics.totalLeads) * 100
    : 0;

  const stats = [
    {
      label: "Total Leads",
      value: analytics.totalLeads,
      icon: Users,
      tone: "slate" as const,
      subtext: analytics.totalLeads > 0 ? "Active campaign audience" : "No leads loaded yet",
      progress: 100,
      progressLabel: "Audience base",
      className: "xl:col-span-1",
    },
    {
      label: "Emails Sent",
      value: analytics.emailsSent,
      icon: Mail,
      tone: "sky" as const,
      subtext: analytics.emailsSkipped > 0 ? `${analytics.emailsSkipped} skipped` : "No skipped sends",
      progress: sendCoverage,
      progressLabel: `${sendCoverage.toFixed(0)}% of leads reached`,
      className: "xl:col-span-1",
    },
    {
      label: "Replies",
      value: analytics.replies,
      icon: Reply,
      tone: "emerald" as const,
      subtext: analytics.replies > 0 ? "Inbox activity detected" : "Waiting for first reply",
      progress: replyRateFromSent,
      progressLabel: `${replyRateFromSent.toFixed(1)}% of sent emails`,
      className: "xl:col-span-1",
    },
    {
      label: "Reply Rate",
      value: `${analytics.replyRate}%`,
      icon: TrendingUp,
      tone: "emerald" as const,
      emphasis: "hero" as const,
      subtext: analytics.replyRate >= 10 ? "Above baseline performance" : "Room to improve response rate",
      progress: analytics.replyRate,
      progressLabel: "Replies per 100 emails sent",
      className: "xl:col-span-2",
    },
    {
      label: "Completed",
      value: analytics.completed,
      icon: CheckCircle,
      tone: "sky" as const,
      subtext: `${analytics.failed} failed`,
      progress: completionRate,
      progressLabel: `${completionRate.toFixed(0)}% campaign completion`,
      className: "xl:col-span-1",
    },
    {
      label: "In Progress",
      value: analytics.inProgress,
      icon: Clock,
      tone: "amber" as const,
      emphasis: "hero" as const,
      subtext: `${analytics.totalFollowups} follow-ups`,
      progress: inProgressRate,
      progressLabel: `${inProgressRate.toFixed(0)}% still active`,
      className: "xl:col-span-2",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PipelineFunnel
          pipeline={analytics.pipeline}
          total={analytics.totalLeads}
        />
        <SendVelocityChart dailyVolume={analytics.dailyVolume} />
      </div>

      {/* Follow-up + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FollowupChart data={analytics.followupEffectiveness} />
        <ActivityFeed events={analytics.recentActivity} />
      </div>

      {/* Lead table */}
      <LeadPerformanceTable leads={analytics.leadPerformance} />
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatAction(action: string): string {
  switch (action) {
    case "send_email":
      return "Email sent";
    case "start":
      return "Workflow started";
    case "end":
      return "Workflow completed";
    case "condition":
      return "Condition checked";
    case "wait":
      return "Wait started";
    default:
      return action;
  }
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
