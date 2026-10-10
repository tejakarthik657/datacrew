---
version: alpha
name: DataCrew-AI-Data-Workspace-Design-System
description: "A production-grade AI data workspace design system for DataCrew. Tailored for multi-source data ingestion (CSV, DBs, MCP connectors), LangGraph agent supervisor orchestration (Intake, Cleaner, Auditor, Analyst, Forecaster, Strategist, Ops), human-in-the-loop approvals, dual-pane AI chat canvas, and verifiable Data Passport privacy layers. Built on a Linear-inspired dark slate canvas (#0d0e12) with Airtable/Clay data grids, Voltagent agent docks, Claude artifact split-views, and Supabase emerald green (#3ecf8e) cryptographic trust tokens."

colors:
  # Canvas & Surface System (Linear.app Dark Slate Foundation)
  canvas: "#0d0e12"
  canvas-soft: "#12141a"
  surface-card: "#16171d"
  surface-elevated: "#1e2029"
  surface-hover: "#252833"
  surface-active: "#2c303d"
  
  # Borders & Dividers
  hairline: "#292b35"
  hairline-strong: "#3f4352"
  hairline-focus: "#635bff"
  
  # Ink & Typography Hierarchy
  ink-display: "#f8fafc"
  ink-body: "#cbd5e1"
  ink-muted: "#94a3b8"
  ink-subtle: "#64748b"
  ink-disabled: "#475569"
  
  # Primary Chromatic Brand Voltage
  brand-primary: "#635bff"        # Electric Purple (Supervisor Agent & Primary Actions)
  brand-primary-hover: "#7a73ff"
  brand-primary-active: "#5046e5"
  on-primary: "#ffffff"
  
  # Agent Specialist Color Tokens (LangGraph Multi-Agent System)
  agent-intake: "#38bdf8"       # Cyan — Classification & Route Dispatch
  agent-cleaner: "#f59e0b"      # Amber — Data Cleaning & Human-in-the-Loop Approvals
  agent-auditor: "#ef4444"      # Coral Red — PII Detection, Risk & Rule Violations
  agent-analyst: "#8b5cf6"      # Violet — Chat with Data & Visual Insights
  agent-forecaster: "#ec4899"   # Pink — Predictive Analytics & Trend Modeling
  agent-strategist: "#14b8a6"   # Teal — Business Strategy & Recommendations
  agent-ops: "#6366f1"          # Indigo — Scheduled Jobs, Webhooks & Automated Alerts
  
  # Data Passport & Verifiable Privacy Layer (Supabase Emerald Green)
  passport-verified: "#3ecf8e"  # Emerald Green — Verifiable Privacy Seal & Hash Badge
  passport-verified-bg: "rgba(62, 207, 142, 0.08)"
  passport-verified-border: "rgba(62, 207, 142, 0.28)"
  passport-warning: "#f59e0b"   # Unverified or Pending Human Approval
  passport-danger: "#ef4444"    # Privacy Breach or PII Risk Triggered
  
  # Source Connector Badges (MCP & File Ingestion)
  source-file: "#22c55e"        # CSV, Excel, JSON
  source-database: "#3b82f6"    # Postgres, MySQL, MongoDB
  source-mcp: "#a855f7"         # Google Sheets, Stripe, HubSpot, Tally, Gmail, Drive
  source-webhook: "#eab308"     # REST/Webhook Pushes & Scraped Web Pages

typography:
  display-xl:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -1.2px
  display-lg:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.8px
  headline-md:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.4px
  body-ui:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  data-mono:
    fontFamily: "'JetBrains Mono', 'Geist Mono', 'SF Mono', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    fontVariantNumeric: tabular-nums

radii:
  card: 8px
  modal: 12px
  button: 6px
  pill: 9999px
  grid-cell: 4px
---

# DataCrew UI/UX Design System Specification

Welcome to the official **DataCrew Design System** specification. This document synthesizes design patterns from **Linear.app** (Dark Workbench Architecture), **Airtable & Clay** (Multi-Source Data Grids & Connector Tables), **Voltagent & Composio** (AI Agent Supervisor Orchestration), **Claude** (Dual-Pane Chat Artifact Canvas), and **Supabase** (Verifiable Data Passport Privacy Tokens).

---

## 🏗️ 1. Core Architecture & Layout System

DataCrew uses a 3-pane responsive desktop workbench layout designed for data density, zero-latency keyboard navigation, and real-time agent observability:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Data Workspace Title | Source Connectors Indicator | Data Passport Seal [🛡️ Verified #3ecf8e] │
├──────────────────┬─────────────────────────────────────────────────┬───────────────────────────────────┤
│ LEFT NAVIGATION  │ CENTER STAGE: MULTI-SOURCE DATA GRID            │ RIGHT SIDEBAR: LANGGRAPH DOCK    │
│                  │ (Airtable/Clay Hybrid Grid Engine)              │ (Voltagent Multi-Agent Pipeline)  │
│ 📁 File Sources  │                                                 │                                   │
│ 🐘 Databases     │ ┌────┬──────────────┬──────────────┬──────────┐ │ 🤖 Supervisor Agent               │
│ 🔌 MCP Tools     │ │ #  │ Source (MCP) │ Status       │ PII Risk │ │ ├── Intake Agent [Active 🟢]      │
│ 🌐 Webhooks      │ ├────┼──────────────┼──────────────┼──────────┤ │ ├── Cleaner Agent [Approval ⚠️]   │
│ 📬 Email Watcher │ │ 1  │ Stripe API   │ 🟢 Cleaned   │ 🛡️ Pass  │ │ ├── Auditor Agent [0 Violation]   │
│                  │ │ 2  │ PDF Invoice  │ 🟡 Needs Fix │ ⚠️ PII   │ │ ├── Analyst Agent [Active 💬]     │
│ ⚙️ Workspace     │ └────┴──────────────┴──────────────┴──────────┘ │ └── Ops Agent [Next 18:00]        │
├──────────────────┴─────────────────────────────────────────────────┴───────────────────────────────────┤
│ BOTTOM DUAL-PANE: CLAUDE ANALYST CHAT & VISUAL ARTIFACT CANVAS                                         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 2. Design Tokens & Color Palette

### 2.1 Canvas & Surface System
- **Workbench Canvas (`canvas`)**: `#0d0e12` (Linear-inspired near-black slate). Eliminates eye strain during prolonged data analysis.
- **Card Panels (`surface-card`)**: `#16171d` with 1px border (`#292b35`) and 8px border-radius.
- **Elevated Modals & Drawers (`surface-elevated`)**: `#1e2029` with 12px border-radius and subtle ambient drop shadow (`0 20px 40px rgba(0,0,0,0.6)`).

### 2.2 Chromatic Brand & Agent Tokens
- **Brand Primary (`#635bff`)**: Electric purple for supervisor CTAs, focused states, and execution triggers.
- **LangGraph Agent Tokens**:
  - **Intake Agent (`#38bdf8` - Cyan)**: Data classification, file parsing, source routing.
  - **Cleaner Agent (`#f59e0b` - Amber)**: Proposes data type fixes, null imputation; requires human approval.
  - **Auditor Agent (`#ef4444` - Coral Red)**: Finds PII, regulatory risks, rule violations.
  - **Analyst Agent (`#8b5cf6` - Violet)**: Natural language chat with data, SQL generation, chart rendering.
  - **Forecaster Agent (`#ec4899` - Pink)**: Time-series prediction, trend modeling.
  - **Strategist Agent (`#14b8a6` - Teal)**: Business recommendations, anomaly summaries.
  - **Ops Agent (`#6366f1` - Indigo)**: Scheduled syncs, webhook triggers, automated email alerts.

### 2.3 Data Passport & Verifiable Privacy Tokens
- **Verified Seal (`#3ecf8e`)**: Supabase emerald green. Used for cryptographic hash verification badges, zero-knowledge privacy proof indicators, and clean audit status.
- **Passport Badge Style**:
  ```css
  background: rgba(62, 207, 142, 0.08);
  border: 1px solid rgba(62, 207, 142, 0.28);
  color: #3ecf8e;
  border-radius: 9999px;
  font-family: 'JetBrains Mono', monospace;
  ```

---

## 📊 3. Multi-Source Data Grid Specification (Airtable / Clay Engine)

DataCrew handles any data source (CSV, Excel, PDF, JSON, Images of tables, Postgres, MySQL, MongoDB, Google Sheets, Stripe, HubSpot, Tally, Gmail, Drive, Web Scraping, Webhooks).

### 3.1 Cell Formatting & Font Stack
- **Header Cells**: Height 36px, background `#16171d`, bottom border `#292b35`, text `#94a3b8` (12px, weight 600, uppercase).
- **Data Cells**: Height 40px, font `'JetBrains Mono', monospace`, text `#cbd5e1` (13px).
- **Tabular Figures**: Enforce `font-variant-numeric: tabular-nums` on all numbers, currencies, dates, and row indexes to ensure vertical alignment across table columns.

### 3.2 Source Connector Badges
Each column or row displays a mini pill badge signaling its origin source:
- **Files (CSV/PDF/JSON/Image)**: Green pill (`#22c55e`)
- **Databases (SQL/Mongo)**: Blue pill (`#3b82f6`)
- **MCP Connectors (Stripe/HubSpot/Sheets)**: Purple pill (`#a855f7`)
- **Webhooks & Email-In**: Yellow pill (`#eab308`)

---

## 🤖 4. Agent Supervisor & Human-in-the-Loop Workflow (Voltagent Engine)

### 4.1 LangGraph Supervisor Dock
The right sidebar displays live multi-agent execution states:
- **Active State**: Pulsing 2px ring around agent icon with glowing status light.
- **Agent Execution Pill**: Shows execution duration, token count, and active step (e.g., `Auditor: Scanning 14,200 rows for SSN PII`).

### 4.2 Cleaner Agent Human-in-the-Loop Approval Drawer
When the **Cleaner Agent** identifies dirty data, missing nulls, or invalid date formats, it triggers a Human Approval Drawer:
- **Container**: Elevated drawer (`#1e2029`) sliding in from right side.
- **Comparison View**: Split diff view displaying **Original Value** (`#ef4444` background tint) vs. **Proposed Fix** (`#3ecf8e` background tint).
- **Action CTAs**:
  - Primary Accept: `[Approve Fix (Enter)]` in Amber (`#f59e0b`) or Primary Purple (`#635bff`).
  - Secondary Reject: `[Reject & Keep Original]` in Outlined Dark Hairline (`#292b35`).

---

## 💬 5. Analyst Chat & Visual Artifact Canvas (Claude Engine)

### 5.1 Dual-Pane Split View
When chatting with datasets using the **Analyst Agent**:
- **Left Pane (Chat & Prompts)**: 400px width. Displays thread conversation, prompt input box, and model parameters.
- **Right Pane (Visual Artifact Canvas)**: Flex fill. Displays generated SQL queries, interactive Recharts/ECharts visual graphs, or filtered data subset tables.

### 5.2 Prompt Input Composer
- **Border**: Floating 1px border `#3f4352` with subtle focus glow (`#635bff`).
- **Control Bar**: Quick slash command pills (`/analyze`, `/forecast`, `/audit-pii`, `/export-csv`), model selector dropdown, and file attachment dropzone.

---

## 🛡️ 6. Data Passport & Verifiable Privacy Specification

Every dataset ingested or processed by DataCrew receives a **Data Passport**:

### 6.1 Passport Components
1. **Cryptographic Fingerprint**: SHA-256 Hash displayed in Monospace (`0x7f8a...3e9b`).
2. **PII Audit Matrix**:
   - `Emails Masked`: 1,420
   - `Credit Cards Anonymized`: 38
   - `Compliance Rules`: 100% Passed (GDPR, HIPAA, SOC2)
3. **Verifiable Proof Badge**: Supabase Green (`#3ecf8e`) shield icon with interactive validation tooltip.

---

## ⌨️ 7. Keyboard Shortcuts & Accessibility Standard

DataCrew adopts **Linear's single-key & command palette navigation**:

| Shortcut | Action |
| :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Universal Command Palette (Search data, run agents, trigger MCP sync) |
| `C` | Open Cleaner Agent Approval Queue |
| `A` | Toggle Auditor PII Risk Overlay |
| `Space` | Inspect selected row in Data Grid |
| `Cmd + Enter` | Approve Cleaner Agent fix proposal |
| `/` | Focus Analyst Chat Prompt Box |

---

## 📂 Summary File Location

This design specification is registered in the project workspace:
- **Absolute Path**: `c:\teja\OneDrive\Pictures\karthik\awesome-design-md-main\awesome-design-md-main\design-md\datacrew\DESIGN.md`
