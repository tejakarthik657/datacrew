"use client";

import { Clock } from "lucide-react";

interface ComingSoonProps {
  feature: string;
  description?: string;
}

export function ComingSoon({ feature, description }: ComingSoonProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Clock size={24} style={{ color: "var(--text-subtle)" }} />
      </div>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text)",
        }}
      >
        {feature} — Coming soon
      </h2>
      <p style={{ margin: 0, fontSize: 14, maxWidth: 400 }}>
        {description ??
          "This feature is on the roadmap. The backend supports it — the UI is being built."}
      </p>
    </div>
  );
}
