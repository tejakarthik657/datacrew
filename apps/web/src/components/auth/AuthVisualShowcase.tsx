"use client";

import React from "react";
import { 
  ShieldCheck, 
  Sparkles, 
  Bot
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function AuthVisualShowcase() {
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 44px",
        background: "linear-gradient(165deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)",
        color: "#0f172a",
        overflow: "hidden",
        borderRight: "1px solid #e2e8f0",
      }}
    >
      {/* Subtle Background Accent */}
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-10%",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 91, 255, 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Header Branding */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <Logo size="lg" />
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 14,
            padding: "4px 10px",
            borderRadius: 6,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <Sparkles size={12} style={{ color: "#635bff" }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            Autonomous Data Quality & Cryptographic Ledger
          </span>
        </div>
      </div>

      {/* Central Visual Showcase: Raw -> Clean */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          margin: "28px 0",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Raw Input Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #fecaca",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#b91c1c" }}>
                Raw Input Data
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                color: "#dc2626",
                background: "#fef2f2",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #fecaca",
              }}
            >
              Health 41% · 28 Anomalies
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>City (Inconsistent)</span>
              <span style={{ color: "#dc2626", textDecoration: "line-through" }}>"hyd / Hyderbad / HYD"</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Phone (Exposed PII)</span>
              <span style={{ color: "#dc2626" }}>9840210982 (Raw PII)</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Amount (Corrupted)</span>
              <span style={{ color: "#dc2626" }}>"₹ 12,040.5" / NaN</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Duplicates</span>
              <span style={{ color: "#dc2626" }}>3 Candidate Clusters</span>
            </div>
          </div>
        </div>

        {/* Pipeline Divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "2px 0" }}>
          <div style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <Bot size={13} style={{ color: "#635bff" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
              AI Crew Synthesis & Masking
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
        </div>

        {/* Clean Output Card */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #bbf7d0",
            padding: "16px 18px",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#15803d" }}>
                Golden Dataset Output
              </span>
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 700,
                color: "#16a34a",
                background: "#f0fdf4",
                padding: "2px 8px",
                borderRadius: 4,
                border: "1px solid #bbf7d0",
              }}
            >
              Health 98% · Validated
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Canonical City</span>
              <span style={{ color: "#15803d", fontWeight: 600 }}>"Hyderabad"</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>DPDP Protected PII</span>
              <span style={{ color: "#15803d", fontWeight: 600 }}>+91 ••••• ••982</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Numeric Schema</span>
              <span style={{ color: "#15803d", fontWeight: 600 }}>₹12,040.50 (Float)</span>
            </div>
            <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>
              <span style={{ color: "#94a3b8", display: "block", fontSize: 10 }}>Deduplication</span>
              <span style={{ color: "#15803d", fontWeight: 600 }}>Zero Data Loss</span>
            </div>
          </div>

          {/* Verification Stamp */}
          <div
            style={{
              marginTop: 12,
              padding: "7px 10px",
              borderRadius: 6,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              color: "#15803d",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={13} style={{ color: "#16a34a" }} />
              <span style={{ fontWeight: 600 }}>SHA-256 Data Passport Issued</span>
            </div>
            <span>Tamper-Evident</span>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Metrics Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          paddingTop: 18,
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0284c7", fontFamily: "var(--font-mono, monospace)" }}>
            0 Bytes
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            External leakage in Local Mode
          </div>
        </div>

        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", fontFamily: "var(--font-mono, monospace)" }}>
            +57 pts
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Average Health Score gain
          </div>
        </div>

        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#635bff", fontFamily: "var(--font-mono, monospace)" }}>
            100%
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            Cryptographic audit provenance
          </div>
        </div>
      </div>
    </div>
  );
}
