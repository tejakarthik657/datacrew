"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Award,
  Play,
  Bot,
  TrendingUp,
  BarChart3,
  Layers,
  ChevronRight,
  Eye,
  Check,
  Hash,
  AlertTriangle,
  Flame,
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");
  const { theme, setTheme } = useTheme();

  const agents = [
    {
      name: "Intake Agent",
      color: "var(--agent-intake, #38bdf8)",
      tag: "Source Routing",
      desc: "Auto-classifies files, databases, and MCP business tools into standardized tabular schemas.",
    },
    {
      name: "Cleaner Agent",
      color: "var(--agent-cleaner, #f59e0b)",
      tag: "Deterministic Imputation",
      desc: "Proposes typed normalisation, fuzzy deduplication, and missing-value fills. Human approval gated.",
    },
    {
      name: "Auditor Agent",
      color: "var(--agent-auditor, #ef4444)",
      tag: "Risk & Compliance",
      desc: "Detects PII leaks (SSN, emails, phones) and tests rows against uploaded contracts & natural rules.",
    },
    {
      name: "Analyst Agent",
      color: "var(--agent-analyst, #8b5cf6)",
      tag: "Guarded Text-to-SQL",
      desc: "Answers natural language questions with read-only SQL, charts, and exact evidence source rows.",
    },
    {
      name: "Forecaster Agent",
      color: "var(--agent-forecaster, #ec4899)",
      tag: "Predictive Analytics",
      desc: "Computes statistical time-series forecasts with 80% confidence bands and self-scoring accountability.",
    },
    {
      name: "Strategist Agent",
      color: "var(--agent-strategist, #14b8a6)",
      tag: "Value-at-Stake (₹)",
      desc: "Finds commercial leaks, ranks financial upside in Rupee (₹) terms, and writes the executive CEO brief.",
    },
  ];

  const comparisons = [
    { feature: "Data Ingestion", traditional: "Single CSV only", copilot: "Manual copy/paste", datacrew: "Any: CSV, Excel, DB, MCP, Webhooks" },
    { feature: "Execution Safety", traditional: "Hardcoded macros", copilot: "Hallucinates python/SQL", datacrew: "Deterministic Polars + Human Approval Gate" },
    { feature: "Privacy Control", traditional: "Local desktop", copilot: "Ships entire raw file to LLM", datacrew: "NER Masking + Zero-Knowledge Data Passport" },
    { feature: "Commercial Insights", traditional: "Manual pivot tables", copilot: "Generic chat text", datacrew: "Ranked ₹ Opportunities + CEO Executive Brief" },
    { feature: "Verifiable Provenance", traditional: "None", copilot: "None", datacrew: "SHA-256 Cryptographic Audit Ledger" },
  ];

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "var(--font-ui, Inter, sans-serif)", transition: "background-color 200ms ease, color 200ms ease" }}>
      {/* Top Navigation */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          background: "var(--header-bg)",
          borderBottom: "1px solid var(--header-border)",
          transition: "background-color 200ms ease, border-color 200ms ease",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size="md" />
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#crew" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 150ms ease" }}>The Crew</a>
            <a href="#demo" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 150ms ease" }}>Live Demo</a>
            <a href="#passport" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 150ms ease" }}>Data Passport</a>
            <a href="#comparison" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none", fontWeight: 500, transition: "color 150ms ease" }}>Why DataCrew</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              href="/login"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                textDecoration: "none",
                padding: "8px 14px",
                borderRadius: "var(--radius-md, 6px)",
                transition: "background 150ms ease",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/datasets"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#ffffff",
                background: "var(--brand, #635bff)",
                textDecoration: "none",
                padding: "8px 18px",
                borderRadius: "var(--radius-md, 6px)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 16px rgba(99, 91, 255, 0.35)",
                transition: "transform 150ms ease, box-shadow 150ms ease",
              }}
            >
              Launch Workspace <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 9999,
            background: "var(--hero-badge-bg)",
            border: "1px solid var(--hero-badge-border)",
            color: "var(--hero-badge-text)",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <Sparkles size={14} color="var(--brand, #635bff)" />
          Autonomous AI Data Team for Messy Business Data
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-1.5px",
            maxWidth: 960,
            margin: "0 auto 20px",
            background: "var(--hero-title-gradient)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Upload the spreadsheet you&apos;re embarrassed by. Get back data you can trust.
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-muted)",
            maxWidth: 720,
            margin: "0 auto 36px",
            lineHeight: 1.5,
          }}
        >
          Messy data in → deterministic health scores, multi-agent AI cleaning proposals, ranked rupee opportunities, and hash-verifiable Data Passports out.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 50 }}>
          <Link
            href="/datasets"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 28px",
              background: "var(--brand, #635bff)",
              color: "#ffffff",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(99, 91, 255, 0.45)",
            }}
          >
            Start Cleaning Free <ArrowRight size={16} />
          </Link>
          <Link
            href="/register"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px",
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "var(--shadow-card)",
            }}
          >
            Create Team Workspace
          </Link>
        </div>

        {/* Feature Badges Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 28,
            flexWrap: "wrap",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" /> Deterministic Polars Engine
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" /> Zero Raw Data Sent to AI
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" /> 1-Click Per-Step Reversible Undo
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={16} color="#10b981" /> SHA-256 Data Passport
          </span>
        </div>
      </section>

      {/* Interactive Transformation Demo Section */}
      <section id="demo" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-modal, 16px)",
            padding: 24,
            boxShadow: "var(--card-shadow)",
            transition: "all 200ms ease",
          }}
        >
          {/* Demo Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginLeft: 8 }}>
                dirty_customers.csv · Live Transformation Engine
              </span>
            </div>

            <div style={{ display: "flex", background: "var(--surface-raised)", borderRadius: 8, padding: 3, border: "1px solid var(--border)" }}>
              <button
                onClick={() => setActiveTab("before")}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "before" ? "#ef4444" : "transparent",
                  color: activeTab === "before" ? "#ffffff" : "var(--text-muted)",
                  transition: "all 150ms ease",
                }}
              >
                Dirty Ingest (Score 46)
              </button>
              <button
                onClick={() => setActiveTab("after")}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "after" ? "#10b981" : "transparent",
                  color: activeTab === "after" ? "#ffffff" : "var(--text-muted)",
                  transition: "all 150ms ease",
                }}
              >
                Cleaned Output (Score 94)
              </button>
            </div>
          </div>

          {/* Interactive Table Simulation */}
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-mono, monospace)" }}>
              <thead>
                <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>#ID</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Customer Name</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Email / PII</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>City</th>
                  <th style={{ padding: "10px 14px", textAlign: "right", color: "var(--text-muted)", fontWeight: 600 }}>Annual Spend</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "before" ? (
                  <>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(239, 68, 68, 0.06)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>#101</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>AARAV SHARMA</td>
                      <td style={{ padding: "12px 14px", color: "#ef4444" }}>aarav@sharma (Invalid)</td>
                      <td style={{ padding: "12px 14px", color: "#f59e0b" }}>BLR</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text)" }}>₹14,500.00</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#ef4444", fontSize: 11, background: "rgba(239, 68, 68, 0.12)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          Malformed Email
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(245, 158, 11, 0.06)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>#102</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>priya patel</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>priya.p@corp.in</td>
                      <td style={{ padding: "12px 14px", color: "#f59e0b" }}>Bengaluru</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#ef4444" }}>NULL</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#f59e0b", fontSize: 11, background: "rgba(245, 158, 11, 0.12)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          City Inconsistency
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(239, 68, 68, 0.06)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>#103</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>AARAV SHARMA</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>aarav@sharma.in</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>Bangalore</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text)" }}>₹14,500.00</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#ef4444", fontSize: 11, background: "rgba(239, 68, 68, 0.12)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          Exact Duplicate
                        </span>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(16, 185, 129, 0.06)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>#101</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>Aarav Sharma</td>
                      <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: 600 }}>aarav@sharma.in (Repaired)</td>
                      <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: 600 }}>Bengaluru</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text)" }}>₹14,500</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#10b981", fontSize: 11, background: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          Standardized
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(16, 185, 129, 0.06)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>#102</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: "var(--text)" }}>Priya Patel</td>
                      <td style={{ padding: "12px 14px", color: "var(--text)" }}>priya.p@corp.in</td>
                      <td style={{ padding: "12px 14px", color: "#10b981", fontWeight: 600 }}>Bengaluru</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#10b981", fontWeight: 600 }}>₹12,800 (Median)</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#10b981", fontSize: 11, background: "rgba(16, 185, 129, 0.12)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          Imputed Null
                        </span>
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid var(--border)", background: "rgba(148, 163, 184, 0.04)" }}>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)", textDecoration: "line-through" }}>#103</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-disabled)", textDecoration: "line-through" }}>AARAV SHARMA</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-disabled)", textDecoration: "line-through" }}>aarav@sharma.in</td>
                      <td style={{ padding: "12px 14px", color: "var(--text-disabled)", textDecoration: "line-through" }}>Bangalore</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text-disabled)", textDecoration: "line-through" }}>₹14,500.00</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11, background: "rgba(148, 163, 184, 0.15)", padding: "3px 8px", borderRadius: 4, fontWeight: 600 }}>
                          Deduplicated
                        </span>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Callout */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {activeTab === "before"
                ? "Original dataset has 3 critical anomalies, 1 duplicate, and invalid formatting."
                : "3 cleaning transformations applied deterministically with full undo recipe."}
            </span>
            <Link
              href="/datasets"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--brand, #635bff)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Test with Your Own File <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* The AI Data Crew Showcase */}
      <section id="crew" style={{ maxWidth: 1240, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand, #635bff)", textTransform: "uppercase", letterSpacing: "1px" }}>
            The Specialist Roster
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: "8px 0 12px", color: "var(--text)" }}>
            Meet Your Autonomous AI Data Crew
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-muted)", maxWidth: 640, margin: "0 auto" }}>
            A coordinated multi-agent team under a LangGraph supervisor. Each agent handles one job with total precision and visible human approval.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {agents.map((agent) => (
            <div
              key={agent.name}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card, 12px)",
                padding: 24,
                boxShadow: "var(--shadow-card)",
                transition: "border-color 200ms ease, transform 200ms ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: agent.color }} />
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{agent.name}</span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: "var(--agent-pill-bg)",
                    color: agent.color,
                  }}
                >
                  {agent.tag}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cryptographic Data Passport Showcase */}
      <section id="passport" style={{ maxWidth: 1240, margin: "0 auto", padding: "60px 24px" }}>
        <div
          style={{
            background: "var(--passport-bg-gradient)",
            border: "1px solid var(--passport-verified-border)",
            borderRadius: "var(--radius-modal, 16px)",
            padding: "48px 36px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 36, alignItems: "center" }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 9999,
                  background: "var(--passport-verified-bg)",
                  color: "#10b981",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                  border: "1px solid var(--passport-verified-border)",
                }}
              >
                <Award size={14} /> Tamper-Evident Nutrition Label for Data
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 16px", color: "var(--text)" }}>
                The Verifiable Data Passport
              </h2>
              <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 24px" }}>
                Share clean datasets with clients, investors, or auditors with a cryptographic proof seal. Anyone can verify the SHA-256 integrity and recipe logs without seeing your raw confidential rows.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <Link
                  href="/datasets"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    background: "#10b981",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  Issue a Passport <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Passport Card Mockup */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--passport-verified-border)",
                borderRadius: 12,
                padding: 24,
                boxShadow: "var(--card-shadow)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                  DATA PASSPORT CERTIFICATE
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono, monospace)",
                    color: "#10b981",
                    background: "var(--passport-verified-bg)",
                    border: "1px solid var(--passport-verified-border)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  PASSPORT #DP-784A
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                Dataset: <strong style={{ color: "var(--text)" }}>enterprise_q3_revenue.csv</strong>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "var(--surface-raised)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>BEFORE HEALTH</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", fontFamily: "var(--font-mono)" }}>42/100</div>
                </div>
                <div style={{ background: "var(--surface-raised)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>CERTIFIED HEALTH</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", fontFamily: "var(--font-mono)" }}>96/100</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={16} color="#10b981" />
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  SHA-256: 0x8f4d...3e9b (Audit Intact)
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 10px", color: "var(--text)" }}>
            Why Leading Teams Choose DataCrew
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-muted)" }}>
            The only platform uniting multi-source ingestion, human approvals, and cryptographic verification.
          </p>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-card)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Capability</th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Traditional Cleaners</th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Generic AI Chat</th>
                <th style={{ padding: "14px 18px", textAlign: "left", color: "var(--brand, #635bff)", fontWeight: 700 }}>DataCrew</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--table-zebra)" }}>
                  <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--text)" }}>{row.feature}</td>
                  <td style={{ padding: "14px 18px", color: "var(--text-muted)" }}>{row.traditional}</td>
                  <td style={{ padding: "14px 18px", color: "var(--text-muted)" }}>{row.copilot}</td>
                  <td style={{ padding: "14px 18px", color: "#10b981", fontWeight: 700 }}>{row.datacrew}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "48px 24px", transition: "all 200ms ease" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={{ marginBottom: 8 }}>
              <Logo size="sm" />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
              The Autonomous AI Data Team. Built for messy data, trusted outcomes.
            </p>
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
            <Link href="/login" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Sign In</Link>
            <Link href="/register" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Register</Link>
            <Link href="/datasets" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Datasets</Link>
            <Link href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacy Ledger</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
