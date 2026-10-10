"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { TrendingUp, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { post, ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";

interface ForecastPoint {
  date?: string;
  ts?: string;
  forecast?: number;
  yhat?: number;
  lower?: number;
  upper?: number;
}

interface ForecastHistoryPoint {
  date?: string;
  ts?: string;
  actual?: number;
  value?: number;
}

interface ForecastResult {
  forecast_id: string;
  metric: string;
  date_column: string;
  history?: ForecastHistoryPoint[];
  points?: ForecastPoint[];
  made_at?: string;
  accountability?: {
    mae?: number;
    mape?: number;
    coverage_rate?: number;
    [key: string]: unknown;
  };
}

interface ForecastTabProps {
  datasetId: string;
}

export function ForecastTab({ datasetId }: ForecastTabProps) {
  const [horizon, setHorizon] = useState<number>(3);
  const [dateColumn, setDateColumn] = useState("");
  const [metric, setMetric] = useState("");
  const [result, setResult] = useState<ForecastResult | null>(null);

  const forecastMutation = useMutation({
    mutationFn: () =>
      post<ForecastResult>(`/datasets/${datasetId}/forecast`, {
        horizon,
        date_column: dateColumn.trim() || undefined,
        metric: metric.trim() || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Forecast generated successfully");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Forecast failed";
      const hint = err instanceof ApiError ? err.hint : undefined;
      toast.error(msg, { description: hint });
    },
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
          Predictive Analytics & Forecasting
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Deterministic seasonal forecasting with 80% confidence bands and back-test accountability scoring.
        </p>
      </div>

      {/* Form Controls */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Forecast Horizon (Months)
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Date Column (Optional)
            </label>
            <input
              type="text"
              placeholder="Auto-detect"
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              Metric Column (Optional)
            </label>
            <input
              type="text"
              placeholder="Auto-detect"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={() => forecastMutation.mutate()}
          disabled={forecastMutation.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            background: forecastMutation.isPending ? "var(--text-disabled)" : "var(--brand)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 600,
            cursor: forecastMutation.isPending ? "not-allowed" : "pointer",
          }}
        >
          <Play size={14} />
          {forecastMutation.isPending ? "Computing Forecast…" : "Run Forecast"}
        </button>
      </div>

      {/* Results View */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Metadata banner */}
          <div
            style={{
              padding: "12px 16px",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", display: "block" }}>METRIC</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{result.metric}</span>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-subtle)", display: "block" }}>TIMELINE</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{result.date_column}</span>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              ID: {result.forecast_id ? `${result.forecast_id.slice(0, 8)}…` : "—"}
            </span>
          </div>

          {/* Forecast Points Table */}
          {result.points && result.points.length > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
                Forecast Projections (with 80% Confidence Intervals)
              </div>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                <thead>
                  <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 16px", textAlign: "left", color: "var(--text-muted)" }}>Period</th>
                    <th style={{ padding: "8px 16px", textAlign: "right", color: "var(--text-muted)" }}>Projected Value</th>
                    <th style={{ padding: "8px 16px", textAlign: "right", color: "var(--text-muted)" }}>Lower Band</th>
                    <th style={{ padding: "8px 16px", textAlign: "right", color: "var(--text-muted)" }}>Upper Band</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((pt, i) => {
                    const label = pt.date || pt.ts || `Period ${i + 1}`;
                    const val = pt.forecast ?? pt.yhat ?? 0;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px", color: "var(--text)", fontWeight: 600 }}>{label}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--brand)", fontWeight: 700 }}>
                          {formatNumber(Math.round(val))}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-muted)" }}>
                          {pt.lower != null ? formatNumber(Math.round(pt.lower)) : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "var(--text-muted)" }}>
                          {pt.upper != null ? formatNumber(Math.round(pt.upper)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};
