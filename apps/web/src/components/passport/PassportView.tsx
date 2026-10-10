"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Award, Hash, CheckCircle, ArrowRight, Lock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { post, ApiError } from "@/lib/api/client";
import { formatScore, formatNumber } from "@/lib/format";

interface PassportDoc {
  public_id: string;
  content_hash: string;
  name: string;
  collected_at: string;
  before: { score: number; [key: string]: unknown };
  after: { score: number; [key: string]: unknown };
  changes: { step_id: string; type: string; approved_by?: string; rows: number; undo_ref?: string }[];
  risks?: { found?: number; resolved?: number; open?: number; [key: string]: unknown };
  versions?: string[];
  recipe_hash?: string;
  privacy?: { fields_masked?: number; bytes_sent_external?: number; mode?: string };
}

interface PassportViewProps {
  doc: PassportDoc;
}

export function PassportView({ doc }: PassportViewProps) {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean } | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await post<{ valid: boolean }>("/passports/verify", doc);
      setVerificationResult(res);
      if (res.valid) {
        toast.success("Cryptographic integrity verified! 100% genuine and tamper-free.");
      } else {
        toast.error("Verification failed: Hash mismatch or corrupted passport.");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Verification request failed";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const beforeScore = doc.before?.score ?? 0;
  const afterScore = doc.after?.score ?? 0;

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "40px 20px" }}>
      {/* Top Seal Badge */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: "var(--radius-full)",
            background: "rgba(62, 207, 142, 0.1)",
            border: "1px solid rgba(62, 207, 142, 0.3)",
            color: "#3ecf8e",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          <Award size={16} />
          VERIFIABLE DATA PASSPORT
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
          {doc.name}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          Issued on {new Date(doc.collected_at).toLocaleDateString()} · Public ID:{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>{doc.public_id}</span>
        </p>
      </div>

      {/* Main card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-modal)",
          padding: 32,
          boxShadow: "var(--shadow-modal)",
          marginBottom: 32,
        }}
      >
        {/* Score comparison before -> after */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "24px 0",
            borderBottom: "1px solid var(--border)",
            marginBottom: 28,
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Original Health</span>
            <div style={{ fontSize: 40, fontWeight: 700, color: "var(--danger)", fontFamily: "var(--font-mono)" }}>
              {formatScore(beforeScore)}
            </div>
          </div>
          <ArrowRight size={24} color="var(--text-muted)" />
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Certified Health</span>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#3ecf8e", fontFamily: "var(--font-mono)" }}>
              {formatScore(afterScore)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase" }}>Quality Lift</span>
            <div style={{ fontSize: 40, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>
              +{formatScore(Math.max(0, afterScore - beforeScore))}
            </div>
          </div>
        </div>

        {/* Cryptographic Proof & Verification Box */}
        <div
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              <Hash size={14} color="var(--brand)" />
              SHA-256 Content Fingerprint
            </div>
            <button
              onClick={handleVerify}
              disabled={verifying}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "#3ecf8e",
                color: "#0d0e12",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                fontWeight: 700,
                cursor: verifying ? "not-allowed" : "pointer",
              }}
            >
              {verifying ? "Auditing…" : "Verify Cryptographic Proof"}
            </button>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>
            {doc.content_hash}
          </div>
          {verificationResult && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                background: verificationResult.valid ? "rgba(62, 207, 142, 0.1)" : "var(--danger-bg)",
                color: verificationResult.valid ? "#3ecf8e" : "var(--danger)",
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {verificationResult.valid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {verificationResult.valid ? "Hash match confirmed. Tamper-evident proof valid." : "Cryptographic verification failed."}
            </div>
          )}
        </div>

        {/* Changes applied log */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px", color: "var(--text)" }}>
            Provenance Log & Executed Transformations ({doc.changes.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {doc.changes.map((change, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--surface-raised)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--hairline)",
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: "var(--text)" }}>{change.type}</span>
                  {change.approved_by && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>
                      approved by {change.approved_by}
                    </span>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                  {formatNumber(change.rows)} rows modified
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
