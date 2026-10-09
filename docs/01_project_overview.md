# PART 1: PROJECT OVERVIEW

## 01 · Project Overview

> **Working name:** DataCrew (earlier names: TrustSheet, DataPilot, TidyAI)
> **Final positioning:** *an autonomous AI data team for every company.* Connect **any data**, and a crew of agents **cleans it, watches it, predicts what's coming, and tells you what will add value.**
> **Locked entry problem statement:** #11, messy data in → clean, normalized, deduplicated, restructured data out. Spreadsheets are where the demo *starts*, not where the product *stops*.
> **Pitch lines:**
> - *"Upload the spreadsheet you're embarrassed by. Get back data you can trust, and answers you can use."*
> - *"Your data never has to leave your control, and we'll show you every step to prove it."*

## Document Index

| # | File | Purpose |
|---|------|---------|
| 01 | project_overview.md | Vision, scope tiers, decision log, roadmap |
| 02 | non_technical.md | Story, problem, personas, business, SaaS model, risks, legal |
| 03 | technical.md | Architecture, ingestion layer, agents, privacy, scaling |
| 04 | frontend.md | Screens, components, Point & Say |
| 05 | backend.md | APIs, MCP connectors, agent crew, jobs, notifications |
| 06 | database.md | Postgres, Neo4j, Qdrant/Chroma, storage, demo data |
| 07 | ai_llm.md | LLM routing, prompts, Predict & Advise, guardrails |
| 08 | features_and_modules.md | Every feature, module and priority tier |
| 09 | techstack_and_services.md | Every tool and service, card/limit notes, stack corrections |
| 10 | user_flow.md | Inputs, outputs, flows, demo scripts |
| 11 | marketing_and_pitch.md | Positioning, uniqueness, deck, judge Q&A |
| 12 | build_plan.md | Phases, repo skeleton, cut rules, definition of done |
| 13 | schemas_and_contracts.md | Plan schema, score formula, Passport/ledger shapes, API examples |

## 1. One-Paragraph Summary

DataCrew is an AI data workspace that works on **any data**, not only spreadsheets. Sources include files (CSV, Excel, PDF, JSON, images of tables), databases (Postgres, MySQL, MongoDB), business tools via **MCP connectors** (Google Sheets, Stripe, HubSpot, Tally, Gmail, Drive), scraped web pages, REST/webhook pushes, email-in and watched folders. A **LangGraph supervisor** coordinates specialist agents: **Intake** classifies and routes, **Cleaner** proposes fixes (humans approve), **Auditor** finds risks, PII and rule violations, **Analyst** chats with your data, **Forecaster** predicts, **Strategist** advises, **Ops** runs on schedule and alerts. Everything is wrapped in a **verifiable privacy layer** and a **Data Passport** for every dataset.

## 2. Source Problem Statements and What We Took From Each

The project started from 11 problem statements. We locked **#11** and borrowed capabilities from others.

| # | Original problem statement | Decision | What we use |
|---|---------------------------|----------|-------------|
| 1 | Company knowledge base: upload docs, chat with source-backed answers, folders, admin controls | **Borrowed** | "Ask Your Data": chat across cleaned data, answers link to exact source rows; folders/categories; admin controls |
| 2 | Document metadata extraction, classification, routing suggestion | **Borrowed** | Smart intake: auto-classify (payroll, invoices, inventory), tags, summary, routing ("HR only, mask salary column") |
| 3 | Legal/business document risk analysis | **Borrowed** | Data Risk Audit: red/amber/green grid; **Contract-to-Data check** (extract rules from PDF, flag violating rows) |
| 4 | Voice assistant for PC actions | Partly | Voice command layer reused inside Point & Say |
| 5 | Hand-gesture + voice computer control | **Borrowed (wow)** | **Point & Say**, browser-only webcam hand tracking with MediaPipe |
| 6 | Android accessibility app | Not used | n/a |
| 7 | AI form builder | Not used | n/a |
| 8 | SOP generator | Not used | n/a |
| 9 | Website policy generator | Not used | n/a |
| 10 | Operations agent: instructions → tasks, reminders, workflows | **Borrowed** | Ops agent / autopilot: "Every Monday, clean the sales sheet, flag anomalies, notify finance" |
| **11** | **Messy Excel/CSV: clean, normalize, deduplicate, restructure** | **LOCKED (core)** | Upload, duplicate removal, missing-value detection, column normalization, restructure, download |

## 3. Positioning Evolution

| Stage | Positioning | Why we moved on |
|-------|-------------|-----------------|
| 1 | "Messy Excel/CSV cleaner" (#11) | Narrow, many tools exist |
| 2 | "AI data workspace": clean, chat, dashboard, enrichment | Better, still a tool |
| 3 | "TrustSheet", the AI Data Trust Workspace (clean + audit + gestures + Data Passport) | Trust is a strong hook |
| 4 | **"DataCrew", an autonomous AI data team** for any data via MCP connectors; agents clean, watch, predict, advise | One-stop angle, not limited to spreadsheets |
| 5 | **DataCrew + privacy you can verify** | Most data-AI tools ship data to a cloud LLM; we show proof |
| 6 | Add the **Ingestion Layer** (scraping, DB, API, email, watched folders, huge data) | Scraped/imported data is the messiest; strengthens #11 |

## 4. The Crew (agents)

| Agent | Job |
|-------|-----|
| Intake | Classify source, tag, pick workflow |
| Cleaner | Propose fixes; **humans approve** |
| Auditor | Risks, PII, rule violations; check data against uploaded contracts |
| Forecaster | Predict revenue, churn, stock-outs, cash flow (real statistical models) |
| **Strategist** | **Main feature: Predict and Advise** |
| Analyst | Chat with your database (read-only text-to-SQL) |
| Ops | Scheduled runs, alerts, notifications |

### Main feature: Predict and Advise
- Forecasts with **confidence ranges**, not just numbers.
- A ranked **"What will add value"** list. Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* Each item has the **evidence rows** behind it.
- **What-if simulator:** "What if we raise prices 5%?"
- **Weekly CEO brief** generated by the agents.
- **Forecast Accountability:** the system logs predictions and scores itself against reality.

## 5. What Makes It a Real SaaS

Multi-tenant workspaces, roles (Admin/Editor/Viewer), audit log · background jobs and scheduled runs · human approval before agents change anything · notifications (email, Slack) · usage-based pricing tiers · Data Passport for every dataset · API and webhooks.

## 6. Differentiators (summary; details in file 11)

- **Plan, not blind edits:** AI proposes, humans approve each step.
- **Data Health Score** 0-100, before/after, per column.
- **Data Passport:** a "nutrition label" for data: score, every change with undo, risks resolved, source and lineage.
- **Privacy you can verify:** PII masking, tenant isolation, per-company encryption, local-model mode, hash-chained Privacy Ledger, live dashboard.
- **Graph core:** Neo4j lineage, graph-based dedupe, GraphRAG chat.
- **Predict and prove:** forecasts that grade themselves; every insight priced in ₹.
- **Red Team Agent** with a live Safety Score; **Synthetic Twin** for safe sharing.

## 7. Scope Control (latest decisions win)

### Tier A: #11 core (must be fully working and shown first)
Upload, profile, AI cleaning plan with toggles, duplicate removal, missing-value detection, column normalization, restructure, **health score before/after**, diff view, download, recipe export (Python/SQL).

### Tier B: trust must-haves
Cleaning plan + health score + **risk grid + Data Passport + Ask Your Data**. Basic PII masking, tenant isolation, audit log.

### Tier C: crew build order (from the DataCrew brief)
**Supervisor first, then Cleaner, Forecaster, Strategist, Analyst.** Auditor, Ops and Point & Say go on the roadmap slide *if time runs short*.

### Tier D: wow layer (pick; they demo best)
- Option 1: **Chat with data + target schema mapping**
- Option 2: **Point & Say + contract-to-data checking**
- Ingestion wow: **paste a messy public listings page, watch it become a table, clean with one click**

### Tier E: four deep differentiators (build deeply, show the rest on roadmap)
1. Forecast Accountability · 2. Value-at-Stake meter · 3. Red Team Agent with Safety Score · 4. Synthetic Twin

### Ingestion build priority
File upload → URL scraping (tables and simple pages) → **one** database connector. Everything else (MCP connectors, API/webhook, email-in, watched folders, scheduled re-scrape) goes on the roadmap slide.

### Roadmap slide only
Ops autopilot and scheduling, API/webhooks, enrichment, team roles at scale, Plain-English Governance, Data Time Machine, Drift Sentinel, Money Leak Finder, KPI Truth Layer, Impact Tracker, DPDP Act and SOC 2.

> **Rule:** a finished core with 2 polished extras beats 15 half-working features.

## 8. Demo Time Ratio (stay aligned with #11)

| Share | Content |
|-------|---------|
| ~50% | #11 core: upload → plan → clean → diff → download |
| ~30% | Trust and privacy: score, passport, risk grid, privacy dashboard |
| ~20% | Prediction and advice, framed as "step two" |

Framing line: **"Cleaning is step one. Once data is trusted, we predict, advise and protect it."**

*Why the ratio:* not every feature maps to #11. Synthetic Twin, Drift Sentinel, KPI Truth Layer, Time Machine, Agent Replay, Money Leak Finder and Value-at-Stake are directly or closely #11. Governance, Red Team and Contract-to-Data are the privacy/audit layer. **Forecast Accountability, Impact Tracker and Predict & Advise are new territory**, and judges could read them as off-brief if they dominate the demo.

## 9. Decision Log (corrections made along the way)

| Topic | Earlier idea | Final decision |
|-------|--------------|----------------|
| Scope | Spreadsheet cleaner | Any data via ingestion layer + MCP |
| Vector DB | Postgres pgvector | **Qdrant (cloud) + Chroma (local)** behind one `VectorStore` interface |
| Qdrant tenancy | Separate collection per company with scoped keys | **One collection + `tenant_id` payload index** (efficient on free tier); per-company collections kept as enterprise option |
| Job queue | Celery + Redis | **Arq workers** + Upstash Redis |
| Frontend host | Vercel free tier | **Cloudflare Pages** (Vercel free tier is non-commercial) |
| File storage | Cloudflare R2 | **Dropped** (needs a payment method). Use Supabase Storage, HF dataset repo, GitHub (small), local/MinIO via `StorageAdapter` |
| Backend host | Oracle Always Free ARM VM | **Verify**: often asks for a card. Fallbacks: Hugging Face Spaces, Render free tier |
| LLM privacy | Gemini free tier for everything | Free-tier prompts may be used for training, so **only masked/synthetic data to cloud LLMs**; real data on Ollama |
| Graph | None | **Neo4j AuraDB Free** for lineage and dedupe |
| Forecasting | LLM predictions | **Prophet/statsforecast**; LLM only explains |
| Security claim | "Safe" | **"Verifiable controls"**; nobody can prove absolute safety |

## 10. Honest Constraints

- Free tiers have rate limits and can change; verify current terms before launch.
- Free databases pause: Qdrant after ~7 days idle; Neo4j also pauses (sources conflict: ~72 h vs one week) and deletes after ~30 days paused. Add a GitHub Actions keep-alive and check the day before the demo.
- Not re-verified: Oracle card requirement, Supabase/Neon/Upstash/Cloudflare Pages card requirements, Hugging Face limits.
- Free LLM limits are tight (Google restricted its free tier to Flash models in April 2026). Cache and route across providers.
- I can't verify that none of these ideas exist anywhere; some exist in pieces. The unified combination is the edge.

## 11. Roadmap Phases

| Phase | Goal | Deliverables |
|-------|------|--------------|
| 0 | Prep | Demo data generator, repo, accounts signed up early, keep-alive |
| 1 | #11 core | Upload, profile, plan, approve, execute, score, diff, download, recipe |
| 2 | Crew + ingestion | Supervisor, Cleaner, Analyst, Forecaster, Strategist; URL scraping; one DB connector |
| 3 | Trust | Risk grid, Data Passport, privacy dashboard, ledger |
| 4 | Wow + deep | Chosen wow option; Forecast Accountability, Value-at-Stake, Red Team, Synthetic Twin |
| 5 | Post-hackathon | MCP connectors, Ops autopilot, scheduling, API/webhooks, workspaces at scale, DPDP/SOC 2 |



---
