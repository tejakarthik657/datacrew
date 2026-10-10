import type { Metadata } from "next";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";

export const metadata: Metadata = {
  title: "DataCrew — Autonomous Data Quality & Trust",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
        background: "var(--bg)",
      }}
    >
      {/* Left visual showcase: Raw Data In -> Golden Verified Data Out */}
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AuthVisualShowcase />
      </div>

      {/* Right form card container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          background: "var(--bg)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-modal, 14px)",
            padding: "36px 32px",
            boxShadow: "var(--shadow-modal, 0 20px 40px rgba(0,0,0,0.1))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
