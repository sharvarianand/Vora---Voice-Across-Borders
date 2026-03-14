"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  EnrichedAnalytics,
  ComplianceAudit,
  DeliverabilityDashboard,
  WarmupDashboard,
} from "@/types";

export function useAnalyticsDashboard(campaignId: string) {
  const [analytics, setAnalytics] = useState<EnrichedAnalytics | null>(null);
  const [compliance, setCompliance] = useState<ComplianceAudit | null>(null);
  const [deliverability, setDeliverability] =
    useState<DeliverabilityDashboard | null>(null);
  const [warmup, setWarmup] = useState<WarmupDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [analyticsRes, complianceRes, delivRes, warmupRes] =
        await Promise.all([
          fetch(`/api/campaigns/${campaignId}/analytics-dashboard`),
          fetch(`/api/compliance/audit`),
          fetch(`/api/campaigns/${campaignId}/deliverability`),
          fetch(`/api/warmup/schedule?campaignId=${campaignId}`),
        ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (complianceRes.ok) setCompliance(await complianceRes.json());
      if (delivRes.ok) setDeliverability(await delivRes.json());
      if (warmupRes.ok) setWarmup(await warmupRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { analytics, compliance, deliverability, warmup, loading, error, refresh: fetchAll };
}
