"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bot, Play, Database, ArrowRight, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";

interface DatasetItem {
  id: string;
  name: string;
  rows: number;
  score: number;
}

interface CrewRunResponse {
  id: string;
  dataset_id: string;
  status: string;
}

export default function WorkspaceCrewPage() {
  const router = useRouter();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [question, setQuestion] = useState("");

  const { data: datasets, isLoading } = useQuery({
    queryKey: ["datasets"],
    queryFn: () => get<DatasetItem[]>("/datasets"),
  });

  const runMutation = useMutation({
    mutationFn: () => {
      const dsId = selectedDatasetId || datasets?.[0]?.id;
      if (!dsId) throw new Error("Please select or upload a dataset first");
      return post<CrewRunResponse>("/crew/run", {
        dataset_id: dsId,
        question: question.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success("Crew mission started!");
      router.push(`/crew/${data.id}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Run failed";
      toast.error(msg);
    },
  });

  const effectiveDatasetId = selectedDatasetId || datasets?.[0]?.id || "";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Bot size={22} color="var(--brand)" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Multi-Agent Crew Missions
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Deploy specialized AI agents with LangGraph supervisor orchestration. Automated intake, cleaning proposals, compliance audit, and human-in-the-loop approval.
        </p>
      </div>

      {/* Agents Roster */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { name: "Intake Agent", color: "var(--agent-intake)", role: "Classifies schema and routes ingestion" },
          { name: "Cleaner Agent", color: "var(--agent-cleaner)", role: "Fixes nulls, types, and normalizes columns" },
          { name: "Auditor Agent", color: "var(--agent-auditor)", role: "Flags PII leaks and regulatory risks" },
          { name: "Analyst Agent", color: "var(--agent-analyst)", role: "Executes read-only SQL queries and charts" },
        ].map((a) => (
          <div
            key={a.name}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.name}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              {a.role}
            </p>
          </div>
        ))}
      </div>

      {/* Launch Mission Card */}
      <div
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          padding: 24,
          marginBottom: 28,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
          Launch Crew Mission on Dataset
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
          Select target dataset and specify the analytical goal.
        </p>

        {isLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Loading datasets…</div>
        ) : !datasets || datasets.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", background: "var(--surface)", borderRadius: "var(--radius-md)" }}>
            <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: 13 }}>
              No datasets available in this workspace yet.
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
              <Database size={14} /> Upload Dataset First
            </Link>
          </div>
        ) : (
          <div>
            <div className="crew-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Target Dataset
                </label>
                <select
                  value={effectiveDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
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
                      {d.name} ({formatNumber(d.rows)} rows · {Math.round(d.score)}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
                  Mission Objective (Optional)
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Audit PII, propose normalisation, and calculate total customer lifetime value"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || !effectiveDatasetId}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: runMutation.isPending ? "var(--text-disabled)" : "var(--brand)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
                fontWeight: 600,
                cursor: runMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              <Play size={14} />
              {runMutation.isPending ? "Orchestrating Agents…" : "Launch Crew Mission"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
