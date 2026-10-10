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
      className="auth-layout-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
      }}
    >
      {/* Left visual showcase: Raw Data In -> Golden Verified Data Out */}
      <div className="auth-showcase-wrapper" style={{ flex: 1, minHeight: "100vh" }}>
        <AuthVisualShowcase />
      </div>

      {/* Right form card container */}
      <div
        className="auth-form-wrapper"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 16px",
          background: "var(--bg)",
          position: "relative",
          minWidth: 0,
        }}
      >
        <div
          className="auth-form-card"
          style={{
            width: "100%",
            maxWidth: 440,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-modal, 14px)",
            padding: "32px 24px",
            boxShadow: "var(--shadow-modal, 0 20px 40px rgba(0,0,0,0.1))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
