"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { get, del, ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/queryKeys";
import { formatNumber, formatScore } from "@/lib/format";

interface Dataset {
  id: string;
  name: string;
  rows: number;
  columns: { name: string }[];
  score: number;
  current_version: number;
  versions?: { version: number; score: number }[];
}

const TABS = [
  { id: "clean",    label: "Clean",           live: true },
  { id: "data",     label: "Data",            live: true },
  { id: "dedupe",   label: "Dedupe",          live: true },
  { id: "risks",    label: "Risks & rules",   live: true },
  { id: "ask",      label: "Ask",             live: true },
  { id: "forecast", label: "Forecast",        live: true },
  { id: "strategy", label: "Strategy",        live: true },
  { id: "crew",     label: "Crew",            live: true },
  { id: "trust",    label: "Trust & privacy", live: true },
  { id: "lineage",  label: "Lineage",         live: true },
] as const;

interface Props {
  datasetId: string;
  children: React.ReactNode;
}

export function DatasetWorkspace({ datasetId, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data: ds, isLoading } = useQuery({
    queryKey: queryKeys.dataset(datasetId),
    queryFn: () => get<Dataset>(`/datasets/${datasetId}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del<{ status: string; id: string }>(`/datasets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datasets() });
      toast.success("Dataset deleted successfully");
      setShowDeleteModal(false);
      router.push("/datasets");
    },
    onError: (err: ApiError) => {
      toast.error(`Failed to delete dataset: ${err.message}`);
    },
  });

  const v0Score = ds?.versions?.[0]?.score ?? null;
  const currentScore = ds?.score ?? null;

  const activeTab = TABS.find((t) => pathname.endsWith(`/${t.id}`))?.id ?? "clean";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Dataset header */}
      <div
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "14px 24px 0",
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <div style={{ height: 40, width: 300, background: "var(--surface-hover)", borderRadius: 6, marginBottom: 14 }} />
        ) : ds ? (
          <div className="dataset-header-wrapper" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="dataset-header-title">
              <h1
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "-0.3px",
                }}
              >
                {ds.name}
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                {formatNumber(ds.rows)} rows · {ds.columns?.length ?? 0} columns · v{ds.current_version}
              </p>
            </div>

            {/* Delete button & Score delta display */}
            <div className="dataset-header-actions" style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-md, 6px)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--danger)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--danger-border, #ef4444)";
                  (e.currentTarget as HTMLElement).style.background = "var(--danger-bg, rgba(239, 68, 68, 0.08))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
                title="Delete Dataset"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              {v0Score != null && currentScore != null && v0Score !== currentScore && (
                <>
                  <ScorePill score={v0Score} label="before" dim />
                  <span style={{ color: "var(--text-muted)", fontSize: 16 }}>→</span>
                </>
              )}
              <ScorePill score={currentScore ?? 0} label={v0Score != null && currentScore !== v0Score ? "now" : "score"} />
            </div>
          </div>
        ) : null}

        {/* Delete Modal */}
        {showDeleteModal && ds && (
          <div
            role="dialog"
            aria-label="Delete Dataset Confirmation"
            aria-modal
            style={{
              position: "fixed", inset: 0, zIndex: 110,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          >
            <div style={{
              width: 440, maxWidth: "90vw",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-modal, 12px)", padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--danger)", marginBottom: 12 }}>
                <Trash2 size={20} />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Delete Dataset?</h3>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: "var(--text)" }}>{ds.name}</strong>? This action cannot be undone. All parquet files, versions, cleaning plans, and forecast records will be permanently erased.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(ds.id)}
                  disabled={deleteMutation.isPending}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <nav
          role="tablist"
          aria-label="Dataset sections"
          style={{ display: "flex", gap: 2, overflowX: "auto" }}
        >
          {TABS.map((tab) => {
            const href = `/datasets/${datasetId}/${tab.id}`;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={href}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.live ? tab.label : `${tab.label} (coming soon)`}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                  textDecoration: "none",
                  borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                  whiteSpace: "nowrap",
                  transition: "color 120ms ease",
                  opacity: tab.live ? 1 : 0.5,
                }}
              >
                {tab.label}
                {!tab.live && (
                  <span style={{ marginLeft: 5, fontSize: 10, color: "var(--text-subtle)" }}>soon</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}

function ScorePill({ score, label, dim }: { score: number; label: string; dim?: boolean }) {
  const color = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ textAlign: "center", opacity: dim ? 0.6 : 1 }}>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: dim ? "var(--text-muted)" : color,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatScore(score)}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
    </div>
  );
}
