"use client";

import { useQuery } from "@tanstack/react-query";
import { Shield, Clock, FileText } from "lucide-react";
import { get } from "@/lib/api/client";

interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
}

export default function AuditPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["workspace", "audit"],
    queryFn: () => get<AuditEntry[]>("/audit"),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
          Workspace Audit Log
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Immutable log of all user actions, dataset transformations, model calls, and exports within this workspace.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 13, color: "var(--text)" }}>
          Audit Events
        </div>

        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading audit entries…</div>
        ) : !logs || logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>No audit events recorded yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "var(--text-muted)" }}>Timestamp</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "var(--text-muted)" }}>Actor</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "var(--text-muted)" }}>Action</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "var(--text-muted)" }}>Target</th>
                  <th style={{ padding: "8px 14px", textAlign: "left", color: "var(--text-muted)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "10px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(log.ts).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text)", fontWeight: 600 }}>
                      {log.actor}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                          color: "var(--brand)",
                          fontWeight: 600,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-body)" }}>
                      {log.target}
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--text-subtle)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {JSON.stringify(log.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
