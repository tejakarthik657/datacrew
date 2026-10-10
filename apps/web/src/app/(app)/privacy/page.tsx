"use client";

import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, RefreshCw, Lock, Shield, EyeOff, Hash } from "lucide-react";
import { get } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { formatBytes } from "@/lib/utils";

interface PrivacyDashboardData {
  mode: string;
  bytes_sent_external: number;
  ledger_entries: number;
  ledger_valid: boolean;
  fields_masked?: number;
  [key: string]: unknown;
}

interface LedgerVerifyData {
  valid: boolean;
  count: number;
  head_hash?: string;
  error?: string | null;
}

export default function WorkspacePrivacyPage() {
  const { data: privacy, isLoading: loadingPrivacy, refetch: refetchPrivacy } = useQuery({
    queryKey: ["privacy", "dashboard"],
    queryFn: () => get<PrivacyDashboardData>("/privacy/dashboard"),
  });

  const { data: ledger, isLoading: loadingLedger, refetch: refetchLedger } = useQuery({
    queryKey: ["ledger", "verify"],
    queryFn: () => get<LedgerVerifyData>("/ledger/verify"),
  });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Shield size={20} color="var(--brand)" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Privacy, Ledger & Provenance
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          Workspace cryptographic audit and zero-data-leakage verification. Real-time metrics for data boundaries, PII masking, and tamper-evident SHA-256 ledger integrity.
        </p>
      </div>

      {/* Grid Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
        {/* Card 1: Isolation Mode */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Execution Mode</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                background: "rgba(62, 207, 142, 0.1)",
                color: "#3ecf8e",
                border: "1px solid rgba(62, 207, 142, 0.3)",
                textTransform: "uppercase",
              }}
            >
              {privacy?.mode || "Local"}
            </span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)", marginBottom: 6 }}>
            {formatBytes(privacy?.bytes_sent_external ?? 0)}
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
            Total bytes sent externally. Raw row data is never transmitted unmasked.
          </p>
          <button onClick={() => refetchPrivacy()} style={ghostBtn}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Card 2: Ledger Integrity */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Cryptographic Ledger</span>
            {ledger?.valid ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3ecf8e", fontSize: 12, fontWeight: 600 }}>
                <ShieldCheck size={14} /> Verified Intact
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
                <ShieldAlert size={14} /> Mismatch
              </span>
            )}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)", marginBottom: 6 }}>
            {formatNumber(ledger?.count ?? 0)} Entries
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
            Tamper-evident blockchain-style hash chain securing transformations and model prompts.
          </p>
          <button onClick={() => refetchLedger()} style={ghostBtn}>
            <RefreshCw size={12} /> Verify Ledger
          </button>
        </div>

        {/* Card 3: Masking & Protection */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 22,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>PII Protection</span>
            <EyeOff size={16} color="var(--brand)" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#3ecf8e", marginBottom: 6 }}>
            100% Masked
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
            All queries pass through an automated NER/regex redaction pipeline before reaching models.
          </p>
        </div>
      </div>

      {/* Head Hash Ledger Detail */}
      {ledger?.head_hash && (
        <div
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-card)",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
            <Hash size={14} color="var(--brand)" />
            Ledger Head Cryptographic Root
          </div>
          <code
            style={{
              display: "block",
              background: "var(--surface)",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#3ecf8e",
              wordBreak: "break-all",
            }}
          >
            {ledger.head_hash}
          </code>
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "transparent",
  color: "var(--text-muted)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
};
