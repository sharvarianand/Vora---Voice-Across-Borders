"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
  // Track the campaign_lead IDs so we can filter the realtime subscription
  const clIdsRef = useRef<string[]>([]);

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

      if (analyticsRes.ok) {
        const data: EnrichedAnalytics = await analyticsRes.json();
        setAnalytics(data);
        // Keep track of campaign lead IDs for the realtime filter
        clIdsRef.current = (data.leadPerformance ?? []).map(
          (lp) => lp.campaignLeadId
        );
      }
      if (complianceRes.ok) setCompliance(await complianceRes.json());
      if (delivRes.ok) setDeliverability(await delivRes.json());
      if (warmupRes.ok) setWarmup(await warmupRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh every 10s as a reliable fallback
  useEffect(() => {
    const interval = setInterval(fetchAll, 10_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Supabase realtime: subscribe to INSERT events on the `logs` table.
  // Any new log entry (send_email success, error, etc.) triggers an immediate refresh,
  // giving the analytics page effectively real-time updates.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`campaign-logs-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "logs",
        },
        () => {
          // Refresh analytics immediately when any log is inserted
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchAll]);

  // Also subscribe to campaign_leads updates (status changes appear instantly)
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`campaign-leads-${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_leads",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchAll]);

  return { analytics, compliance, deliverability, warmup, loading, error, refresh: fetchAll };
}

