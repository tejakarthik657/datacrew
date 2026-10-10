# 08 · Features and Modules

Legend: **A** = #11 core, must work first · **B** = trust must-have · **C** = crew build (final order: Supervisor → Cleaner → Analyst → Forecaster → Strategist) · **W** = wow-layer option · **D** = one of the 4 deep differentiators · **R** = roadmap slide only

> DataCrew works on **any data**, not only spreadsheets. Module M1 is the Ingestion Layer, and Predict & Advise (M8) is the main product feature, while the **demo leads with the #11 core (M3)**.

## 1. Module Map

```
M1 Ingestion (any source)   M2 Intake & Profiling   M3 Cleaning Engine (#11)
M4 Smart Dedupe             M5 Health & Passport    M6 Risk & Audit
M7 Ask Your Data (Analyst)  M8 Predict & Advise     M9 Privacy Layer
M10 Automation (Ops)        M11 Point & Say         M12 SaaS Platform
M13 Agent Crew & Transparency
```

## 2. M1 · Ingestion Layer ("Any source in, one clean pipeline")

| Feature | Tier |
|---------|------|
| Upload CSV, Excel (multi-sheet, merged cells) | **A** |
| Chunked, resumable uploads (tus); big files streamed | **A** |
| JSON upload | B |
| **Paste URL scraping** (tables, lists, repeated cards; LLM infers schema for hard pages) | **W** (ingestion wow) |
| **One database connector** (Postgres first, read-only credentials) | B/C |
| PDF tables, photo-of-table OCR | R/W |
| MySQL, MongoDB connectors | R |
| MCP connectors: Google Sheets, Drive, Gmail attachments, Stripe, HubSpot, Tally | R (one pilot optional) |
| REST API + webhook (push messy data in, pull clean data out) | R |
| Email-in dedicated address | R |
| Watched folders (Drive/S3) | R |
| Scheduled re-scrape with change tracking (price drops, new listings) | R |
| **Source Passport** (URL/connector, timestamp, what collected) | B |
| Responsible scraping: robots.txt/ToS check, no logins/paywalls, PII flag + mask, per-domain rate limit | B |
| Huge data: DuckDB/Polars streaming, Parquet, background workers with progress bar | **A** |

## 3. M2 · Smart Intake and Profiling

| Feature | Tier |
|---------|------|
| Column profiling (type, nulls, uniques, patterns) | **A** |
| Column meaning inference | **A** |
| Auto-classification (payroll, invoices, inventory, sales) | B |
| Auto-tagging and summary | B |
| Routing suggestion ("HR only, mask salary column") | B |
| Folders/categories | B |

## 4. M3 · Cleaning Engine (the #11 core)

| Feature | Tier |
|---------|------|
| **AI cleaning plan, approve/reject each step** | **A** |
| Duplicate removal (exact) | **A** |
| Missing-value detection and fill | **A** |
| Column name normalization | **A** |
| Date, phone, case, whitespace, type standardization | **A** |
| Value normalization ("Hyd" → "Hyderabad") | **A** |
| Restructure data (split/merge, reshape) | **A** |
| Before/after diff view | **A** |
| Download cleaned data (CSV/XLSX/Parquet) | **A** |
| **Recipe export** (Python/SQL/JSON) | **A** |
| Version history and undo | **A** (basic) |
| Chat-to-clean ("remove test entries, split Name") | W |
| **Target schema mapping** (CRM/Tally/ERP template) | W |
| Plain-English validation rules ("phone must be 10 digits") | B |
| Reusable recipes (apply to next month's file) | B |
| Auto-enrichment (city from pincode, company names) | R |
| PDF data-quality report | B |

## 5. M4 · Smart Dedupe (graph-based)

| Feature | Tier |
|---------|------|
| Fuzzy matching ("Ravi Kumar" vs "Kumar, Ravi") with Splink/rapidfuzz | B |
| Graph clusters (pairs = edges, connected components) | B |
| Side-by-side merge review | B |
| Semantic (embedding) dedupe | B |
| Money Leak Finder (reconcile payments vs invoices vs bank) | R |

## 6. M5 · Health Score and Data Passport

| Feature | Tier |
|---------|------|
| **Data Health Score 0-100, before/after, per column** | **A** |
| **Data Passport** (score, every change with undo, risks resolved, source and lineage) | B |
| Shareable public verifiable link + hash verify | B |
| Lineage graph (Neo4j + Cytoscape/React Flow) | B |
| "What breaks if I change this column?" | R |
| Data Time Machine (rewind workspace to a date) | R |

## 7. M6 · Risk and Audit (Auditor agent)

| Feature | Tier |
|---------|------|
| **Red/amber/green risk grid** with plain-English reasons | B |
| PII exposure detection (Aadhaar, phone, email) | B |
| Anomaly detector with explanation ("40x the median") | B |
| Broken business-rule detection | B |
| **Contract-to-Data check** (extract rules from PDF, flag violating rows) | W |
| Continuous contract enforcement on live data | R |
| Drift Sentinel (alert when a column's behavior changes) | R |
| Value-at-Stake meter (₹ per issue) | **D** |

## 8. M7 · Ask Your Data (Analyst agent)

| Feature | Tier |
|---------|------|
| **Chat with your data**, read-only text-to-SQL with guardrails | B/C |
| Every answer: chart + query used + source rows | B/C |
| Semantic cache | B |
| Auto-dashboard (charts + written insights + anomalies) | R |
| Chat across all cleaned files / database (GraphRAG) | R |
| KPI Truth Layer (company definitions) | R |

## 9. M8 · Predict and Advise (Forecaster + Strategist, main feature)

| Feature | Tier |
|---------|------|
| Forecasts: revenue, churn, stock-outs, cash flow, with **confidence ranges** (Prophet/statsforecast) | C |
| **Forecast Accountability** (logs predictions, scores itself, shows track record) | **D** |
| **Ranked "What will add value" list** with ₹ estimate and evidence rows | C/**D** |
| What-if simulator ("raise prices 5%") | C/R |
| Weekly CEO brief | C/R |
| Impact Tracker (insight → task → measured outcome) | R |

## 10. M9 · Privacy Layer (the moat)

| Feature | Tier |
|---------|------|
| PII masking before any LLM call (Presidio) | **A/B** |
| Tenant isolation (Postgres RLS; Qdrant `tenant_id` index) | B |
| Agent sandboxing (read-only creds, network allowlist, approval before writes; prompt-injection defense) | B |
| Local-model mode (Ollama + Chroma, zero egress) | B/W |
| Bring-your-own API key | B |
| Privacy Ledger (hash-chained, tamper-evident) | B |
| Live Privacy Dashboard ("0 bytes sent externally" in local mode) | B |
| Per-company envelope encryption, crypto-erase + deletion receipt | R/B |
| Client-side encryption before third-party storage | B |
| **Red Team Agent + Safety Score** | **D** |
| **Synthetic Twin** (SDV) | **D** |
| Plain-English Governance ("interns see sales but never salary") | R |
| DPDP Act and SOC 2 | R |

## 11. M10 · Automation (Ops agent)

| Feature | Tier |
|---------|------|
| NL instruction → workflow ("Every Monday, clean the sales sheet, flag anomalies, notify finance") | R |
| Task generation, reminders, run-status dashboard | R |
| Scheduled cleaning (Drive folder/inbox) | R |
| Notifications: email, Slack | R |

## 12. M11 · Point & Say (browser-only wow)

| Feature | Tier |
|---------|------|
| Webcam hand tracking with MediaPipe | W |
| Point at a column, say "fix the dates" | W |
| Pinch select, air-swipe right approve, left reject | W |
| Pause gesture + confirmation before destructive actions | W |

## 13. M12 · SaaS Platform

| Feature | Tier |
|---------|------|
| Auth, multi-tenant workspaces | **A/B** |
| Roles: Admin / Editor / Viewer | B |
| Audit log (who changed what and why) | B |
| Admin controls (folders, retention, mode, keys) | B |
| Background jobs with progress | **A** |
| Usage metering and usage-based pricing tiers | R |
| API and webhooks | R |

## 14. M13 · Agent Crew and Transparency

| Feature | Tier |
|---------|------|
| LangGraph **Supervisor** | C |
| Intake, Cleaner, Analyst, Forecaster, Strategist agents | C |
| Auditor, Ops agents | R (if time runs short) |
| Human approval gates | B |
| **Agent Replay** timeline with approve/reject | R/B |

## 15. Build Order (final)

1. **Prep:** demo data generator, accounts (sign up early), keep-alive, adapters (`StorageAdapter`, `VectorStore`, `LLMRouter`).
2. **Tier A:** upload → profile → plan → toggles → execute → score → diff → download → recipe.
3. **Tier B basics:** masking, RLS, audit log, risk grid, Data Passport, Ask Your Data.
4. **Crew:** Supervisor → Cleaner → Analyst → Forecaster → Strategist.
5. **Ingestion:** URL scraping, then one database connector.
6. **Wow (pick):** chat + schema mapping, or Point & Say + contract-to-data.
7. **Deep four (as time allows):** Forecast Accountability, Value-at-Stake, Red Team Agent, Synthetic Twin.
8. **Everything else:** roadmap slide.

## 16. Alignment With Problem Statement #11

| Directly #11 | Supporting trust/audit layer | Beyond #11 (frame as "step two") |
|--------------|-----------------------------|-----------------------------------|
| Synthetic Twin, Drift Sentinel, KPI Truth Layer, Data Time Machine, Agent Replay, Money Leak Finder (smart matching), Value-at-Stake | Plain-English Governance, Red Team Agent, Contract-to-Data | Forecast Accountability, Impact Tracker, Predict & Advise |

**Demo ratio:** ~50% #11 core · ~30% trust and privacy · ~20% prediction.
