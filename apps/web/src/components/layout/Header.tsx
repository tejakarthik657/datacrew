"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { PrivacyChip } from "./PrivacyChip";
import { CommandPalette } from "./CommandPalette";
import type { AppUser } from "./AppShell";

interface HeaderProps {
  user: AppUser;
}

const ROUTE_NAMES: Record<string, string> = {
  "/datasets": "Datasets",
  "/crew": "Crew Missions",
  "/strategy": "Strategy Hub",
  "/privacy": "Privacy & PII Ledger",
  "/settings/audit": "Audit Log",
  "/settings/members": "Workspace Settings",
};

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const logout = async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      router.push("/login");
    }
  };

  // Derive section name
  const currentSection =
    ROUTE_NAMES[pathname] ??
    (pathname.startsWith("/datasets/")
      ? "Dataset Workspace"
      : pathname.startsWith("/crew/")
      ? "Crew Mission"
      : "DataCrew");

  // User initial for avatar
  const initial = (user.email?.[0] ?? "U").toUpperCase();

  return (
    <header
      style={{
        height: "var(--topbar-height, 56px)",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      {/* Left Context & Privacy Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
            }}
          >
            {currentSection}
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: "var(--border)" }} />

        {/* Privacy chip — always visible on authenticated pages */}
        <PrivacyChip />
      </div>

      {/* Right Actions: Command Search, Theme Toggle, Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Command Palette Trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          title="Search anything (⌘K / Ctrl+K)"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "6px 14px",
            minWidth: 220,
            background: "var(--surface-raised, rgba(0,0,0,0.03))",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-muted)",
            fontSize: 12,
            cursor: "pointer",
            transition: "all 120ms ease",
            boxShadow: "var(--shadow-card, 0 1px 2px rgba(0,0,0,0.02))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={14} style={{ color: "var(--text-subtle, #94a3b8)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>Search or jump…</span>
          </div>
          <kbd
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono, monospace)",
              background: "var(--surface)",
              color: "var(--text-muted)",
              padding: "2px 5px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              lineHeight: 1,
            }}
          >
            ⌘K
          </kbd>
        </button>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle colour theme"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            background: "var(--surface-raised, transparent)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 120ms ease",
          }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px 4px 5px",
            background: "var(--surface-raised, rgba(0,0,0,0.02))",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          {/* User Avatar Initial */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "linear-gradient(135deg, #635bff 0%, #8b5cf6 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "0 1px 3px rgba(99, 91, 255, 0.3)",
              flexShrink: 0,
            }}
          >
            {initial}
          </div>

          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text)",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.email}
          </span>

          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--brand, #635bff)",
              background: "rgba(99, 91, 255, 0.12)",
              border: "1px solid rgba(99, 91, 255, 0.25)",
              padding: "1.5px 6px",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              lineHeight: 1.2,
            }}
          >
            {user.role}
          </span>

          {/* Integrated Logout Icon */}
          <button
            onClick={logout}
            aria-label="Log out"
            title="Sign out of DataCrew"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              background: "transparent",
              border: "none",
              borderRadius: 4,
              color: "var(--text-subtle, #94a3b8)",
              cursor: "pointer",
              marginLeft: 2,
              padding: 0,
              transition: "color 120ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-subtle, #94a3b8)")}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
