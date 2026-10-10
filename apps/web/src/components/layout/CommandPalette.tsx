"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Database, Bot, TrendingUp, Shield, Users, Clock, ArrowRight, X } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const items = [
    { label: "Datasets & Uploads", href: "/datasets", icon: Database, category: "Data" },
    { label: "AI Crew Missions", href: "/crew", icon: Bot, category: "Agents" },
    { label: "Commercial Strategy (₹)", href: "/strategy", icon: TrendingUp, category: "Insights" },
    { label: "Privacy & Ledger Audit", href: "/privacy", icon: Shield, category: "Security" },
    { label: "Team Members & Roles", href: "/settings/members", icon: Users, category: "Workspace" },
    { label: "Audit Log & Provenance", href: "/settings/audit", icon: Clock, category: "Security" },
  ];

  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase()) ||
    i.category.toLowerCase().includes(query.toLowerCase())
  );

  const navigateTo = (href: string) => {
    router.push(href);
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(13, 14, 18, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          background: "var(--surface, #16171d)",
          border: "1px solid var(--border-strong, #3f4352)",
          borderRadius: "var(--radius-modal, 12px)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border, #292b35)",
            gap: 12,
          }}
        >
          <Search size={18} color="var(--brand, #635bff)" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to a view… (Esc to close)"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "var(--text, #f8fafc)",
              fontSize: 14,
            }}
          />
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Command list */}
        <div style={{ maxHeight: 320, overflowY: "auto", padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No commands or views found matching &quot;{query}&quot;.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => navigateTo(item.href)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-raised, #1e2029)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={16} color="var(--brand, #635bff)" />
                    <span style={{ fontWeight: 500, color: "var(--text, #f8fafc)" }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-subtle, #64748b)", textTransform: "uppercase" }}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
