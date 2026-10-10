"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { get } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/queryKeys";
import { formatBytes } from "@/lib/utils";

interface PrivacyDashboard {
  mode: "cloud_masked" | "byo_key" | "local";
  bytes_sent_external: number;
  ledger_ok: boolean;
}

const MODE_LABELS: Record<PrivacyDashboard["mode"], string> = {
  cloud_masked: "Cloud (masked)",
  byo_key: "BYO Key",
  local: "Local",
};

export function PrivacyChip() {
  const { data } = useQuery({
    queryKey: queryKeys.privacyDashboard(),
    queryFn: () => get<PrivacyDashboard>("/privacy/dashboard"),
    // Refresh every 60 seconds
    refetchInterval: 60_000,
    // Don't throw — chip degrades gracefully
    throwOnError: false,
  });

  if (!data) {
    // Skeleton
    return (
      <div
        style={{
          height: 24,
          width: 120,
          background: "var(--surface-hover)",
          borderRadius: "var(--radius-full)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    );
  }

  const isLocal = data.mode === "local";
  const zeroExternal = data.bytes_sent_external === 0;

  return (
    <Link
      href="/privacy"
      role="status"
      aria-label={`Privacy mode: ${MODE_LABELS[data.mode]}. ${zeroExternal ? "No bytes sent externally" : `${formatBytes(data.bytes_sent_external)} sent externally`}. Ledger ${data.ledger_ok ? "verified" : "not verified"}.`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        background: isLocal ? "var(--success-bg)" : "var(--surface-raised)",
        border: `1px solid ${isLocal ? "var(--success-border)" : "var(--border)"}`,
        fontSize: 11,
        fontWeight: 500,
        color: isLocal ? "var(--success)" : "var(--text-muted)",
        cursor: "pointer",
        textDecoration: "none",
        whiteSpace: "nowrap",
        transition: "border-color 120ms ease",
      }}
    >
      {data.ledger_ok ? (
        <ShieldCheck size={12} style={{ flexShrink: 0 }} />
      ) : (
        <ShieldAlert size={12} style={{ flexShrink: 0, color: "var(--warning)" }} />
      )}
      <span>{MODE_LABELS[data.mode]}</span>
      {!isLocal && (
        <>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <span
            style={{
              color: zeroExternal ? "var(--success)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {zeroExternal ? "0 bytes external" : formatBytes(data.bytes_sent_external)}
          </span>
        </>
      )}
    </Link>
  );
}
