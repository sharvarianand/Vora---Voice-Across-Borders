"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getLocaleMeta, getLeadLocale, toFlagEmoji } from "@/lib/lingo";
import type { Lead } from "@/types";

interface LeadsTableProps {
  leads: Lead[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export function LeadsTable({
  leads,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onDeleted,
}: LeadsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichedIds, setEnrichedIds] = useState<Set<string>>(
    () => new Set(leads.filter((l) => l.enriched_data).map((l) => l.id))
  );

  // Collect ordered column keys from custom_fields across all leads,
  // preserving first-seen order so the table mirrors the original CSV header order.
  const dynamicColumns = Array.from(
    leads.reduce((acc, lead) => {
      if (lead.custom_fields && Object.keys(lead.custom_fields).length > 0) {
        Object.keys(lead.custom_fields).forEach((k) => acc.add(k));
      }
      return acc;
    }, new Set<string>())
  );

  // Drive display from custom_fields when available (new uploads).
  // Fall back to static fields for legacy leads that pre-date the custom_fields column.
  const hasDynamicCols = dynamicColumns.length > 0;

  async function handleEnrich(lead: Lead) {
    setEnrichingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setEnrichedIds((prev) => new Set([...prev, lead.id]));
      toast.success(`${lead.name} enriched with web intelligence`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrichment failed");
    } finally {
      setEnrichingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Lead deleted");
      onDeleted?.(deleteTarget.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete lead"
      );
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const colCount = (selectable ? 1 : 0) +
    (hasDynamicCols ? dynamicColumns.length : 6) + 4; // +4 = Locale, Enriched, Created, Actions

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="w-10" />}
              {hasDynamicCols ? (
                dynamicColumns.map((col) => (
                  <TableHead key={col} className="whitespace-nowrap capitalize">
                    {col.replace(/_/g, " ")}
                  </TableHead>
                ))
              ) : (
                <>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                </>
              )}
              <TableHead>Locale</TableHead>
              <TableHead>Enriched</TableHead>
              {hasDynamicCols && <TableHead>Created</TableHead>}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leads yet. Upload a CSV or JSON file to get started.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  {selectable && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(lead.id) ?? false}
                        onChange={() => onToggleSelect?.(lead.id)}
                        className="rounded border-input"
                      />
                    </TableCell>
                  )}
                  {hasDynamicCols ? (
                    dynamicColumns.map((col) => {
                      const val = lead.custom_fields?.[col];
                      return (
                        <TableCell key={col} className="whitespace-nowrap text-muted-foreground">
                          {val != null && val !== "" ? String(val) : "—"}
                        </TableCell>
                      );
                    })
                  ) : (
                    <>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                      <TableCell>{lead.company || "—"}</TableCell>
                      <TableCell>{lead.industry || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {(() => {
                      const locale = getLocaleMeta(getLeadLocale(lead));
                      return locale ? (
                        <span className="inline-flex items-center gap-2 text-sm">
                          <span>{toFlagEmoji(locale.flag)}</span>
                          <span className="text-muted-foreground">{locale.label}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Detect</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {enrichedIds.has(lead.id) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        <Sparkles className="h-3 w-3" /> Enriched
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {hasDynamicCols && (
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEnrich(lead)}
                          disabled={enrichingId === lead.id}
                        >
                          {enrichingId === lead.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {enrichedIds.has(lead.id) ? "Re-enrich" : "Enrich with AI"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(lead)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) and
              remove them from any campaigns. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
