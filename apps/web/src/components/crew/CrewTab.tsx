"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Bot, Play, Shield, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { post, ApiError } from "@/lib/api/client";

interface CrewRunResponse {
  id: string;
  dataset_id: string;
  status: string;
  events: unknown[];
  state: Record<string, unknown>;
}

interface CrewTabProps {
  datasetId: string;
}

export function CrewTab({ datasetId }: CrewTabProps) {
  const router = useRouter();
  const [question, setQuestion] = useState("");

  const startCrewMutation = useMutation({
    mutationFn: () =>
      post<CrewRunResponse>("/crew/run", {
        dataset_id: datasetId,
        question: question.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success("Crew run started!");
      router.push(`/crew/${data.id}`);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to start crew run";
      toast.error(msg);
    },
  });

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
          Multi-Agent Crew Orchestration
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Orchestrate specialized AI agents (Intake, Cleaner, Auditor, Analyst, Forecaster, Strategist) with human-in-the-loop approval gates.
        </p>
      </div>

      {/* Agents cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { name: "Cleaner Agent", color: "var(--agent-cleaner)", role: "Detects dirty data, proposes typed imputation & normalisation" },
          { name: "Auditor Agent", color: "var(--agent-auditor)", role: "Scans for SSN/Email PII leaks and evaluates compliance rules" },
          { name: "Analyst Agent", color: "var(--agent-analyst)", role: "Generates SQL answers and trend analytics on clean state" },
          { name: "Strategist Agent", color: "var(--agent-strategist)", role: "Computes financial upside and drafts the CEO brief" },
        ].map((agent) => (
          <div
            key={agent.name}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: agent.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{agent.name}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
              {agent.role}
            </p>
          </div>
        ))}
      </div>

      {/* Start Run Card */}
      <div
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          padding: 24,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px", color: "var(--text)" }}>
          Launch Automated Crew Mission
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
          Optionally provide a specific analytical question or objective for the Crew to solve.
        </p>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Clean customer addresses, flag high-risk entries, and predict Q3 revenue"
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

        <button
          onClick={() => startCrewMutation.mutate()}
          disabled={startCrewMutation.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: startCrewMutation.isPending ? "var(--text-disabled)" : "var(--brand)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
            fontWeight: 600,
            cursor: startCrewMutation.isPending ? "not-allowed" : "pointer",
          }}
        >
          <Play size={14} />
          {startCrewMutation.isPending ? "Deploying Agents…" : "Start Crew Run"}
        </button>
      </div>
    </div>
  );
}
