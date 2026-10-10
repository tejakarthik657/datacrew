"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  GitMerge, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  Database,
  RefreshCw,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";

interface DedupeRecord {
  _row_index?: number;
  _match_field?: string;
  [key: string]: unknown;
}

interface DedupeCluster {
  id: string;
  column: string;
  match_type: string;
  confidence: number;
  canonical_suggestion: string;
  variants: string[];
  records: DedupeRecord[];
  status?: "pending" | "resolved" | "dismissed";
}

interface DedupeResponse {
  dataset_id: string;
  dataset_name: string;
  current_version: number;
  total_clusters: number;
  clusters: DedupeCluster[];
}

interface DedupeTabProps {
  datasetId: string;
}

export function DedupeTab({ datasetId }: DedupeTabProps) {
  const qc = useQueryClient();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "high_conf">("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Field-level overrides: fieldName -> selectedValue
  const [fieldPicks, setFieldPicks] = useState<Record<string, unknown>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dedupe", datasetId],
    queryFn: () => get<DedupeResponse>(`/datasets/${datasetId}/dedupe`),
    staleTime: 60000,
  });

  const clusters = useMemo(() => data?.clusters ?? [], [data?.clusters]);

  // Filter clusters
  const filteredClusters = useMemo(() => {
    return clusters.filter((c) => {
      if (statusFilter === "pending" && c.status === "resolved") return false;
      if (statusFilter === "high_conf" && c.confidence < 90) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCol = c.column.toLowerCase().includes(q);
        const matchesCanon = c.canonical_suggestion.toLowerCase().includes(q);
        const matchesVariant = c.variants.some((v) => v.toLowerCase().includes(q));
        if (!matchesCol && !matchesCanon && !matchesVariant) return false;
      }
      return true;
    });
  }, [clusters, statusFilter, searchQuery]);

  // Selected cluster
  const activeCluster = useMemo(() => {
    if (selectedClusterId) {
      return clusters.find((c) => c.id === selectedClusterId) ?? filteredClusters[0];
    }
    return filteredClusters[0];
  }, [clusters, filteredClusters, selectedClusterId]);

  // Available comparison fields (excluding internal metadata)
  const comparisonFields = useMemo(() => {
    if (!activeCluster || !activeCluster.records || activeCluster.records.length === 0) return [];
    const fields = new Set<string>();
    activeCluster.records.forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (!k.startsWith("_") && k !== "id") {
          fields.add(k);
        }
      });
    });
    return Array.from(fields);
  }, [activeCluster]);

  // Mutation to resolve a cluster
  const resolveMutation = useMutation({
    mutationFn: async ({
      clusterId,
      action,
      canonicalValue,
      column,
      variants,
      dropIndices,
    }: {
      clusterId: string;
      action: "merge" | "normalize" | "dismiss";
      canonicalValue?: string;
      column?: string;
      variants?: string[];
      dropIndices?: number[];
    }) => {
      return post(`/datasets/${datasetId}/dedupe/${clusterId}/resolve`, {
        action,
        canonical_value: canonicalValue,
        column,
        variants: variants || [],
        drop_indices: dropIndices || [],
      });
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "dismiss"
          ? "Cluster marked as distinct (non-duplicate)."
          : "Cluster resolved and merged successfully!"
      );
      qc.invalidateQueries({ queryKey: ["dedupe", datasetId] });
      qc.invalidateQueries({ queryKey: ["dataset", datasetId] });
      setFieldPicks({});
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to resolve cluster";
      toast.error(msg);
    },
  });

  const handlePickField = (field: string, val: unknown) => {
    setFieldPicks((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleMergeCluster = () => {
    if (!activeCluster) return;
    const dropIndices = activeCluster.records
      .slice(1)
      .map((r) => r._row_index)
      .filter((idx): idx is number => idx !== undefined);

    resolveMutation.mutate({
      clusterId: activeCluster.id,
      action: "merge",
      canonicalValue: activeCluster.canonical_suggestion,
      column: activeCluster.column,
      variants: activeCluster.variants,
      dropIndices,
    });
  };

  const handleNormalizeValues = () => {
    if (!activeCluster) return;
    resolveMutation.mutate({
      clusterId: activeCluster.id,
      action: "normalize",
      canonicalValue: activeCluster.canonical_suggestion,
      column: activeCluster.column,
      variants: activeCluster.variants,
    });
  };

  const handleDismiss = () => {
    if (!activeCluster) return;
    resolveMutation.mutate({
      clusterId: activeCluster.id,
      action: "dismiss",
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: "64px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--brand)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Scanning dataset with fuzzy variant clustering...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ margin: "24px 0", padding: 24, borderRadius: "var(--radius-card)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", margin: "0 0 10px" }}>Failed to load deduplication analysis.</p>
        <button
          onClick={() => refetch()}
          style={{ padding: "6px 14px", borderRadius: 6, background: "var(--surface)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Retry Scan
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)", letterSpacing: "-0.3px" }}>
              Smart Deduplication & Merge Review
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 9999,
                background: "rgba(99, 91, 255, 0.12)",
                color: "var(--brand)",
                border: "1px solid rgba(99, 91, 255, 0.25)",
              }}
            >
              {clusters.length} Candidate Clusters Found
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Identify fuzzy name variants, near-duplicate records, and resolve canonical representations with zero data loss.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search box */}
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-subtle, #94a3b8)" }}
            />
            <input
              type="text"
              placeholder="Filter clusters…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                height: 32,
                width: 170,
                paddingLeft: 30,
                paddingRight: 10,
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>

          {/* Filter Pills */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-raised, rgba(0,0,0,0.03))",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 2,
            }}
          >
            {(
              [
                { id: "all", label: "All" },
                { id: "high_conf", label: "High Match (≥90%)" },
                { id: "pending", label: "Pending" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "none",
                  cursor: "pointer",
                  background: statusFilter === tab.id ? "var(--surface)" : "transparent",
                  color: statusFilter === tab.id ? "var(--text)" : "var(--text-muted)",
                  boxShadow: statusFilter === tab.id ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                  transition: "all 120ms ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-card)",
            border: "1px dashed var(--border)",
            padding: "54px 20px",
            textAlign: "center",
            background: "var(--surface)",
          }}
        >
          <ShieldCheck size={36} style={{ color: "#10b981", marginBottom: 10 }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
            Clean Dataset — No Duplicate Clusters
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", maxWidth: 380 }}>
            Fuzzy similarity checks detected no conflicting duplicate heads or record overlaps in current version v{data?.current_version ?? 0}.
          </p>
        </div>
      ) : (
        <div
          className="dedupe-grid-container"
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          {/* Left panel: Cluster List */}
          <div
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: 700,
            }}
          >
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                padding: "10px 14px",
                background: "var(--surface-raised, rgba(0,0,0,0.02))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Clusters ({filteredClusters.length})
              </span>
              <span style={{ fontSize: 10, color: "var(--text-subtle)" }}>Click to inspect</span>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {filteredClusters.map((cluster) => {
                const isSelected = activeCluster?.id === cluster.id;
                const isHigh = cluster.confidence >= 90;

                return (
                  <button
                    key={cluster.id}
                    onClick={() => {
                      setSelectedClusterId(cluster.id);
                      setFieldPicks({});
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      border: "none",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: isSelected ? "3px solid var(--brand)" : "3px solid transparent",
                      background: isSelected ? "var(--surface-raised, rgba(99, 91, 255, 0.08))" : "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      transition: "background 120ms ease",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cluster.canonical_suggestion}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 9999,
                            background: isHigh ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            color: isHigh ? "#10b981" : "#f59e0b",
                            border: `1px solid ${isHigh ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                            flexShrink: 0,
                          }}
                        >
                          {cluster.confidence}% match
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            padding: "1px 5px",
                            borderRadius: 4,
                            background: "var(--surface-raised, rgba(0,0,0,0.05))",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {cluster.column}
                        </span>
                        <span>•</span>
                        <span>{cluster.records.length} records</span>
                        {cluster.variants.length > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
                              {cluster.variants.join(", ")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      size={14}
                      style={{
                        flexShrink: 0,
                        color: isSelected ? "var(--brand)" : "var(--text-subtle)",
                        transform: isSelected ? "translateX(2px)" : "none",
                        transition: "all 120ms ease",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Side-by-side Merge Review */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {activeCluster ? (
              <div
                style={{
                  borderRadius: "var(--radius-card)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {/* Cluster header */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: "rgba(99, 91, 255, 0.12)",
                          color: "var(--brand)",
                          border: "1px solid rgba(99, 91, 255, 0.25)",
                        }}
                      >
                        {activeCluster.id}
                      </span>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                        Suggested Canonical:{" "}
                        <span style={{ color: "var(--brand)" }}>{activeCluster.canonical_suggestion}</span>
                      </h3>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                      Matched by {activeCluster.match_type} on column{" "}
                      <code
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          background: "var(--surface-raised, rgba(0,0,0,0.04))",
                          padding: "1px 5px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                        }}
                      >
                        {activeCluster.column}
                      </code>{" "}
                      with {activeCluster.confidence}% confidence.
                    </p>
                  </div>

                  {/* Actions toolbar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={handleDismiss}
                      disabled={resolveMutation.isPending}
                      title="Keep both rows as distinct individuals"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                        opacity: resolveMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      <XCircle size={14} style={{ color: "#ef4444" }} />
                      Not Duplicate
                    </button>

                    <button
                      onClick={handleNormalizeValues}
                      disabled={resolveMutation.isPending}
                      title="Update variant spellings to canonical without dropping rows"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        cursor: "pointer",
                        transition: "all 120ms ease",
                        opacity: resolveMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      <Sparkles size={14} style={{ color: "#f59e0b" }} />
                      Normalize Values
                    </button>

                    <button
                      onClick={handleMergeCluster}
                      disabled={resolveMutation.isPending}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: "none",
                        background: "var(--brand, #635bff)",
                        color: "#ffffff",
                        cursor: "pointer",
                        transition: "opacity 120ms ease",
                        opacity: resolveMutation.isPending ? 0.6 : 1,
                        boxShadow: "0 1px 3px rgba(99, 91, 255, 0.3)",
                      }}
                    >
                      <GitMerge size={14} />
                      Merge Records
                    </button>
                  </div>
                </div>

                {/* Side-by-side comparison grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                    <span>Field-by-Field Merge Comparison</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
                      Click any cell to pick value for the merged record
                    </span>
                  </div>

                  <div
                    style={{
                      overflowX: "auto",
                      borderRadius: "var(--radius-card)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "var(--surface-raised, rgba(0,0,0,0.02))", borderBottom: "1px solid var(--border)" }}>
                          <th style={{ padding: "10px 14px", width: 140, fontWeight: 700, color: "var(--text-muted)" }}>Field</th>
                          {activeCluster.records.map((rec, i) => (
                            <th key={i} style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: i === 0 ? "#10b981" : "#38bdf8",
                                  }}
                                />
                                <span>{i === 0 ? "Record A (Master)" : `Record ${String.fromCharCode(65 + i)} (Candidate)`}</span>
                                {rec._row_index !== undefined && (
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-subtle)", fontWeight: 400 }}>
                                    #row {rec._row_index + 1}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                          <th style={{ padding: "10px 14px", width: 180, fontWeight: 700, color: "var(--brand)", background: "rgba(99, 91, 255, 0.04)" }}>
                            Merged Result
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonFields.map((field, idx) => {
                          const valA = activeCluster.records[0]?.[field];
                          const valB = activeCluster.records[1]?.[field];
                          const isDifferent = String(valA ?? "") !== String(valB ?? "");
                          const pickedVal = fieldPicks[field] !== undefined ? fieldPicks[field] : valA;

                          return (
                            <tr
                              key={field}
                              style={{
                                borderBottom: idx < comparisonFields.length - 1 ? "1px solid var(--border)" : "none",
                                background: isDifferent ? "rgba(245, 158, 11, 0.03)" : "transparent",
                              }}
                            >
                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {field}
                              </td>

                              {activeCluster.records.map((rec, i) => {
                                const val = rec[field];
                                const isPicked = pickedVal === val;

                                return (
                                  <td
                                    key={i}
                                    onClick={() => handlePickField(field, val)}
                                    style={{
                                      padding: "10px 14px",
                                      cursor: "pointer",
                                      fontFamily: "var(--font-mono)",
                                      fontSize: 12,
                                      background: isPicked ? "rgba(99, 91, 255, 0.09)" : "transparent",
                                      color: isPicked ? "var(--brand)" : "var(--text)",
                                      fontWeight: isPicked ? 700 : 400,
                                      transition: "background 100ms ease",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {val !== null && val !== undefined ? String(val) : "—"}
                                      </span>
                                      {isPicked && (
                                        <Check size={13} style={{ color: "var(--brand)", flexShrink: 0 }} />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}

                              <td
                                style={{
                                  padding: "10px 14px",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "var(--brand)",
                                  background: "rgba(99, 91, 255, 0.04)",
                                }}
                              >
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {pickedVal !== null && pickedVal !== undefined ? String(pickedVal) : "—"}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Merged Preview Card */}
                <div
                  style={{
                    borderRadius: "var(--radius-card)",
                    border: "1px solid rgba(99, 91, 255, 0.2)",
                    background: "rgba(99, 91, 255, 0.03)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
                    <Database size={14} />
                    <span>Merged Record Preview</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)" }}>
                    This canonical representation will be written to the dataset ledger while duplicate row indices are securely pruned.
                  </p>
                  <div
                    style={{
                      borderRadius: 6,
                      background: "var(--surface)",
                      padding: "8px 12px",
                      border: "1px solid var(--border)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      overflowX: "auto",
                      color: "var(--text)",
                    }}
                  >
                    {comparisonFields.map((f) => (
                      <span key={f} style={{ display: "inline-block", marginRight: 16, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-muted)" }}>{f}:</span>{" "}
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>
                          {String(fieldPicks[f] !== undefined ? fieldPicks[f] : activeCluster.records[0]?.[f] ?? "—")}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: "var(--radius-card)",
                  border: "1px dashed var(--border)",
                  padding: 48,
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  background: "var(--surface)",
                }}
              >
                Select a duplicate cluster to review records side by side.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
