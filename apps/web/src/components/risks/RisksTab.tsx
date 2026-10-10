"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, CheckCircle, ShieldAlert, Sparkles, Filter } from "lucide-react";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";

interface RiskItem {
  id?: string;
  name?: string;
  rule?: string;
  title?: string;
  category?: string;
  severity: "high" | "medium" | "low" | string;
  count?: number;
  rows_affected?: number;
  description?: string;
  affected_columns?: string[];
  [key: string]: unknown;
}

interface RisksResponse {
  risks: RiskItem[];
}

interface RuleAddResponse {
  rule: Record<string, unknown>;
  violations: number;
  violation_row_ids: number[];
}

interface RisksTabProps {
  datasetId: string;
}

export function RisksTab({ datasetId }: RisksTabProps) {
  const qc = useQueryClient();
  const [ruleInput, setRuleInput] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["risks", datasetId],
    queryFn: () => get<RisksResponse>(`/datasets/${datasetId}/risks`),
  });

  const addRuleMutation = useMutation({
    mutationFn: (text: string) =>
      post<RuleAddResponse>(`/datasets/${datasetId}/rules`, { text }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["risks", datasetId] });
      setRuleInput("");
      toast.success(`Rule added! Found ${res.violations} violation(s).`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to add rule";
      toast.error(msg);
    },
  });

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleInput.trim()) return;
    addRuleMutation.mutate(ruleInput.trim());
  };

  const risks = data?.risks ?? [];
  const filteredRisks = risks.filter((r) => {
    if (severityFilter === "all") return true;
    return r.severity?.toLowerCase() === severityFilter.toLowerCase();
  });

  const highCount = risks.filter((r) => r.severity?.toLowerCase() === "high").length;
  const medCount = risks.filter((r) => r.severity?.toLowerCase() === "medium").length;
  const lowCount = risks.filter((r) => r.severity?.toLowerCase() === "low").length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
            Risks & Compliance Rules
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Deterministic audit of data quality anomalies, PII vulnerabilities, and natural language custom rules.
          </p>
        </div>

        {/* Counts summary pills */}
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--danger-bg)",
              color: "var(--danger)",
              border: "1px solid var(--danger-border)",
            }}
          >
            {highCount} High
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--warning-bg)",
              color: "var(--warning)",
              border: "1px solid var(--warning-border)",
            }}
          >
            {medCount} Medium
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: 12,
              fontWeight: 600,
              background: "var(--success-bg)",
              color: "var(--success)",
              border: "1px solid var(--success-border)",
            }}
          >
            {lowCount} Low
          </span>
        </div>
      </div>

      {/* Add Rule Form */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          <Sparkles size={14} color="var(--brand)" />
          Add Custom Business Rule
        </div>
        <form onSubmit={handleAddRule} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={ruleInput}
            onChange={(e) => setRuleInput(e.target.value)}
            placeholder='e.g., "Age must be between 18 and 100" or "Email cannot be empty"'
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              color: "var(--text)",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!ruleInput.trim() || addRuleMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: ruleInput.trim() && !addRuleMutation.isPending ? "var(--brand)" : "var(--surface-active)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 600,
              cursor: ruleInput.trim() && !addRuleMutation.isPending ? "pointer" : "not-allowed",
            }}
          >
            <Plus size={14} />
            {addRuleMutation.isPending ? "Parsing…" : "Add Rule"}
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "high", "medium", "low"].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            style={{
              padding: "5px 12px",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid",
              borderColor: severityFilter === sev ? "var(--brand)" : "var(--border)",
              background: severityFilter === sev ? "var(--surface-raised)" : "transparent",
              color: severityFilter === sev ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {sev === "all" ? "All Risks" : sev}
          </button>
        ))}
      </div>

      {/* Risk Grid */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 64, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)" }} />
          ))}
        </div>
      ) : filteredRisks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)", background: "var(--surface)", borderRadius: "var(--radius-card)", border: "1px solid var(--border)" }}>
          <CheckCircle size={32} color="var(--success)" style={{ marginBottom: 12, opacity: 0.8 }} />
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
            No risks in this category
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Dataset conforms to all evaluated quality standards and privacy rules.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredRisks.map((risk, idx) => {
            const sev = (risk.severity || "low").toLowerCase();
            const color = sev === "high" ? "var(--danger)" : sev === "medium" ? "var(--warning)" : "var(--success)";
            const bg = sev === "high" ? "var(--danger-bg)" : sev === "medium" ? "var(--warning-bg)" : "var(--success-bg)";
            const border = sev === "high" ? "var(--danger-border)" : sev === "medium" ? "var(--warning-border)" : "var(--success-border)";
            const title = (risk.title || risk.name || risk.rule || "Data Risk") as string;
            const desc = (risk.description || risk.category || "") as string;
            const count = risk.count ?? risk.rows_affected ?? null;

            return (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-card)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontSize: 11,
                      fontWeight: 600,
                      background: bg,
                      color: color,
                      border: `1px solid ${border}`,
                      textTransform: "uppercase",
                    }}
                  >
                    {sev}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                      {title}
                    </div>
                    {desc && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {desc}
                      </div>
                    )}
                  </div>
                </div>

                {count != null && (
                  <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    {formatNumber(count)} violations
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
