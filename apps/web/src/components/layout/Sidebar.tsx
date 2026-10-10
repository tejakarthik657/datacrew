"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Bot,
  TrendingUp,
  ShieldCheck,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole: string;
}

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
    badge?: string;
    badgeColor?: string;
    adminOnly?: boolean;
  }[];
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin" || userRole === "owner";

  const navSections: NavSection[] = [
    {
      title: "Workspace",
      items: [
        { href: "/datasets", label: "Datasets", icon: Database },
        { href: "/crew", label: "Crew Missions", icon: Bot, badge: "AI", badgeColor: "#8b5cf6" },
        { href: "/strategy", label: "Strategy Hub", icon: TrendingUp, badge: "₹", badgeColor: "#10b981" },
      ],
    },
    {
      title: "Trust & Governance",
      items: [
        { href: "/privacy", label: "Privacy & PII", icon: ShieldCheck, badge: "DPDP", badgeColor: "#10b981" },
        { href: "/settings/audit", label: "Audit Ledger", icon: History, adminOnly: true },
      ],
    },
    {
      title: "Management",
      items: [
        { href: "/settings/members", label: "Workspace Settings", icon: Settings, adminOnly: true },
      ],
    },
  ];

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: collapsed ? "var(--sidebar-collapsed, 64px)" : "var(--sidebar-width, 256px)",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "var(--topbar-height, 60px)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <Link href="/datasets" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <Logo size={collapsed ? "sm" : "md"} showWordmark={!collapsed} />
        </Link>
      </div>

      {/* Navigation Groups */}
      <div
        style={{
          flex: 1,
          padding: collapsed ? "14px 8px" : "18px 12px",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: collapsed ? 16 : 22,
        }}
      >
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter((i) => !i.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Section Header (when expanded) */}
              {!collapsed && section.title && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-subtle, #94a3b8)",
                    padding: "4px 10px 6px",
                  }}
                >
                  {section.title}
                </div>
              )}

              {/* Nav Items */}
              {visibleItems.map(({ href, label, icon: Icon, badge, badgeColor }) => {
                const active = pathname === href || (href !== "/datasets" && pathname.startsWith(href + "/"));

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "space-between",
                      gap: 12,
                      padding: collapsed ? "10px 0" : "9px 12px",
                      borderRadius: "var(--radius-md, 8px)",
                      textDecoration: "none",
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "var(--brand, #635bff)" : "var(--text)",
                      background: active
                        ? "rgba(99, 91, 255, 0.08)"
                        : "transparent",
                      border: "1px solid transparent",
                      transition: "all 120ms ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--surface-raised, #f1f5f9)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <Icon
                        size={18}
                        style={{
                          flexShrink: 0,
                          color: active ? "var(--brand, #635bff)" : "var(--text-muted)",
                          transition: "color 120ms ease",
                        }}
                      />
                      {!collapsed && (
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {label}
                        </span>
                      )}
                    </div>

                    {!collapsed && badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 9999,
                          background: `${badgeColor}15`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}30`,
                          lineHeight: 1.2,
                        }}
                      >
                        {badge}
                      </span>
                    )}

                    {/* Left Active Accent Bar */}
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          left: -12,
                          top: "15%",
                          bottom: "15%",
                          width: 3.5,
                          borderRadius: "0 4px 4px 0",
                          background: "var(--brand, #635bff)",
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer / System Status & Collapse Toggle */}
      <div
        style={{
          height: "var(--topbar-height, 60px)",
          borderTop: "1px solid var(--border)",
          padding: collapsed ? "0" : "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          background: "var(--surface)",
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontWeight: 600, color: "var(--text-body)" }}>Ledger Active</span>
          </div>
        )}

        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 6,
            background: "var(--surface-raised, #f1f5f9)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            cursor: "pointer",
            transition: "all 120ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--brand, #635bff)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}


