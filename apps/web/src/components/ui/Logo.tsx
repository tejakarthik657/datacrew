"use client";

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

export function LogoMark({ size = 32 }: { size?: number }) {
  const id = React.useId();
  const gradBrand = `grad-brand-${id}`;
  const gradEmerald = `grad-emerald-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Brand Electric Purple Gradient */}
        <linearGradient id={gradBrand} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#635bff" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3ecf8e" />
        </linearGradient>

        {/* Cryptographic Trust Emerald Glow */}
        <linearGradient id={gradEmerald} x1="16" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3ecf8e" />
          <stop offset="100%" stopColor="#635bff" />
        </linearGradient>

        <filter id={`glow-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#635bff" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer rounded hexagon / shield crest container */}
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="9"
        fill={`url(#${gradBrand})`}
        fillOpacity="0.06"
        stroke={`url(#${gradBrand})`}
        strokeWidth="1.5"
      />

      {/* Modern stylized geometric "D" data-flow spine */}
      <path
        d="M13 11.5H21C26.2467 11.5 30.5 15.3056 30.5 20C30.5 24.6944 26.2467 28.5 21 28.5H13V11.5Z"
        fill="none"
        stroke={`url(#${gradBrand})`}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal convergent multi-agent data matrix nodes */}
      <path
        d="M13 20H20C22.2091 20 24 18.2091 24 16"
        stroke={`url(#${gradEmerald})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Multi-Agent Focal Points */}
      {/* Node 1: Top intake/dispatch */}
      <circle cx="21" cy="11.5" r="2" fill="#38bdf8" />
      {/* Node 2: Core supervisor node */}
      <circle cx="20" cy="20" r="2.25" fill="#635bff" />
      {/* Node 3: Cryptographic trust anchor */}
      <circle cx="21" cy="28.5" r="2" fill="#3ecf8e" />
    </svg>
  );
}

export function Logo({ size = "md", showWordmark = true, className = "" }: LogoProps) {
  const pixelSize = size === "sm" ? 26 : size === "lg" ? 38 : 32;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 8 : 10,
        userSelect: "none",
        textDecoration: "none",
      }}
    >
      <LogoMark size={pixelSize} />

      {showWordmark && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: size === "sm" ? 14 : size === "lg" ? 18 : 16,
              fontWeight: 700,
              letterSpacing: "-0.4px",
              color: "var(--text)",
              fontFamily: "var(--font-ui, Inter, sans-serif)",
              lineHeight: 1,
            }}
          >
            Data<span style={{ color: "var(--brand, #635bff)" }}>Crew</span>
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1.5px 5px",
              borderRadius: 4,
              background: "rgba(99, 91, 255, 0.12)",
              color: "var(--brand, #635bff)",
              border: "1px solid rgba(99, 91, 255, 0.25)",
              letterSpacing: "0.2px",
              lineHeight: 1,
            }}
          >
            AI
          </span>
        </div>
      )}
    </div>
  );
}
