"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, ShieldAlert, CheckCircle, Clock, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";

interface AgentEvent {
  agent?: string;
  message?: string;
  text?: string;
  timestamp?: string;
  status?: string;
  detail?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CrewRunData {
  id: string;
  dataset_id: string;
  status: "running" | "awaiting_approval" | "completed" | "rejected" | string;
  events: AgentEvent[];
  state: Record<string, unknown>;
}

interface CrewRunViewProps {
  runId: string;
}

export function CrewRunView({ runId }: CrewRunViewProps) {
  const qc = useQueryClient();

  const { data: run, isLoading, refetch } = useQuery({
    queryKey: ["crew", "run", runId],
    queryFn: () => get<CrewRunData>(`/crew/runs/${runId}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "running" ? 1000 : false;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (approve: boolean) =>
      post<CrewRunData>(`/crew/runs/${runId}/approve`, { approve }),
    onSuccess: (updated) => {
      qc.setQueryData(["crew", "run", runId], updated);
      toast.success(updated.status === "completed" ? "Fixes approved and executed!" : "Run decision recorded");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Approval failed";
      toast.error(msg);
    },
  });

  if (isLoading) {
    return <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading crew run…</div>;
  }

  if (!run) {
    return <div style={{ padding: 48, textAlign: "center", color: "var(--danger)" }}>Crew run not found.</div>;
  }

  const isAwaitingApproval = run.status === "awaiting_approval";

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "24px 0" }}>
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href={`/datasets/${run.dataset_id}/crew`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> Back to Crew
        </Link>
      </div>

      {/* Header bar */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: 20,
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text)" }}>
              Crew Run {run.id.slice(0, 8)}
            </h2>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                background:
                  run.status === "completed"
                    ? "var(--success-bg)"
                    : run.status === "awaiting_approval"
                    ? "var(--warning-bg)"
                    : run.status === "rejected"
                    ? "var(--danger-bg)"
                    : "rgba(99, 91, 255, 0.1)",
                color:
                  run.status === "completed"
                    ? "var(--success)"
                    : run.status === "awaiting_approval"
                    ? "var(--warning)"
                    : run.status === "rejected"
                    ? "var(--danger)"
                    : "var(--brand)",
              }}
            >
              {run.status.replace("_", " ")}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Dataset: {run.dataset_id}
          </p>
        </div>

        {run.status === "running" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--brand)" }}>
            <Clock size={14} className="animate-spin" />
            Autonomous agents collaborating…
          </div>
        )}
      </div>

      {/* Approval Gate */}
      {isAwaitingApproval && (
        <div
          style={{
            background: "var(--warning-bg)",
            border: "1px solid var(--warning-border)",
            borderRadius: "var(--radius-card)",
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: "var(--warning)" }}>
                Human-in-the-Loop Approval Required
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-body)" }}>
                The Cleaner Agent proposed destructive changes or PII redactions. Review the event timeline below and decide whether to approve execution.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => approveMutation.mutate(true)}
                  disabled={approveMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "var(--success)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Check size={14} /> Approve & Execute
                </button>
                <button
                  onClick={() => approveMutation.mutate(false)}
                  disabled={approveMutation.isPending}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: "transparent",
                    color: "var(--danger)",
                    border: "1px solid var(--danger-border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <X size={14} /> Reject Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Timeline */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: 20,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: "var(--text)" }}>
          Agent Event Stream ({run.events.length})
        </h3>
        {run.events.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>No events emitted yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {run.events.map((evt, idx) => {
              const msg = (evt.message || evt.text || JSON.stringify(evt)) as string;
              const agent = evt.agent || "Supervisor";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 14px",
                    background: "var(--surface-raised)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--brand)",
                      flexShrink: 0,
                    }}
                  >
                    {agent[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{agent}</span>
                      {evt.timestamp && (
                        <span style={{ fontSize: 11, color: "var(--text-subtle)", fontFamily: "var(--font-mono)" }}>
                          {evt.timestamp}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.4, wordBreak: "break-word" }}>
                      {msg}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
