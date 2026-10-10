# 04 · Frontend Document

> The UI covers the whole crew: connecting **any data source**, approving cleaning plans, auditing risk, asking questions, forecasting and advising, and proving privacy.

## 1. Stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Data grid | AG Grid Community (virtualized, millions of rows) |
| Charts | Apache ECharts |
| Lineage graph | Cytoscape.js or React Flow |
| State/data | TanStack Query + Zustand |
| Uploads | tus-js-client (resumable) |
| Realtime | SSE or WebSocket for job progress |
| Gestures (wow) | MediaPipe Hands (browser) |
| Voice (wow) | Web Speech API (fallback: Whisper endpoint) |
| Hosting | Cloudflare Pages |

## 2. Design Principles

1. **Before/after everywhere.** Users must *see* the change.
2. **Nothing silent.** Every AI action shows a toggle, rationale and undo.
3. **Trust visible.** Score, passport and privacy status are always one click away.
4. **Plain English.** No jargon in primary UI.
5. **Fast feel.** Optimistic UI, skeletons, streaming progress.
6. **Accessible.** Keyboard navigable; gestures are optional, never required.

## 3. Information Architecture

```
/                        Landing
/login /signup
/app
  /workspaces/[id]
    /sources             Sources hub: upload, paste URL, DB, MCP connectors, API/webhook keys
    /datasets            List, folders/categories, tags, search
    /datasets/[id]
        /overview        Profile, classification, routing suggestion, health score
        /plan            AI cleaning plan (toggle each step)
        /diff            Before/after view
        /dedupe          Side-by-side merge review
        /schema-map      Target template mapping
        /risks           Risk grid, contract check
        /chat            Ask your data (SQL, chart, source rows)
        /forecast        Forecasts + accountability
        /strategy        What will add value, what-if simulator
        /passport        Data Passport
        /lineage         Graph view
        /recipes         Saved pipelines
    /crew                Agent console: status, Agent Replay timeline, approvals
    /briefs              Weekly CEO briefs
    /automations         Ops autopilot: schedules, workflows, run status
    /privacy             Live Privacy Dashboard, Ledger, Safety Score, Synthetic Twin
    /notifications       Email/Slack alerts
    /settings            Members, roles, keys, model mode, usage and billing
/passport/[publicId]     Public verifiable page
```

## 4. Key Screens

### 4.1 Upload / Ingest
- Drag-and-drop zone (CSV, Excel, JSON, PDF tables, image of table).
- Paste URL field (scrape), connectors list (roadmap).
- Chunked upload progress with resume.
- After upload: auto-classification chip ("Invoices"), routing suggestion, **health score gauge (e.g. 42)**.

### 4.2 Profile / Overview
- Column cards: type, null %, unique %, sample values, issue badges.
- Per-column health bars.
- PII badges ("Aadhaar-like detected").

### 4.3 AI Cleaning Plan (the hero screen)
- List of steps, each with: title, rationale, affected rows estimate, confidence, risk tag, **toggle**.
- Example row: *"Merge 'Hyd', 'hyderabad ', 'Hydrabad' → 'Hyderabad' (312 rows)"*.
- Bulk actions: approve all safe, reject all risky.
- Live preview pane showing sample before/after for the focused step.
- "Apply" button → job with progress bar.
- Score preview: "42 → ~94 projected".

### 4.4 Diff View
- Side-by-side grid; changed cells highlighted (yellow modified, red removed, green added).
- Filter by step, column or row status.
- Per-step undo button.

### 4.5 Dedupe Merge Review
- Cluster list on left, side-by-side records on right.
- Field-level pick of surviving value; "merge", "not a duplicate", "skip".

### 4.6 Risk Grid
- Cells colored red/amber/green with tooltip: plain-English *why this is risky*.
- Categories: PII, outliers, rule violations, compliance, contract violations.
- Value-at-Stake badge per issue (₹ estimate), if built.

### 4.7 Chat With Your Data
- Chat thread; each answer shows: text, **chart**, **SQL/Pandas used**, **source rows** link (opens grid filtered to those rows).
- Suggested questions.

### 4.8 Schema Mapping
- Upload target template; two-column mapper with AI-suggested mappings and confidence; manual override; preview of restructured output.

### 4.9 Data Passport
- Header: dataset name, source, timestamps, verification hash.
- Score before/after with per-column breakdown.
- Timeline of changes with undo markers.
- Risks found vs resolved.
- Lineage graph snippet.
- Share link + QR + "verify" button (recomputes hash).

### 4.10 Privacy Dashboard
- Per dataset flow diagram: *file → mask → agent → model → result*.
- Counters: fields masked, **bytes sent externally** ("0 in local mode").
- Ledger table (filter by actor, export).
- Safety Score from Red Team Agent.
- Mode switch: Cloud / BYO key / Local.

### 4.11 Forecast (if built)
- Chart with history, forecast line, confidence band.
- Accuracy track record panel.
- What-if sliders.
- Ranked "what will add value" list with evidence-row links.

## 5. Additional Screens (the rest of the crew)

### 4.12 Sources Hub
- Tiles: **Upload file**, **Paste URL**, **Database**, **Business apps (MCP)**, **API/Webhook**, **Email-in**, **Watched folder**.
- Paste-URL flow: preview of detected tables/cards, editable "extract these fields" schema, robots.txt/ToS check result, PII warning, **Source Passport** preview.
- Connector cards show status (connected, syncing, error) and read-only badge for databases.
- Roadmap tiles are visible but marked "coming soon".

### 4.13 Crew Console and Agent Replay
- Live list of agents (Intake, Cleaner, Auditor, Forecaster, Strategist, Analyst, Ops) with status.
- **Agent Replay:** timeline of each agent's reasoning and tool calls, with **approve/reject** at each gate.
- Approval inbox for pending plan executions, writes and notifications.

### 4.14 Strategy (Predict and Advise)
- **Ranked "What will add value" list:** title, ₹ estimate, confidence, evidence-rows link. Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."*
- **What-if simulator:** sliders/inputs ("raise prices 5%") with before/after forecast chart.
- Value-at-Stake assumptions panel (editable).
- Impact Tracker (roadmap): convert insight to task with owner.

### 4.15 CEO Brief
- Weekly brief page and email preview: headline metrics, forecast changes, top opportunities, risks, each with evidence links.

### 4.16 Automations (Ops)
- Natural-language box: *"Every Monday, clean the sales sheet, flag anomalies, notify finance."*
- Generated workflow with steps, schedule, reminders; **run-status dashboard** (last run, success/fail, next run).
- Mostly roadmap; build a mock if time allows.

### 4.17 Synthetic Twin and Red Team
- One-click "Generate synthetic twin" with side-by-side distribution comparison.
- Safety Score card with latest red-team findings and rerun button.

### 4.18 Usage and Billing
- Rows processed, agent runs, connectors vs plan limits.

## 6. Point & Say (Wow Layer, browser-only)

| Gesture / voice | Action |
|-----------------|--------|
| Point at column | Focus/select column |
| Pinch | Select / confirm focus |
| Air-swipe right | Approve fix |
| Air-swipe left | Reject fix |
| Open palm hold (pause) | Pause gesture control |
| Voice "fix the dates" | Trigger relevant plan step for focused column |
| Destructive action | Always requires confirmation prompt |

Implementation: MediaPipe Hands in a Web Worker, landmark smoothing, debounce, on-screen cursor overlay, calibration step, camera permission flow, fallback to mouse/keyboard.

## 7. Component Inventory

`UploadDropzone`, `SourceTile`, `UrlScrapePreview`, `ConnectorCard`, `HealthGauge`, `ColumnCard`, `PlanStepCard`, `PlanToggleList`, `DiffGrid`, `ClusterReview`, `RiskGrid`, `RiskTooltip`, `ContractRulesPanel`, `ChatPanel`, `ChartBlock`, `SqlViewer`, `SourceRowsLink`, `SchemaMapper`, `ForecastChart` (with confidence band), `AccuracyTrackRecord`, `OpportunityList`, `WhatIfPanel`, `CeoBriefView`, `WorkflowBuilder`, `RunStatusTable`, `AgentTimeline`, `ApprovalInbox`, `PassportView`, `LineageGraph`, `PrivacyFlow`, `LedgerTable`, `SafetyScoreCard`, `ModeSwitch`, `JobProgress`, `GestureOverlay`, `VoiceButton`, `ConfirmDialog`, `RoleGuard`, `UsageMeter`.

## 8. States to Design For

- Empty (no datasets), uploading, profiling, planning, awaiting approval, executing, partial failure, done.
- LLM unavailable → show fallback message and retry/local option.
- Database paused → friendly "waking up" state.
- Large file → progress and ETA.

## 9. Performance

- Virtualized grid; server-side row windowing for large Parquet.
- Lazy load charts and MediaPipe only on demand.
- Cache API responses; prefetch next screen.

## 10. Security on the Client

- No secrets in bundle; short-lived tokens.
- Client-side encryption helper for third-party storage.
- Sanitize all rendered cell content (CSV injection: prefix `=`, `+`, `-`, `@` on export).
- Camera/mic permissions explicit and revocable.

## 11. Branding Notes

- Tone: calm, trustworthy, a little playful ("the spreadsheet you're embarrassed by").
- Color idea: deep blue/teal for trust; red/amber/green reserved for risk semantics.
- Signature visual: the score gauge animating 42 → 94.
