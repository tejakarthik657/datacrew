"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, FileText, Sliders, RefreshCw, CheckCircle, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";
import { formatRupee, formatPercent } from "@/lib/format";

interface Opportunity {
  id: string;
  title: string;
  impact_inr?: number;
  impact_rupees?: number;
  confidence: number;
  rationale?: string;
  assumptions?: Record<string, number>;
  [key: string]: unknown;
}

interface StrategyResponse {
  opportunities: Opportunity[];
  ceo_brief_markdown: string;
  forecast?: Record<string, unknown>;
}

interface StrategyTabProps {
  datasetId: string;
}

export function StrategyTab({ datasetId }: StrategyTabProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"opportunities" | "brief">("opportunities");
  const [editingOppId, setEditingOppId] = useState<string | null>(null);
  const [assumptionsState, setAssumptionsState] = useState<Record<string, Record<string, number>>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["strategy", datasetId],
    queryFn: () => get<StrategyResponse>(`/datasets/${datasetId}/strategy`),
  });

  const simulateMutation = useMutation({
    mutationFn: (assumptions: Record<string, Record<string, number>>) =>
      post<StrategyResponse>(`/datasets/${datasetId}/strategy/simulate`, { assumptions }),
    onSuccess: (updated) => {
      qc.setQueryData(["strategy", datasetId], updated);
      toast.success("Recalculated strategy based on new assumptions");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Simulation failed";
      toast.error(msg);
    },
  });

  const handleUpdateAssumption = (oppId: string, key: string, val: number) => {
    setAssumptionsState((prev) => ({
      ...prev,
      [oppId]: {
        ...(prev[oppId] || {}),
        [key]: val,
      },
    }));
  };

  const handleRecalculate = () => {
    simulateMutation.mutate(assumptionsState);
  };

  const opportunities = data?.opportunities ?? [];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
            Commercial Strategy & Opportunities
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Ranked financial upside opportunities in Rupee (₹) terms derived from cleaned dataset metrics and CEO strategic brief.
          </p>
        </div>

        {/* View Switcher */}
        <div style={{ display: "flex", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 3 }}>
          <button
            onClick={() => setActiveTab("opportunities")}
            style={{
              padding: "6px 14px",
              borderRadius: "calc(var(--radius-md) - 2px)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: activeTab === "opportunities" ? "var(--surface-raised)" : "transparent",
              color: activeTab === "opportunities" ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            Opportunities ({opportunities.length})
          </button>
          <button
            onClick={() => setActiveTab("brief")}
            style={{
              padding: "6px 14px",
              borderRadius: "calc(var(--radius-md) - 2px)",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: activeTab === "brief" ? "var(--surface-raised)" : "transparent",
              color: activeTab === "brief" ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            CEO Executive Brief
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 80, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }} />
          ))}
        </div>
      ) : activeTab === "opportunities" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {opportunities.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius-card)", border: "1px solid var(--border)" }}>
              No commercial opportunities identified yet. Clean data further to unlock pattern analysis.
            </div>
          ) : (
            opportunities.map((opp) => {
              const impact = opp.impact_inr ?? opp.impact_rupees ?? 0;
              const isEditing = editingOppId === opp.id;
              const oppAssumptions = { ...(opp.assumptions || {}), ...(assumptionsState[opp.id] || {}) };

              return (
                <div
                  key={opp.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-card)",
                    padding: 20,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>
                        {opp.title}
                      </h3>
                      {opp.rationale && (
                        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                          {opp.rationale}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
                        {formatRupee(impact)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-subtle)", textTransform: "uppercase" }}>
                        Confidence: {formatPercent(opp.confidence)}
                      </div>
                    </div>
                  </div>

                  {/* Assumptions section */}
                  {opp.assumptions && Object.keys(opp.assumptions).length > 0 && (
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-subtle)" }}>
                          Underlying Financial Assumptions
                        </span>
                        <button
                          onClick={() => setEditingOppId(isEditing ? null : opp.id)}
                          style={{
                            fontSize: 12,
                            color: "var(--brand)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {isEditing ? "Done Editing" : "Edit Assumptions (What-If)"}
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                        {Object.entries(oppAssumptions).map(([key, val]) => (
                          <div
                            key={key}
                            style={{
                              background: "var(--surface-raised)",
                              padding: "6px 12px",
                              borderRadius: "var(--radius-md)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 12,
                            }}
                          >
                            <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                              {key.replace(/_/g, " ")}:
                            </span>
                            {isEditing ? (
                              <input
                                type="number"
                                step="any"
                                value={val}
                                onChange={(e) => handleUpdateAssumption(opp.id, key, Number(e.target.value))}
                                style={{
                                  width: 80,
                                  padding: "2px 6px",
                                  fontSize: 12,
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: 4,
                                  color: "var(--text)",
                                  textAlign: "right",
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                                {val}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {isEditing && (
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={handleRecalculate}
                            disabled={simulateMutation.isPending}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 14px",
                              background: "var(--brand)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "var(--radius-md)",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <RefreshCw size={12} />
                            Recalculate What-If
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* CEO Executive Brief Tab */
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <FileText size={18} color="var(--brand)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
              Deterministic Executive Summary
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--text-body)",
              whiteSpace: "pre-wrap",
            }}
          >
            {data?.ceo_brief_markdown || "No CEO brief generated yet."}
          </pre>
        </div>
      )}
    </div>
  );
}
