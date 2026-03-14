"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommandCenter } from "@/components/analytics/command-center";
import { OverviewTab } from "@/components/analytics/overview-tab";
import { ComplianceTab } from "@/components/analytics/compliance-tab";
import { DeliverabilityTab } from "@/components/analytics/deliverability-tab";
import { BottomBar } from "@/components/analytics/bottom-bar";
import { useAnalyticsDashboard } from "@/hooks/use-analytics-dashboard";
import {
  BarChart3,
  Shield,
  Radio,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "overview" | "compliance" | "deliverability";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "deliverability", label: "Deliverability", icon: Radio },
];

interface DashboardShellProps {
  campaignId: string;
  campaignName?: string;
}

export function DashboardShell({ campaignId, campaignName }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { analytics, compliance, deliverability, warmup, loading, refresh } =
    useAnalyticsDashboard(campaignId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" data-lenis-prevent>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Campaign Analytics</h1>
          {campaignName && (
            <p className="text-xs text-muted-foreground mt-0.5">{campaignName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className="flex bg-muted rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Command Center sidebar */}
        <div
          className="w-64 border-r bg-muted/30 overflow-hidden flex-shrink-0"
          data-lenis-prevent
        >
          <CommandCenter
            analytics={analytics}
            deliverability={deliverability}
            warmup={warmup}
          />
        </div>

        {/* Main panel */}
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none"
          data-lenis-prevent
        >
          {activeTab === "overview" && analytics && (
            <OverviewTab analytics={analytics} />
          )}
          {activeTab === "compliance" && (
            <ComplianceTab compliance={compliance} analytics={analytics} />
          )}
          {activeTab === "deliverability" && (
            <DeliverabilityTab
              deliverability={deliverability}
              warmup={warmup}
              analytics={analytics}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <BottomBar
        analytics={analytics}
        compliance={compliance}
        deliverability={deliverability}
        warmup={warmup}
      />
    </div>
  );
}
