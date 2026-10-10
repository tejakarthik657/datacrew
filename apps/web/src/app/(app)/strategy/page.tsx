"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Database, ArrowRight, IndianRupee } from "lucide-react";
import Link from "next/link";
import { get } from "@/lib/api/client";
import { StrategyTab } from "@/components/strategy/StrategyTab";
import { formatNumber } from "@/lib/format";

interface DatasetItem {
  id: string;
  name: string;
  rows: number;
  score: number;
}

export default function WorkspaceStrategyPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => get<DatasetItem[]>("/datasets"),
  });

  const activeDatasetId = selectedDatasetId || datasets?.[0]?.id || "";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <TrendingUp size={22} color="var(--brand)" />
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Commercial Strategy Hub
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            Commercial upside opportunities in Rupees (₹), what-if financial assumption modeling, and deterministic CEO briefs.
          </p>
        </div>

        {/* Dataset selector */}
        {datasets && datasets.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Dataset:</span>
            <select
              value={activeDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              style={{
                padding: "6px 12px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text)",
                fontSize: 13,
                outline: "none",
              }}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({Math.round(d.score)}% health)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading datasets…</div>
      ) : !datasets || datasets.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "var(--surface)", borderRadius: "var(--radius-card)", border: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: 14 }}>
            No datasets found. Upload a dataset to unlock financial upside analysis and CEO executive briefs.
          </p>
          <Link
            href="/datasets"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "var(--brand)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Database size={14} /> Upload Dataset
          </Link>
        </div>
      ) : (
        <StrategyTab datasetId={activeDatasetId} />
      )}
    </div>
  );
}
