"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLingoContext } from "@lingo.dev/compiler/react";

import { LeadsTable } from "@/components/leads/leads-table";
import { UploadDialog } from "@/components/leads/upload-dialog";
import { FindLeadsDialog } from "@/components/leads/find-leads-dialog";
import type { Lead } from "@/types";

export default function LeadsPage() {
  const params = useParams();
  const productId = params.productId as string;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { locale } = useLingoContext();

  const fetchLeads = useCallback(() => {
    if (!locale) return;
    setLoading(true);
    fetch(`/api/leads?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productId, locale]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchLeads();
    }, 0);

    return () => window.clearTimeout(id);
  }, [fetchLeads]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {`${leads.length} leads in this product`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FindLeadsDialog productId={productId} onAdded={fetchLeads} />
          <UploadDialog productId={productId} onUploaded={fetchLeads} />
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border">
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading leads...
          </div>
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          onDeleted={(id) => setLeads((prev) => prev.filter((l) => l.id !== id))}
        />
      )}
    </div>
  );
}
