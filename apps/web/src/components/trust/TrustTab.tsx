"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Award, ExternalLink, RefreshCw, Lock, Database, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { get, post, ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";

interface PrivacyDashboardData {
  mode: string;
  bytes_sent_external: number;
  ledger_entries: number;
  ledger_valid: boolean;
  [key: string]: unknown;
}

interface LedgerVerifyData {
  valid: boolean;
  count: number;
  head_hash?: string;
  error?: string | null;
}

interface PassportResult {
  public_id: string;
  id?: string;
  [key: string]: unknown;
}

interface TrustTabProps {
  datasetId: string;
}

export function TrustTab({ datasetId }: TrustTabProps) {
  const qc = useQueryClient();
  const [issuedPassportId, setIssuedPassportId] = useState<string | null>(null);

  const { data: privacy, isLoading: loadingPrivacy, refetch: refetchPrivacy } = useQuery({
    queryKey: ["privacy", "dashboard"],
    queryFn: () => get<PrivacyDashboardData>("/privacy/dashboard"),
  });

  const { data: ledger, isLoading: loadingLedger, refetch: refetchLedger } = useQuery({
    queryKey: ["ledger", "verify"],
    queryFn: () => get<LedgerVerifyData>("/ledger/verify"),
  });

  const issuePassportMutation = useMutation({
    mutationFn: () => post<PassportResult>(`/datasets/${datasetId}/passport`),
    onSuccess: (data) => {
      const pid = data.public_id || data.id;
      if (pid) {
        setIssuedPassportId(pid);
        toast.success("Data Passport issued successfully!");
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Failed to issue passport";
      toast.error(msg);
    },
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
          Trust, Privacy & Ledger
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
          DataCrew operates with zero-knowledge cryptographic provenance. Monitor privacy metrics, audit ledger integrity, and issue hash-verifiable Data Passports.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* Privacy Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Privacy Status</span>
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
              {privacy?.mode || "Local"} Mode
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)", marginBottom: 4 }}>
            {formatNumber(privacy?.bytes_sent_external ?? 0)} B
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
            External bytes transmitted across AI boundaries. Data stays strictly quarantined or masked.
          </p>
          <button
            onClick={() => refetchPrivacy()}
            style={ghostBtn}
          >
            <RefreshCw size={12} />
            Refresh status
          </button>
        </div>

        {/* Ledger Integrity Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Audit Ledger</span>
            {ledger?.valid ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3ecf8e", fontSize: 12, fontWeight: 600 }}>
                <ShieldCheck size={14} /> Intact
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>
                <ShieldAlert size={14} /> Error
              </span>
            )}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)", marginBottom: 4 }}>
            {formatNumber(ledger?.count ?? 0)} Blocks
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--text-muted)" }}>
            Cryptographic SHA-256 hash chains secure every dataset change, transformation, and approval.
          </p>
          <button
            onClick={() => refetchLedger()}
            style={ghostBtn}
          >
            <RefreshCw size={12} />
            Verify ledger
          </button>
        </div>
      </div>

      {/* Passport Issuer Section */}
      <div
        style={{
          background: "var(--surface-raised)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-card)",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "rgba(62, 207, 142, 0.1)",
              border: "1px solid rgba(62, 207, 142, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Award size={22} color="#3ecf8e" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>
              Issue Verifiable Data Passport
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Generate a shareable, tamper-evident Data Passport for this dataset version. Includes cryptographic provenance hashes, cleaning recipe logs, and quality verification that anyone can independently audit without accessing your raw data.
            </p>

            {issuedPassportId ? (
              <div
                style={{
                  padding: "16px",
                  background: "var(--surface)",
                  border: "1px solid #3ecf8e",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#3ecf8e", marginBottom: 2 }}>
                    Passport Active
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                    ID: {issuedPassportId}
                  </div>
                </div>
                <Link
                  href={`/passport/${issuedPassportId}`}
                  target="_blank"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: "#3ecf8e",
                    color: "#0d0e12",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View Public Passport <ExternalLink size={13} />
                </Link>
              </div>
            ) : (
              <button
                onClick={() => issuePassportMutation.mutate()}
                disabled={issuePassportMutation.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  background: issuePassportMutation.isPending ? "var(--text-disabled)" : "var(--brand)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: issuePassportMutation.isPending ? "not-allowed" : "pointer",
                }}
              >
                {issuePassportMutation.isPending ? "Generating Passport…" : "Generate Data Passport"}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
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
