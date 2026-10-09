# DATACREW: MASTER BUILD PROMPT

> **How to use:** give this entire file to Claude (Claude Code or a chat with code execution) as the prompt. Everything below is the full specification. Part 0 tells Claude *how to build*. Parts 1 to 14 are the spec. Part 15 is the output contract.

---

# PART 0: BUILDER INSTRUCTIONS (READ FIRST, OBEY STRICTLY)

## 0.1 Your role and mission
You are a senior full-stack + data/AI engineer. **Build the DataCrew system described in this document, as completely as you can, as working code, not as plans.** If you cannot finish everything in one session, build as much as possible in priority order, keep the repo always runnable, and write down exactly what is left.

## 0.2 Non-negotiable rules
1. **Build real code.** Do not reply with only a plan or description. Create files, run them, test them.
2. **Priority order wins.** Follow the build order in Part 0.5. Finish and test each tier before starting the next. A finished core beats many half-working features.
3. **Latest decisions win.** If two parts of the spec conflict, use the Decision Log (Part 1, section 9) and the stack corrections (Part 9).
4. **Always runnable.** After every milestone the project must start with one command and the tests must pass. Never leave the repo broken.
5. **Offline-first / no-keys-first.** The system must run **without any paid or card-required account**. Every external service sits behind an adapter with a **local fallback** (see 0.4). Real cloud services are optional configuration, never required for the demo.
6. **No fake claims.** Do not stub something and call it done. Mark stubs clearly in code (`# STUB:`) and list them in `REMAINING.md`. Never claim "100% secure"; the product claim is "verifiable controls".
7. **Synthetic data only.** All demo personal data must be generated (Faker). Never use real people's data.
8. **LLM plans, engine executes.** The LLM only sees a masked **sample** and returns a JSON plan validated against a schema. Deterministic code (Polars/DuckDB/Pandas) executes on the full data. LLMs never do forecasting math, never execute SQL themselves, never write without approval.
9. **Deterministic health score.** No LLM in scoring.
10. **Human approval gates** before executing plans, writes, deletions, outbound notifications.
11. **Security basics:** tenant isolation in code, SQL SELECT-only guard, read-only DB creds, CSV-injection-safe exports, secrets only from env, no secrets in the repo.
12. **Be honest in reports.** `STATUS.md` and `REMAINING.md` must reflect reality, including failing tests and unverified assumptions.

## 0.3 Working method
- Work in **milestones** (below). After each: run tests, run the app, fix, then commit (`git init` at the start; one commit per milestone with message `vX.Y: ...`).
- Maintain these living files in the repo root, updating them at every milestone:
  - `README.md`: how to install and run (copy-paste commands), architecture summary
  - `STATUS.md`: what is built, per module, with version and test status
  - `REMAINING.md`: what is not built, partially built, or stubbed, ordered by priority, each with a short "how to finish it" note
  - `CHANGELOG.md`: version history
  - `.env.example`: every env var with comments
  - `docs/`: copy the spec parts as separate `.md` files
- If you hit a limit (time, context, tool failure), **stop cleanly**: make the repo runnable, update `STATUS.md` and `REMAINING.md`, produce the zip, and report. Do not start a half-feature you cannot finish.
- Prefer small, tested modules over large untested ones. Write tests for: step executors, health score determinism, plan schema validation, SQL guard, PII masking, ledger hash chain, passport hash verify, tenant isolation.

## 0.4 Adapters and local fallbacks (so it runs anywhere)
Implement these interfaces and **at least the local implementation**; add cloud implementations if time allows.

| Interface | Local / default implementation | Optional cloud implementation |
|-----------|-------------------------------|-------------------------------|
| `LLMRouter` | **Mock/rule-based planner** (heuristics that produce valid plans so the app works with no key) + Ollama if available | Groq, Gemini Flash, OpenRouter via LiteLLM |
| `StorageAdapter` | Local disk (`./data/storage`) | Supabase Storage, HF dataset repo, GitHub (small files) |
| `VectorStore` | Chroma embedded (or in-memory numpy/fastembed fallback) | Qdrant Cloud |
| Relational DB | **SQLite** by default, Postgres via `DATABASE_URL` | Supabase / Neon |
| Graph | **NetworkX in-process** lineage graph with JSON persistence | Neo4j AuraDB |
| Queue | In-process background tasks (FastAPI BackgroundTasks / asyncio) | Arq + Redis (Upstash) |
| `Notifier` | Console + file log | Email, Slack webhook |
| Auth | Simple local JWT auth (email + password) with workspaces and roles | Supabase Auth |
| Embeddings | `fastembed` bge-small (or hashing-trick fallback) | Qdrant inference |
| PII masking | Presidio if installable, else regex recognizers (email, phone, Aadhaar-like, PAN) | n/a |

Mode switch via env: `MODE=cloud|byo|local`. The privacy dashboard must report `bytes_sent_external` honestly (0 in local mode).

## 0.5 Build order (strict) and versions

| Version | Milestone | Must contain |
|---------|-----------|--------------|
| **v0.1** | Skeleton | Monorepo, FastAPI app, Next.js app (or a single-page web UI if Next.js is not feasible), config, adapters stubs, auth, workspaces, roles, SQLite models, health endpoint, one-command run (`docker compose up` or `make dev`), demo data generator `scripts/demo_data/make_dirty.py` (seeded, reproducible ~42 score) |
| **v0.2** | #11 core engine | Upload (CSV/XLSX/JSON, chunked-friendly), Parquet conversion, profiling, classification (heuristic + LLM adapter), **health score**, step executors (all step types in Part 3/13), execute on full data, versions/undo, diff, export CSV/XLSX/Parquet, **recipe export (Python/SQL/JSON)** |
| **v0.3** | Plan + UI hero | Plan generation (LLM adapter + rule-based fallback), JSON schema validation with retry then fallback, toggle list, preview, execute job with progress, diff view, score gauge 42 → ~94, per-step undo |
| **v0.4** | Trust | PII masking before any LLM call, audit log, privacy ledger (hash chain + verify), tenant isolation tests, risk grid (PII, outliers, rules), plain-English validation rules, **Data Passport** (JSON + page + hash verify), privacy dashboard |
| **v0.5** | Crew core | LangGraph (or equivalent state machine) **Supervisor → Cleaner → Analyst → Forecaster → Strategist**; Intake classification; Analyst text-to-SQL with SELECT-only guard, chart spec, SQL shown, source rows; Forecaster with statsforecast/Prophet (fallback to a simple seasonal-naive/ETS model) with confidence ranges; Strategist ranked value list with ₹ estimate + evidence rows + what-if simulator + CEO brief; approval gates; Agent Replay timeline |
| **v0.6** | Ingestion | URL scraping (robots.txt check, table/list/card detection, LLM-or-heuristic schema inference, rate limit, PII flag, Source Passport) and **one database connector** (Postgres/SQLite read-only) |
| **v0.7** | Wow layer | Pick **one** and finish it: (A) chat-to-clean + target schema mapping, or (B) Point & Say (MediaPipe browser hand tracking + voice) + contract-to-data check. Build (A) first if you must choose. |
| **v0.8** | Deep four | Forecast Accountability (log, score vs actuals, track record), Value-at-Stake meter with editable assumptions, Red Team Agent + Safety Score (prompt-injection, cross-tenant, PII-leak probes against a test tenant), Synthetic Twin (SDV if installable, else statistical resampling with distribution comparison) |
| **v0.9** | Fuzzy dedupe + graph | Splink/rapidfuzz fuzzy dedupe, graph clusters (connected components), side-by-side merge review UI, lineage graph visualization, Neo4j adapter optional |
| **v1.0** | Polish + ship | Fakes removed or listed, test suite green, README accurate, demo script runnable end to end, final `STATUS.md`, `REMAINING.md`, `CHANGELOG.md`, zip |

**Roadmap items (do NOT build unless everything above is done):** MCP business connectors (Sheets/Drive/Gmail/Stripe/HubSpot/Tally), API+webhook ingest, email-in, watched folders, scheduled re-scrape, Ops autopilot and scheduling, auto-enrichment, Plain-English Governance, Data Time Machine, Drift Sentinel, Money Leak Finder, KPI Truth Layer, Impact Tracker, billing/usage metering, DPDP/SOC 2. Document each in `REMAINING.md` with a design note.

## 0.6 Quality bar
- Core flow works end to end on the demo dataset: **upload dirty file → score ~42 → plan → toggle → apply → score ~94 → diff → download → recipe reruns to the same output.**
- Every API listed for built features exists and is tested at least by one happy-path test.
- UI: clean, responsive, before/after visible, nothing silent, red/amber/green reserved for risk semantics.
- Code: typed (Python type hints, TypeScript), formatted, lint-clean where tooling is available, modules match the layout in Part 5 and Part 12.

## 0.7 What to do when something cannot be built
Do not silently skip. Add an entry to `REMAINING.md`:
`- [Priority] Feature name: what exists, what is missing, why (limit/credentials/time), exact steps to finish.`

## 0.8 Final deliverables (see Part 15 for the exact format)
1. Working repo `datacrew/` with the structure in Part 12.
2. `STATUS.md`, `REMAINING.md`, `CHANGELOG.md`, `README.md`, `.env.example`, `docs/`.
3. `datacrew.zip` containing the whole project (excluding `node_modules`, `.venv`, `data/` runtime files, `.git` optional).
4. A short final message: version reached, how to run, what works, what is left, known risks.

---

# HOW THE SPEC BELOW IS ORGANIZED

| Part | Content |
|------|---------|
| 1 | Project overview, scope tiers, decision log |
| 2 | Non-technical: story, personas, business, risks |
| 3 | Technical architecture |
| 4 | Frontend |
| 5 | Backend |
| 6 | Database and storage |
| 7 | AI / LLM |
| 8 | Features and modules |
| 9 | Tech stack and services (with corrections) |
| 10 | User flows, inputs/outputs, demo scripts |
| 11 | Marketing and pitch |
| 12 | Build plan and repo skeleton |
| 13 | Schemas and contracts |
| 14 | Index/README |
| 15 | Output contract |

Where a part says "roadmap" or "R", it is not required for v1.0. Where it says "free tier" or names a cloud service, treat it as an **optional** adapter; the local fallback in 0.4 is the default.

---


---

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

# PART 2: NON TECHNICAL

## 02 · Non-Technical Document

> DataCrew is an **autonomous AI data team**: connect *any* data (files, databases, business apps, web pages) and agents clean, watch, predict and advise. Spreadsheets are the entry point, not the limit.

## 1. The Story (use this when pitching)

It's month-end in a small company. **Priya**, in finance, opens the sales sheet that three people have edited for a year.

- Dates are written five different ways.
- "Hyderabad" is also "Hyd" and "hyderabad ".
- Half the customers appear twice.
- Someone typed salaries into the phone column.

She spends two days fixing it by hand and still isn't sure it's right. Then the boss asks, **"Can we trust this number?"** She can't answer.

## 2. The Real Problem

- Every business runs on data, and almost none of it is trustworthy: spreadsheets, exports, CRM dumps, databases, scraped web listings.
- Data is **scattered** across files, databases and SaaS tools (Sheets, Stripe, HubSpot, Tally, Gmail), each with its own mess.
- Analysts spend most of their time cleaning data instead of using it.
- Bad data quietly causes wrong invoices, wrong forecasts and wrong decisions.
- Nobody can **prove** what changed or why.
- Forecasts and insights are only as good as the data under them, yet most tools skip cleaning.
- Existing tools clean data *or* chart it *or* chat with it, but don't build trust, and the people who most need help can't write code.
- "Chat with your data" tools often ship everything to a cloud LLM, which many companies cannot accept.
- Scraped and imported data is the messiest of all and rarely has a record of where it came from.

## 3. Our Solution (plain English)

DataCrew is an **autonomous AI data team**. You connect any data, and a crew of agents does the work while you stay in control.

1. **Connect or upload any data:** files (CSV, Excel, PDF, JSON, photo of a table), a pasted URL, a database, or business tools. It's auto-classified (payroll, invoices, sales) and given a health score (say 42/100).
2. **Clean (human-approved):** the AI reads what each column means and proposes fixes. You approve or reject each one. Nothing changes silently.
3. **Audit:** a red/amber/green risk grid flags exposed personal data, outliers and broken rules. Upload a contract and your data is checked against it.
4. **Ask:** "Which region has the most overdue payments?" The answer comes with a chart, the query used and the exact rows as proof.
5. **Predict:** forecasts of revenue, churn, stock-outs and cash flow, with confidence ranges.
6. **Advise (main feature):** a ranked "what will add value" list with evidence, a what-if simulator and a weekly CEO brief.
7. **Automate:** agents run on schedule and send alerts to email or Slack.
8. **Certify:** every dataset gets a **Data Passport** (before/after score, every change, risks resolved, source and lineage).
9. **Prove privacy:** a live dashboard shows what was masked, which model saw what, and "0 bytes sent externally" in local mode.

### The main feature: Predict and Advise (non-technical view)
Think of a data analyst who never sleeps. Example outputs:
- *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* (with the exact customer rows as evidence)
- *"Revenue will likely dip in March (range ₹A to ₹B). Here is why."*
- *"What if we raise prices 5%?"* answered by a simulator, not a guess.
- A **weekly CEO brief** in the inbox.
The system also **grades its own past predictions**, so people learn how much to trust it.

### The honest framing for #11
Cleaning is step one. Once data is trusted, we predict, advise and protect it.

## 4. Target Users (personas)

| Persona | Role | Pain | What they get |
|---------|------|------|---------------|
| **Priya** | Finance exec at an SME | Hand-fixing month-end sheets, can't prove accuracy | One-click cleaning plus a Passport to show her boss |
| **Arjun** | Data analyst | 60-80% of time spent cleaning | Reusable recipes, Python/SQL export |
| **Meera** | Operations manager | Many sheets from many people | Auto-classification and routing |
| **Rahul** | Founder / CEO | Doesn't trust numbers; data lives in many tools | Connected sources, weekly CEO brief, forecasts, ranked value opportunities |
| **Sana** | Compliance / IT lead | Fear of data leaving the company | Local mode, privacy dashboard, audit ledger |

## 5. Target Market

- Indian SMEs and startups first (Tally, Excel, GST/invoice-heavy workflows, Hindi/regional city-name variants).
- Finance, HR, sales-ops, retail, logistics teams.
- Agencies and consultants who receive messy client data.
- Later: mid-market and regulated sectors needing DPDP/SOC 2.

## 6. Business Model (proposal) and SaaS Foundations

| Tier | Audience | Includes |
|------|----------|----------|
| Free | Individuals, demo | Limited rows/files per month, cloud mode with masking |
| Pro | Small teams | More rows, recipes, chat with data, forecasts, Data Passport sharing |
| Team | Companies | Workspaces, roles, audit log, scheduled runs, connectors, notifications (email, Slack) |
| Enterprise / Private | Regulated | Local-model mode, BYO key, SSO, per-company encryption keys, compliance reports |

Pricing is **usage-based** (rows processed, agent runs, connectors, forecasts). Final numbers are TBD.

**What makes it a real SaaS:** multi-tenant workspaces, roles and an audit log; background jobs and scheduled runs; human approval before agents change anything; email and Slack notifications; usage metering and tiers; the Data Passport for every dataset; API and webhooks.

## 7. Why Customers Stay (the honest way)

- Saved **cleaning recipes** and agent memory of how their data works
- A knowledge base of their business context and KPI definitions
- **Data Passport** history and the audit trail
- **Weekly CEO briefs** and alerts people start relying on
- Connected sources and scheduled runs that keep working in the background
- A forecast accuracy track record that builds credibility over time

## 8. Success Metrics

| Metric | Meaning |
|--------|---------|
| Health score lift | Average before → after (target demo: 42 → ~94) |
| Time to clean | Minutes from upload to download |
| Plan acceptance rate | % of AI suggestions the user approves (quality signal) |
| Recipe reuse rate | Retention signal |
| Forecast accuracy track record | Credibility signal (if built) |
| Value-at-Stake resolved | ₹ of data problems fixed |
| Connected sources per workspace | Platform stickiness |
| Privacy incidents | Target: zero; ledger proves it |

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Judges see it as off-brief (too much forecasting) | Lead with #11, 50/30/20 demo ratio |
| Free-tier DB pauses before demo | GitHub Actions keep-alive; check the day before |
| Free LLM rate limits | Caching, semantic cache, provider failover (LiteLLM) |
| Gemini free tier may use prompts for training | Send only masked/synthetic data to cloud LLMs; real data stays on Ollama |
| Over-promising security | Say "verifiable controls", never "100% safe" |
| Scraping legality | Respect robots.txt/ToS, no logins/paywalls, flag PII |
| LLM mistakes in cleaning | Human approval, undo, versioning |
| Prompt injection in uploaded files | Sandboxed agents, read-only creds, approval before writes |
| Demo network failure | Offline backup mode, pre-cleaned fallback files |
| Scope creep | Strict priority tiers (files 01 and 08) |
| Demo too heavy on prediction | 50/30/20 ratio; prediction shown as step two |
| Scraped data legality | robots.txt/ToS respected, no logins/paywalls, Source Passport |
| Free-tier privacy mismatch | Masked/synthetic data to cloud LLMs; real data on Ollama |

## 10. Legal, Ethical and Compliance Notes

- **Use only fake personal data** in demos (Faker); a privacy product demoed on real people would undercut the pitch.
- **Check each dataset's license** and credit sources on a slide.
- **Scraping:** respect robots.txt and terms of service; skip logins and paywalled content; mask PII by default; keep a Source Passport.
- **Compliance roadmap:** DPDP Act (India), then SOC 2. Listed as *next steps*, not current claims.
- Do not claim certifications you don't hold.

## 11. Team and Process Suggestions

| Role | Focus |
|------|-------|
| Full-stack lead | Next.js UI, FastAPI endpoints |
| Data/AI engineer | Cleaning engine, LLM plan, dedupe, forecasting |
| Infra/security | Privacy layer, storage, deployment |
| Pitch/design | Demo script, slides, branding |

Solo builders: follow the must-have list only, then add one wow feature.

## 12. Pre-Demo Checklist

- [ ] Fake demo company dataset generated, with known health score (~42)
- [ ] Rehearsed until score reaches ~94 every time
- [ ] Backup "before" and "after" files ready
- [ ] Offline/local mode tested
- [ ] All free-tier accounts created early and keep-alive running
- [ ] Qdrant and Neo4j confirmed awake the day before
- [ ] Dataset licenses credited on a slide
- [ ] Roadmap slide ready for unbuilt features



---

# PART 3: TECHNICAL

## 03 · Technical Document

> Scope: **any data source** (files, URLs, databases, MCP business connectors, APIs) flows through one pipeline, coordinated by a LangGraph agent crew.

## 1. Architecture at a Glance

```
┌──────────────────────────── Frontend (Next.js, Cloudflare Pages) ────────────────────────────┐
│ Sources hub · Plan review · Diff · Risk grid · Passport · Chat · Forecast · Strategy · Privacy │
└───────────────┬───────────────────────────────────────────────────────────────────────────────┘
                │ HTTPS (REST + SSE/WebSocket for progress)
┌───────────────▼──────────────── API Layer (FastAPI) ───────────────────────────────────────────┐
│ Auth · Tenant guard · Upload (tus) · Plan/Execute · Chat · Passport · Privacy · Webhooks       │
└───┬───────────────┬──────────────────┬─────────────────┬──────────────────┬───────────────────┘
    │               │                  │                 │                  │
┌───▼─────────┐ ┌───▼────────────┐ ┌───▼──────────┐ ┌────▼─────────┐ ┌──────▼───────┐
│ INGESTION   │ │ Agent crew     │ │ Privacy      │ │ LLM Router   │ │ Job queue    │
│ files, URL  │ │ LangGraph      │ │ Presidio,    │ │ LiteLLM:     │ │ Arq + Redis  │
│ DB, MCP,    │ │ Supervisor +   │ │ crypto,      │ │ Groq/Gemini/ │ │ schedules,   │
│ API, email, │ │ Intake Cleaner │ │ ledger,      │ │ OpenRouter/  │ │ notifier     │
│ watched dir │ │ Auditor Analyst│ │ red team     │ │ Ollama       │ │ (email/Slack)│
└───┬─────────┘ │ Forecaster     │ └──────┬───────┘ └──────────────┘ └──────────────┘
    │           │ Strategist Ops │        │
    │           └───┬────────────┘        │
┌───▼───────────────▼─────┐               │
│ Data engine             │               │
│ DuckDB · Polars · Pandas│               │
│ Splink · rapidfuzz      │               │
│ Pandera · Prophet/stats │               │
└───┬─────────────────────┘               │
┌───▼───────┐ ┌──────────┐ ┌──────────────▼┐ ┌───────────┐ ┌────────────┐
│ Postgres  │ │ Neo4j    │ │ Qdrant /      │ │ Storage   │ │ Redis      │
│ + RLS     │ │ lineage  │ │ Chroma        │ │ Adapter   │ │ (Upstash)  │
└───────────┘ └──────────┘ └───────────────┘ └───────────┘ └────────────┘
```

## 2. The Key Design Rule

> **The LLM only sees a *sample* and produces a *transformation plan* (JSON). Pandas/Polars/DuckDB executes that plan on the *full* file.**

Benefits: fast, cheap, scalable to millions of rows, deterministic, auditable, and the LLM never needs the full dataset.

## 3. Core Processing Pipeline

1. **Ingest:** any source (file, URL scrape, database, MCP connector, API/webhook, email-in, watched folder) → raw object stored → converted to **Parquet** working format. A **Source Passport** records origin (URL/connector, timestamp, what was collected).
2. **Profile:** per-column stats (type, nulls, uniques, patterns, min/max, outliers) via DuckDB/Polars.
3. **Intake agent classifies:** dataset type (payroll, invoices, sales, inventory), tags, summary, routing suggestion.
4. **Mask:** Presidio replaces PII with tokens in the sample **before** any cloud LLM call.
5. **Plan:** Cleaner agent asks the LLM for a JSON-schema-validated list of cleaning steps.
6. **Review:** user toggles each step; preview shows diff on a sample.
7. **Execute:** engine runs approved steps on the **full** dataset as a background job with progress.
8. **Score:** health score recomputed, per column.
9. **Audit:** Auditor agent runs risk scan (PII, outliers, rules, contract checks).
10. **Record:** every step logged to lineage graph, audit log and privacy ledger; Data Passport generated.
11. **Use:** Analyst (chat), Forecaster (predict), Strategist (advise), Ops (schedule/alert).
12. **Export:** clean data + Python/SQL recipe + PDF quality report.

## 4. Ingestion Layer (any source in, one clean pipeline)

| Source | Method | Notes |
|--------|--------|-------|
| Files | CSV, Excel (multi-sheet, merged cells), JSON, PDF tables, image-of-table OCR | tus resumable uploads |
| URL | Paste a link; agent finds tables, lists and repeated cards; LLM infers JSON schema for hard pages ("product name, price, rating") | Playwright for JS pages; BeautifulSoup/Trafilatura for simple; Crawl4AI |
| Databases | Postgres, MySQL, MongoDB | **Read-only credentials** |
| Business tools via **MCP connectors** | Google Sheets, Drive, Gmail attachments, Stripe, HubSpot, Tally | MCP servers; scoped OAuth |
| REST API and webhook | Other apps push messy data in and pull clean data out | API keys per workspace |
| Email-in | Forward a file to a dedicated address | roadmap |
| Watched folders | Drive/S3 folder monitored; new files processed automatically | roadmap |
| Scheduled re-scrape | Revisit a URL daily, track changes (price drops, new listings) | roadmap |

**Connector contract:** every source implements `discover() → schema`, `sample(n)`, `read(chunk)` and `provenance()`. Output always lands as Parquet plus a Source Passport, so downstream code is source-agnostic.

**Responsible scraping:** respect robots.txt and ToS; no logins or paywalled content; flag and mask personal data by default; per-domain rate limiting.

**Huge data:**
- Chunked, resumable uploads (tus).
- Stream, don't load into memory; DuckDB/Polars handle millions of rows on a small free VM.
- Sample-then-apply: the LLM reads a sample; the engine runs on all rows.
- Background workers with live progress.
- Parquet working format; free storage via `StorageAdapter`.

**Build priority:** file upload → URL scraping for tables and simple pages → **one** database connector. Everything else is roadmap.

## 5. Agent Orchestration (LangGraph)

- A **supervisor** routes tasks to specialists: Intake, Cleaner, Auditor, Forecaster, Strategist, Analyst, Ops.
- **Human approval gates** (LangGraph interrupts) before executing a plan, writing to external systems, deleting data or sending notifications.
- **Agent Replay:** every node's inputs, outputs and tool calls are stored and shown as a timeline with approve/reject at each step.
- **Build order:** Supervisor → Cleaner → Analyst → Forecaster → Strategist; Auditor, Ops and Point & Say go on the roadmap if time runs short.
- Agents have scoped tools only; none can execute arbitrary code or write without approval.

## 6. Cleaning Step Types (the plan vocabulary)

| Step type | Example | Executor |
|-----------|---------|----------|
| `drop_duplicates` | exact duplicate rows | Polars/DuckDB |
| `fuzzy_dedupe` | "Ravi Kumar" vs "Kumar, Ravi" | Splink + rapidfuzz + graph clusters |
| `fill_missing` | median/mode/constant/ffill | Polars |
| `standardize_dates` | 5 formats → ISO 8601 | Polars/dateutil |
| `normalize_values` | "Hyd", "hyderabad " → "Hyderabad" | mapping dict + vector snap |
| `normalize_phone` | 10-digit Indian format | regex |
| `rename_columns` | "ph no" → "phone" | mapping |
| `split_column` | Name → first/last | regex |
| `merge_columns` | combine fields | Polars |
| `cast_type` | string → numeric | Polars |
| `remove_rows` | "test" entries | filter expression |
| `flag_outliers` | IQR / z-score | stats |
| `restructure_to_schema` | map to target template | mapping plan |
| `validate_rule` | "age between 18 and 60" | Pandera check |

Each step has: `id`, `type`, `columns`, `params`, `rationale`, `confidence`, `risk_level`, `affected_rows_estimate`, `reversible`.

## 7. Data Health Score (0 to 100)

Computed per column and rolled up. Suggested weights (tunable):

| Dimension | Weight | Measured by |
|-----------|--------|-------------|
| Completeness | 25 | % non-null |
| Uniqueness | 20 | duplicate rate on key fields |
| Consistency | 20 | format/value variants per column |
| Validity | 20 | type/rule/range violations |
| Outlier/anomaly | 10 | extreme values |
| PII exposure | 5 | unmasked sensitive columns |

Must be **deterministic** (no LLM) so before/after is trustworthy and repeatable.

## 8. Large-File Strategy

- **Chunked, resumable uploads** (tus protocol).
- **Stream, don't load into memory:** DuckDB/Polars lazy scans.
- **Sample-then-apply:** LLM reads sample only.
- **Background workers** with live progress (SSE/WebSocket).
- **Parquet** working format; short retention on small free storage.

## 9. Dedupe and Record Linkage (graph-based)

1. Block records (cheap keys) to limit comparisons.
2. Score pairs with Splink and rapidfuzz.
3. Optionally add embedding similarity from vector store.
4. Pairs above threshold become **edges** in a graph.
5. **Connected components = duplicate clusters.**
6. Side-by-side merge review UI; user picks surviving values.
7. Lineage graph records merges.

## 10. Privacy and Security Architecture

| Control | Implementation |
|---------|----------------|
| PII masking before LLM | Microsoft Presidio with custom Indian recognizers (Aadhaar, PAN, phone); reversible token map stays server-side |
| Tenant isolation | Postgres row-level security; Qdrant `tenant_id` payload index with scoped keys; storage path prefixes |
| Per-company encryption | Envelope encryption: data key per company wrapped by master key; delete key = crypto-erase + deletion receipt |
| Client-side encryption for third-party storage | Encrypt before sending to GitHub/Hugging Face so they only hold ciphertext |
| Local-model mode | Ollama + Chroma + local disk: zero external egress |
| BYO API key | Company supplies own LLM key |
| Privacy Ledger | Hash-chained append-only log (each entry includes hash of previous) of every access by human or agent; exportable |
| Live Privacy Dashboard | Per dataset: which agent, which model, what masked, bytes sent externally |
| Agent sandboxing | Read-only DB credentials, network allowlist, human approval before writes |
| Prompt-injection defense | Treat file contents as data, never instructions; strip/flag instruction-like text; restrict tool permissions |
| Red Team Agent | Continuously probes injection, cross-tenant leaks, PII leakage; publishes Safety Score |
| Qdrant tenancy | One collection with `tenant_id` payload index (free-tier friendly); separate collection per company with scoped API key as enterprise option |
| Synthetic Twin | SDV-generated privacy-safe copy keeps statistics, no real people; share with vendors/interns |

> **Honesty rule:** claim "verifiable controls," not "absolute safety."

## 11. Chat With Your Data (Text-to-SQL, guarded)

- Schema + column descriptions + KPI definitions given to LLM (never raw rows unless masked).
- Generated SQL parsed and validated: **SELECT only**, allowlisted tables, row limit, timeout.
- Executes on DuckDB or read-only replica.
- Response: answer + chart spec + SQL/Pandas code + source rows (row IDs).
- Semantic cache avoids repeated LLM calls.

## 12. Predict and Advise Engine (main feature)

**Forecaster (statistics, not LLM)**
- **Prophet or statsforecast** for revenue, churn, stock-outs and cash flow, with **confidence intervals**.
- Backtesting with error metrics (MAPE/sMAPE).
- **Forecast Accountability:** every prediction is stored with a timestamp; when actuals arrive, error is computed and a track record is shown, including misses.
- LLMs are unreliable at predicting numbers, so the LLM only explains results.

**Strategist (advice)**
- Ranked **"What will add value"** list: each item has a ₹ estimate (Value-at-Stake meter with visible assumptions) and **evidence rows**.
- Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."*
- **What-if simulator** ("raise prices 5%") using a scenario/elasticity model; LLM explains.
- **Weekly CEO brief** compiled from computed metrics.
- **Impact Tracker** (roadmap): insight → task with owner → measured outcome.

**Analyst (chat with your database)**
- Text-to-SQL in **read-only** mode with guardrails; every answer includes a chart, the query used and the source rows.

## 13. SaaS Platform Services

- **Multi-tenant workspaces** with roles (Admin/Editor/Viewer) and an audit log.
- **Scheduling:** cron-style runs through Arq; watched folders and re-scrapes (roadmap).
- **Notifications:** email and Slack via a `Notifier` adapter.
- **Usage metering:** rows processed, agent runs, connectors, forecasts → pricing tiers.
- **API keys and webhooks** per workspace.

## 14. Observability

| Need | Tool |
|------|------|
| Agent/LLM tracing | Langfuse |
| Errors | Sentry |
| Metrics | Grafana Cloud free |
| CI | GitHub Actions |
| Keep-alive pings | GitHub Actions cron |

## 15. Reliability and Fallbacks

- LLM failover via LiteLLM: Groq → Gemini Flash → OpenRouter free → Ollama.
- Semantic cache and result cache.
- Queue rate limiting.
- Keep-alive for pausing free databases (Qdrant pauses after ~7 days idle; Neo4j reports vary, verify).
- Offline demo mode with pre-baked outputs.

## 16. Non-Functional Targets

| Attribute | Target |
|-----------|--------|
| Plan generation | < 10 s for typical file sample |
| 100k-row execution | < 30 s |
| 1M+ rows | background job with progress |
| Undo | every step reversible via version snapshot |
| Determinism | same recipe + same file = same output |

## 17. Testing Strategy

- Unit tests per step executor with golden files.
- Synthetic corrupted dataset with **known** injected defects and expected score; regression test the 42 → ~94 outcome.
- LLM plan schema validation tests (reject malformed plans).
- Security tests: cross-tenant access, SQL guard bypass, prompt injection fixtures.
- Load test with a 1M-row file.



---

# PART 4: FRONTEND

## 04 · Frontend Document

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



---

# PART 5: BACKEND

## 05 · Backend Document

> The backend ingests **any source**, runs a LangGraph crew, and serves clean data, answers, forecasts and advice with approval gates and a verifiable privacy layer.

## 1. Stack

FastAPI (Python 3.11+), Pydantic v2, LangGraph + LangChain, **MCP servers/clients** (connectors), LiteLLM (router), **Arq + Redis** (jobs; Celery was the first idea, Arq is the final choice), DuckDB, Polars, Pandas, Splink, rapidfuzz, Pandera, Presidio, Prophet/statsforecast, Playwright/Crawl4AI/Trafilatura, MCP servers.

## 2. Service Layout (modular monolith first)

```
backend/
  app/
    main.py
    core/            config, security, tenancy, logging
    api/             routers (REST)
    services/
      ingest/        upload, tus, url scrape, db + MCP connectors, webhook, email-in, watchers
      connectors/    MCP client, DB readers (Postgres first), credential vault
      strategy/      value-at-stake, what-if, CEO brief, impact tracker
      notify/        email + Slack Notifier adapter
      billing/       usage metering, plan limits
      scheduler/     cron-style runs, watched folders
      profile/       column profiling, classification
      plan/          LLM plan generation + validation
      engine/        step executors, scoring
      dedupe/        blocking, scoring, clustering
      risk/          PII, outliers, rules, contract checks
      chat/          text-to-SQL, charts, source rows
      forecast/      models, accountability
      passport/      generation, hashing, verification
      privacy/       masking, crypto, ledger, red team
      storage/       StorageAdapter implementations
      llm/           router, prompts, cache
      graph/         Neo4j lineage
      vector/        VectorStore interface (Qdrant/Chroma)
    agents/          LangGraph supervisor + specialists
    workers/         Arq tasks
  tests/
```

Split into microservices only after the hackathon.

## 3. Multi-Tenancy

- Every request resolves `tenant_id` from JWT (Supabase auth).
- Middleware injects tenant into DB session (`SET app.tenant_id`) so Postgres RLS enforces isolation.
- Storage paths prefixed `tenant/{id}/...`.
- Qdrant filter always includes `tenant_id`.
- Neo4j nodes carry `tenant_id`; queries are parameterized and scoped.

## 4. Roles and Permissions

| Role | Rights |
|------|--------|
| Admin | Everything, members, keys, privacy mode, delete data |
| Editor | Upload, approve plans, run recipes, chat |
| Viewer | View datasets, passports, chat read-only |
| Agent (system) | Scoped tool access; writes need approval |

Plain-English Governance (roadmap): "interns see sales but never salary" compiles into column-level mask rules per role.

## 5. REST API (v1)

### Auth and workspace
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/*` | Via Supabase |
| GET/POST | `/workspaces` | List/create |
| GET/POST/PATCH | `/workspaces/{id}/members` | Roles |

### Ingest
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/uploads` (tus) | Resumable upload |
| POST | `/ingest/url` | Scrape URL to table |
| POST | `/ingest/connectors/{type}` | DB/app connector (roadmap) |
| POST | `/webhooks/ingest/{key}` | Push data in (roadmap) |

### Datasets
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/datasets` | List, filter by folder/tag |
| GET | `/datasets/{id}` | Metadata, class, score |
| GET | `/datasets/{id}/profile` | Column stats |
| GET | `/datasets/{id}/rows` | Windowed rows (virtual grid) |
| GET | `/datasets/{id}/versions` | Version history |
| POST | `/datasets/{id}/undo` | Revert to a version |
| DELETE | `/datasets/{id}` | Delete (crypto-erase receipt) |

### Cleaning
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/datasets/{id}/plan` | Generate AI plan |
| POST | `/datasets/{id}/plan/chat` | NL instruction to extra steps |
| PATCH | `/plans/{id}/steps/{sid}` | Toggle/edit step |
| POST | `/plans/{id}/preview` | Sample before/after |
| POST | `/plans/{id}/execute` | Run job |
| GET | `/jobs/{id}` (+ SSE) | Progress |
| GET | `/datasets/{id}/diff` | Before/after diff |
| GET | `/datasets/{id}/export?fmt=csv|xlsx|parquet` | Download |
| GET | `/plans/{id}/recipe?fmt=python|sql|json` | Recipe export |
| GET | `/datasets/{id}/report.pdf` | Data-quality report |

### Dedupe
`POST /datasets/{id}/dedupe/run`, `GET /dedupe/clusters`, `POST /dedupe/clusters/{cid}/resolve`.

### Schema mapping
`POST /datasets/{id}/schema-map` (upload template, returns suggested mapping), `POST /schema-map/{id}/apply`.

### Risk and rules
`POST /datasets/{id}/risk/scan`, `GET /datasets/{id}/risks`, `POST /datasets/{id}/rules` (plain-English rule → check), `POST /datasets/{id}/contract-check` (upload PDF).

### Chat / forecast
`POST /datasets/{id}/chat`, `POST /datasets/{id}/forecast`, `GET /forecasts/{id}/accuracy`, `POST /datasets/{id}/whatif`.

### Trust and privacy
`GET /datasets/{id}/passport`, `GET /public/passport/{publicId}`, `POST /passport/{id}/verify`, `GET /privacy/ledger`, `GET /privacy/flow/{datasetId}`, `GET /privacy/safety-score`, `POST /privacy/redteam/run`, `POST /datasets/{id}/synthetic-twin`.

### Recipes
`GET/POST /recipes`, `POST /recipes/{id}/apply/{datasetId}`.

## 6. Additional API Groups

### Sources and connectors
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/sources` | List connected sources and status |
| POST | `/sources/db` | Add database (read-only credentials) |
| POST | `/sources/mcp/{app}` | Connect Google Sheets, Drive, Gmail, Stripe, HubSpot, Tally via MCP (roadmap except pilots) |
| POST | `/sources/{id}/sync` | Pull new data |
| POST | `/sources/url` | Scrape URL; returns detected tables/cards and proposed schema |
| POST | `/sources/webhook-keys` | Create ingest key |
| POST | `/webhooks/ingest/{key}` | Push data in |
| GET | `/datasets/{id}/source-passport` | Origin, timestamp, what was collected |

### Crew and approvals
`GET /agents`, `GET /agent-runs?dataset=`, `GET /agent-runs/{id}/replay`, `GET /approvals`, `POST /approvals/{id}/approve|reject`.

### Strategy (Predict and Advise)
`POST /strategy/opportunities/run`, `GET /strategy/opportunities`, `POST /strategy/whatif`, `GET /briefs`, `POST /briefs/generate`, `POST /opportunities/{id}/task` (Impact Tracker, roadmap).

### Automations and notifications
`POST /automations` (NL instruction → workflow), `GET /automations`, `GET /automations/{id}/runs`, `POST /notifications/channels` (email/Slack), `GET /notifications`.

### Usage and billing
`GET /usage`, `GET /plan-limits`.

## 7. Agent Crew (LangGraph)

```
            ┌───────────── Supervisor ─────────────┐
            │ routes tasks, enforces approvals     │
   ┌────────┼────────┬─────────┬──────────┬────────┼─────────┐
 Intake  Cleaner  Auditor  Analyst  Forecaster  Strategist   Ops
```

| Agent | Responsibility | Tools | Writes? |
|-------|----------------|-------|---------|
| Intake | Classify source, tag, route, suggest masking, pick workflow | profiler, LLM, source passport | metadata only |
| Cleaner | Propose cleaning plan (humans approve) | profiler, plan schema | proposes; engine executes after approval |
| Auditor | PII, outliers, rules, contract-to-data checks | Presidio, Pandera, PDF parser | flags only |
| Analyst | Chat with your database: read-only text-to-SQL, charts, source rows | read-only DuckDB/DB | no |
| Forecaster | Revenue, churn, stock-out, cash-flow forecasts with confidence ranges | Prophet/statsforecast | stores predictions |
| **Strategist** | **Main feature: ranked value list, what-if, CEO brief** | forecasts, analyst, KPI memory | no |
| Ops | Scheduled runs, alerts, notifications | queue, notifier | requires approval |

**Build order (final):** Supervisor → **Cleaner → Analyst → Forecaster → Strategist**. Auditor, Ops and Point & Say go on the roadmap slide if time runs short.

**Agent Replay:** every node's input/output/tool calls are stored (Langfuse + DB) and rendered as a timeline with approve/reject at each gate.

## 8. Approval Gates (human-in-the-loop)

LangGraph interrupts before: executing any plan, writing to external systems, deleting data, sending notifications. Approval stored in audit log with user ID and timestamp.

## 9. Background Jobs (Arq)

| Job | Trigger |
|-----|---------|
| `ingest_source` / `sync_connector` | user, webhook, schedule |
| `scrape_url` | user/schedule (per-domain rate limit) |
| `profile_dataset` | after ingest |
| `classify_dataset` | after profile |
| `generate_plan` | after profile |
| `execute_plan` | user approval |
| `run_dedupe` | user/agent |
| `risk_scan` | after execute |
| `build_passport` | after execute |
| `forecast_run` | user/schedule |
| `score_past_forecasts` | nightly (accountability) |
| `generate_opportunities` | after forecast / weekly |
| `generate_ceo_brief` | weekly |
| `run_workflow` | schedule (Ops) |
| `send_notification` | event (email/Slack) |
| `redteam_run` | schedule |
| `track_usage` | per job |
| `keepalive_ping` | GitHub Actions cron (external) |

Rate limiting, retries with backoff, idempotent job keys, live progress via SSE.

## 10. MCP Connector Service

- Each business app is an **MCP server** the backend talks to as a client (Google Sheets, Drive, Gmail attachments, Stripe, HubSpot, Tally).
- Credentials stored encrypted per tenant; scopes minimal; tokens refreshed server-side.
- Databases use **read-only credentials** and a network allowlist.
- Every connector read is logged to the Privacy Ledger.
- Build priority: **one database connector** first; MCP connectors are roadmap with a single pilot if time allows.

## 11. Notifications, Scheduling and Usage

- **Notifier adapter:** email and Slack (webhook). Used for run results, risk alerts, CEO brief, approval requests.
- **Scheduler:** cron-style workflows created from natural language by the Ops agent (*"Every Monday, clean the sales sheet, flag anomalies, notify finance"*), each with reminders and a run-status record.
- **Usage metering:** rows processed, agent runs, connectors, forecasts → plan limits and usage-based pricing.
- **Human approval** before any agent write, deletion or outbound notification (configurable).

## 12. Scraping Service

1. Check `robots.txt` and ToS note; refuse if disallowed.
2. Simple pages: Trafilatura/BeautifulSoup; JS pages: Playwright; Crawl4AI for LLM-ready output.
3. Find tables, lists, repeated cards; LLM infers JSON schema for hard pages ("product name, price, rating").
4. Mask PII found; write **Source Passport** (URL, timestamp, what collected).
5. Queue with per-domain rate limits.
Safe practice targets: books.toscrape.com, quotes.toscrape.com, scrapethissite.com, Wikipedia tables.

## 13. Contract-to-Data Check

1. Parse PDF (pdfplumber/OCR fallback).
2. LLM extracts rules as structured JSON (e.g. `{field: "payment_days", op: "<=", value: 30}`).
3. User confirms rules.
4. Rules compiled to Pandera/SQL checks and run on dataset.
5. Violations appear red in risk grid with the clause quoted as evidence.

## 14. Error Handling

Standard error envelope `{code, message, hint, request_id}`. Plan validation failure → retry LLM once with error feedback, then fall back to rule-based suggestions. Partial execution failures roll back to previous version.

## 15. Audit Log and Privacy Ledger

- **Audit log** (Postgres): who/what/when/why for business actions.
- **Privacy Ledger**: append-only; each record = `hash(prev_hash + payload)`; verification endpoint walks the chain. Records every dataset access by humans and agents, LLM calls (model, masked field count, bytes out).

## 16. Configuration

Environment-driven: `MODE=cloud|byo|local`, `LLM_PROVIDERS`, `STORAGE_BACKEND`, `VECTOR_BACKEND`, `ENCRYPTION_MASTER_KEY`, etc. Same code path for all modes via adapters (`StorageAdapter`, `VectorStore`, `LLMRouter`).

## 17. Deployment

Dockerized API and worker. Host: Hugging Face Spaces, Render free tier (sleeps when idle), or Oracle Always Free ARM VM (verify card requirement). Cloudflare for HTTPS. CI via GitHub Actions.



---

# PART 6: DATABASE

## 06 · Database and Storage Document

> Stores support **any data source**: raw objects and Parquet for data, Postgres for metadata and governance, Neo4j for lineage, Qdrant/Chroma for vectors.

## 1. Data Stores and Roles

| Store | Product | Role |
|-------|---------|------|
| Relational | Postgres (Supabase or Neon) | Tenants, users, datasets metadata, plans, jobs, audit, ledger, passports, recipes, forecasts |
| Graph | Neo4j AuraDB Free | Lineage, dedupe clusters, relationships |
| Vector (cloud) | Qdrant Cloud Free (replaces the earlier pgvector idea; pgvector remains an optional fallback) | Semantic dedupe, value normalization, column matching, KPI memory, semantic cache |
| Vector (local) | Chroma (embedded) | Same roles in zero-egress private mode |
| Files | StorageAdapter (Supabase Storage / HF dataset repo / GitHub / local-MinIO) | Raw files, Parquet, exports |
| Cache/queue | Upstash Redis | Jobs, rate limits, caches |
| Analytical | DuckDB (in-process) | Query Parquet directly |

All vector access behind a **VectorStore** interface; all files behind a **StorageAdapter** interface.

## 2. Postgres Schema (core tables)

```sql
tenants(id, name, plan, mode, key_id, created_at)
users(id, tenant_id, email, role, created_at)
folders(id, tenant_id, parent_id, name)
datasets(id, tenant_id, folder_id, name, source_type, source_ref,
         classification, tags[], routing_suggestion, status,
         current_version_id, created_by, created_at)
dataset_versions(id, dataset_id, version_no, storage_key, format,
                 row_count, col_count, health_score, content_hash,
                 parent_version_id, created_by, created_at)
column_profiles(id, version_id, column_name, inferred_type, semantic_meaning,
                null_pct, unique_pct, pattern_summary, health_score, is_pii, pii_type)
plans(id, dataset_id, version_id, status, llm_model, mode, created_at)
plan_steps(id, plan_id, ord, type, columns[], params_json, rationale,
           confidence, risk_level, approved, applied, affected_rows)
jobs(id, tenant_id, type, ref_id, status, progress, error, started_at, finished_at)
dedupe_clusters(id, dataset_id, status, resolution_json)
dedupe_cluster_members(cluster_id, row_key, score)
risks(id, dataset_id, version_id, category, severity, column_name, row_key,
      explanation, value_at_stake, resolved, source_rule_id)
rules(id, dataset_id, origin, nl_text, compiled_check, source_doc_id, active)
documents(id, tenant_id, type, storage_key, extracted_rules_json)
recipes(id, tenant_id, name, steps_json, python_code, sql_code, created_from_plan_id)
schema_maps(id, dataset_id, template_storage_key, mapping_json, status)
chat_threads(id, dataset_id, user_id), chat_messages(id, thread_id, role, content,
             sql_used, chart_spec, source_row_keys[])
forecasts(id, dataset_id, metric, model, params, horizon, created_at)
forecast_points(forecast_id, ts, yhat, lower, upper)
forecast_actuals(forecast_id, ts, actual, error)   -- accountability
passports(id, dataset_id, public_id, content_json, content_hash, created_at)
kpi_definitions(id, tenant_id, name, definition, sql_expr)
audit_log(id, tenant_id, actor_type, actor_id, action, target, detail_json, ts)
privacy_ledger(id, tenant_id, seq, actor, action, dataset_id, model, fields_masked,
               bytes_external, payload_hash, prev_hash, entry_hash, ts)
agent_runs(id, tenant_id, agent, input_json, output_json, tool_calls_json, approved_by, ts)
safety_scores(id, tenant_id, score, findings_json, ts)
encryption_keys(id, tenant_id, wrapped_key, status, created_at, destroyed_at)
deletion_receipts(id, tenant_id, dataset_id, key_id, ts, signature)
```

### Row-Level Security pattern
```sql
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON datasets
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```
Apply to every tenant-owned table.

## 3. Additional Tables (sources, crew, strategy, SaaS)

```sql
sources(id, tenant_id, type, name, config_json, status, read_only, last_sync_at)  -- file|url|db|mcp|api|email|watch
source_credentials(id, source_id, encrypted_blob, scopes, rotated_at)
source_passports(id, dataset_id, source_id, origin_ref, collected_at, collected_what,
                 robots_check, pii_found, rows_collected)
scrape_jobs(id, source_id, url, schema_json, status, rate_limit_key, last_run_at)
webhook_keys(id, tenant_id, key_hash, label, created_at, revoked_at)
workflows(id, tenant_id, nl_instruction, steps_json, schedule_cron, reminders_json, active)
workflow_runs(id, workflow_id, status, started_at, finished_at, log_json)
approvals(id, tenant_id, agent_run_id, kind, status, requested_at, decided_by, decided_at)
opportunities(id, tenant_id, dataset_id, title, narrative, value_at_stake_inr, assumptions_json,
              confidence, evidence_row_keys[], status, task_owner, outcome_json)
whatif_scenarios(id, dataset_id, params_json, result_json, created_by, created_at)
ceo_briefs(id, tenant_id, period, content_json, sent_at)
notification_channels(id, tenant_id, type, config_json)   -- email|slack
notifications(id, tenant_id, channel_id, event, payload_json, sent_at, status)
usage_events(id, tenant_id, kind, quantity, ts)           -- rows, agent_runs, connectors, forecasts
plan_limits(plan, kind, limit)
api_keys(id, tenant_id, key_hash, scopes, created_at)
```

All tenant-owned tables get the same row-level security policy shown above.

## 4. Folders / Categories

`folders` form a tree per tenant; datasets also carry `classification` (payroll, invoices, sales, inventory, HR) and free-form `tags`. Routing suggestion example: "HR only, mask salary column".

## 5. Neo4j Lineage Graph

**Nodes:** `Dataset`, `Version`, `Column`, `Step`, `Agent`, `User`, `Rule`, `Document`, `Cluster`, `Record` (for dedupe, optional).

**Relationships:**
```
(Version)-[:DERIVED_FROM]->(Version)
(Step)-[:APPLIED_TO]->(Column)
(Step)-[:PRODUCED]->(Version)
(User|Agent)-[:APPROVED|PROPOSED]->(Step)
(Column)-[:MAPPED_TO]->(Column)          // schema mapping
(Rule)-[:CHECKS]->(Column)
(Document)-[:DEFINES]->(Rule)
(Record)-[:DUPLICATE_OF {score}]->(Record)
(Cluster)-[:CONTAINS]->(Record)
```

Uses: Data Passport lineage, "what breaks if I change this column?", graph-based dedupe (connected components), GraphRAG chat.

**Why a graph:** lineage (datasets, columns, cleaning steps, agents and users are nodes) powers the Data Passport and "what breaks if I change this column?"; **graph-based dedupe** turns near-duplicate pairs into edges and merges each connected cluster, directly serving #11; GraphRAG adds relationships to vector search.

**Free-tier limit:** ~200,000 nodes and 400,000 relationships. Store **cluster/lineage metadata**, not every raw cell. For huge dedupe jobs, keep pair edges in Postgres/DuckDB and push only summaries to Neo4j.

## 6. Vector Collections

**What vectors do in the product:**
- **Semantic dedupe:** embed each row; "Ravi Kumar" and "Kumar, Ravi" cluster together, then the graph merges them.
- **Value normalization:** "Hyd", "hyderabad " and "Hydrabad" snap to the nearest canonical value.
- **Column matching:** map messy headers to a target schema by meaning ("ph no" → "phone").
- **Anomaly flagging:** rows far from every cluster are flagged.
- **Agent memory and KPI Truth Layer:** each company's definitions and past fixes.
- **Semantic cache:** reuse answers to similar questions to save free LLM quotas.
- **GraphRAG chat:** Qdrant finds similar content, Neo4j adds relationships.

### Qdrant (cloud mode)
Single collection per purpose with a `tenant_id` payload index (efficient on 1 GB free tier).

| Collection | Vectors | Payload |
|------------|---------|---------|
| `row_embeddings` | named: `row_content`, `description` | tenant_id, dataset_id, row_key |
| `column_embeddings` | `name`, `meaning` | tenant_id, dataset_id, column |
| `value_canon` | canonical value vectors | tenant_id, column_type, canonical |
| `kpi_memory` | definition text | tenant_id, kpi |
| `semantic_cache` | question embedding | tenant_id, dataset_id, answer_ref |

**Tenancy:** final choice is **one collection per purpose with a `tenant_id` payload index** (efficient on the 1 GB free tier). The earlier idea (separate collection per company with scoped API keys) is kept as an enterprise-tier option.

Features used: hybrid (dense + sparse, RRF), payload filtering, named/multi vectors, scalar/binary quantization, recommend/discovery API, grouping (one best match per cluster), snapshots (Time Machine backups).

**Free-tier note:** 1 GB cluster, no card, no time limit; **paused after ~7 consecutive days of inactivity.** Keep-alive needed. Recommend/discovery API supports "find rows like these good ones, unlike those bad ones"; grouping returns one best match per cluster for dedupe review.

### Chroma (local mode)
Embedded persistent client, one collection per company, metadata filters. Same logical collections as above.

### Embeddings
`fastembed` with `bge-small` locally (or Qdrant free cloud inference with selected models).

## 7. File Storage Layout

```
tenant/{tenant_id}/
  raw/{dataset_id}/{original_filename}.enc
  work/{dataset_id}/v{n}.parquet.enc
  exports/{dataset_id}/{timestamp}.{csv|xlsx}
  docs/{doc_id}.pdf.enc
  passports/{public_id}.json
  recipes/{recipe_id}.json
  twins/{dataset_id}.parquet
```

**No-card storage plan (R2 dropped because it needs a payment method):**
| Option | Use | Caveat |
|--------|-----|--------|
| Supabase Storage | Primary file store | ~1 GB free (verify current limit); keep retention short; Parquet to save space |
| Hugging Face private dataset repo | Large demo datasets, versioned Parquet | Limits not re-verified |
| GitHub private repo + token | Small items only: recipes, Passport JSON, audit snapshots | 100 MB per-file cap; not bulk storage |
| Local disk / MinIO | Offline private mode, demo backups | Zero signup |

**Client-side encryption:** because GitHub and Hugging Face are third parties, encrypt with the per-company key before upload so they hold only ciphertext. Swap in R2/S3 later via StorageAdapter if a card is available.

## 8. Encryption and Crypto-Erasure

- Envelope encryption: master key (env/KMS) wraps per-tenant data keys.
- Files and sensitive columns encrypted with data key.
- "Delete" = destroy wrapped key + remove objects; write `deletion_receipts` row with signature.

## 9. Versioning ("Data Time Machine")

- Each execution creates a new `dataset_versions` row and Parquet file; original raw file is never modified.
- Undo = repoint `current_version_id` and log it.
- Time Machine (roadmap): snapshot of dataset versions, rules, KPIs and agent decisions per date; Qdrant snapshots + Postgres history.

## 10. Retention and Quotas

| Item | Default |
|------|---------|
| Raw uploads | Keep until user deletes (free tier: short retention) |
| Working versions | Keep last N; prune older |
| Ledger | Never pruned (append-only) |
| Semantic cache | TTL 7-30 days |

## 11. Indexing Notes

Postgres: indexes on `(tenant_id, dataset_id)`, `(dataset_id, version_no)`, `risks(dataset_id, severity)`, `privacy_ledger(tenant_id, seq)`. Neo4j: constraints on `id`, index on `tenant_id`. Qdrant: payload index on `tenant_id`, `dataset_id`.

## 12. Demo Dataset Spec

Base data (pick one): Olist Brazilian E-Commerce, Superstore Sales or Online Retail II, Telco Customer Churn, Nashville Housing, "Dirty Cafe Sales", data.gov.in / Kaggle India datasets. Credit sources and check licenses.

Inject with a Python + Faker script:
- ~8% duplicates, including near-duplicates ("Ravi Kumar" / "Kumar, Ravi")
- Dates in 4-5 formats
- City variants ("Hyd", "hyderabad ", "Hyderabad")
- 10-15% missing values in key columns
- Phone numbers in the salary column; "test" entries
- A few extreme outliers
- Fake PII (names, emails, Aadhaar-style numbers)
- Fake contract PDF ("payment within 30 days") plus invoices, some violating it

Keep a seeded generator so the "before" score is reproducibly ~42.



---

# PART 7: AI LLM

## 07 · AI / LLM Document

> AI powers an **autonomous crew** over any data source: Intake, Cleaner, Auditor, Analyst, Forecaster, Strategist (main feature), Ops. Statistics for numbers, LLM for understanding and explaining.

## 1. Principles

1. **LLM plans, engine executes.** The LLM sees a sample and returns a JSON plan; deterministic code touches the full data.
2. **Structured outputs only.** Every LLM response is validated against a JSON schema; invalid → retry once with the error, then fall back.
3. **Mask before send.** Presidio tokenizes PII before any cloud call.
4. **Use the right tool.** Statistics for forecasting, rules for scoring, embeddings for similarity, LLM for understanding and explaining.
5. **Human approval** before anything changes.
6. **Everything logged** (model, tokens, masked fields, bytes out) to the Privacy Ledger and Langfuse.

## 2. Model Routing (LiteLLM)

| Mode | Models | Data policy |
|------|--------|-------------|
| Cloud | Groq (speed), Gemini Flash (long context), OpenRouter free models | Only masked or synthetic samples |
| BYO key | Company's own provider key | Masked samples; company controls terms |
| Local | Ollama (e.g. Llama/Qwen-class model) | Zero egress; vectors in Chroma |

Failover order (example): Groq → Gemini Flash → OpenRouter → Ollama.

**Cautions:**
- Gemini's free tier prompts may be used for training, so never send real data there.
- Google restricted free tier to Flash models (April 2026).
- Free limits are tight: use caching, semantic cache and routing.

## 3. LLM Tasks and Their Prompts

### 3.1 Dataset classification and intake
**Input:** column names, 20-50 masked sample rows, profile stats.
**Output schema:**
```json
{ "dataset_type": "invoices", "confidence": 0.93,
  "tags": ["finance","receivables"],
  "contains_pii": true, "pii_columns": ["customer_email","phone"],
  "routing_suggestion": "Finance only; mask customer_email" }
```

### 3.2 Column understanding
Returns per-column semantic meaning ("`ph no` = phone number, Indian 10-digit"), expected type, expected format, canonical-value hints.

### 3.3 Cleaning plan (hero task)
**Input:** profile + masked sample + detected issues + (optional) target schema.
**Output schema (abridged):**
```json
{ "steps": [
  { "id":"s1","type":"normalize_values","columns":["city"],
    "params":{"mapping":{"Hyd":"Hyderabad","hyderabad ":"Hyderabad"}},
    "rationale":"Variants of the same city",
    "confidence":0.96,"risk_level":"low","reversible":true }
]}
```
Allowed `type` values are a fixed enum (see 03_technical.md). The LLM cannot invent executable code; `remove_rows` filters use a restricted expression grammar.

### 3.4 Chat-to-clean
"Remove test entries and split Name into first and last" → converted into plan steps (same schema), shown for approval and saved to the recipe. Prompts thereby become reproducible steps.

### 3.5 Plain-English validation rules
"Phone must be 10 digits, age between 18 and 60" → compiled into Pandera checks via structured output (`field`, `op`, `value`, `severity`).

### 3.6 Target schema mapping
Inputs: source columns + target template columns. Uses embeddings for first-pass matching ("ph no" → "phone"), LLM for ambiguities, outputs mapping plus transforms (type casts, splits).

### 3.7 Contract/policy rule extraction
PDF text → list of rules with clause quote, e.g. `{"rule":"payment within 30 days","field":"payment_days","op":"<=","value":30,"clause":"..."}`. User confirms before enforcement.

### 3.8 Text-to-SQL (guarded)
Schema, column descriptions and KPI definitions in prompt. Output SQL validated: single SELECT, allowlisted tables, LIMIT enforced, timeout. LLM never executes anything itself.

### 3.9 Explanations
Risk explanations ("this salary is 40x the median"), insight narratives, CEO brief, forecast explanation. Numbers are **injected from computed results**, not generated by the LLM.

### 3.10 Auto-enrichment (roadmap)
Fill city from pincode, standardize company names, using lookup tables first, LLM as fallback.

## 4. Additional LLM Tasks for the Crew

### Source understanding (Intake)
- **Scraped pages:** given a masked HTML/text sample, return a JSON schema ("product name, price, rating") and CSS/XPath or structural hints; engine does the extraction at scale.
- **PDF tables / photo-of-table OCR:** OCR text → LLM repairs headers and merged cells → table JSON, verified by row/column count checks.
- **Database/MCP sources:** schema + sample rows (masked) → column meanings and relationships (keys, joins).

### Ops workflow generation
"Every Monday, clean the sales sheet, flag anomalies, notify finance" →
```json
{ "schedule":"0 9 * * MON",
  "steps":[{"agent":"cleaner","dataset":"sales"},{"agent":"auditor","task":"anomalies"},
           {"agent":"ops","task":"notify","to":"finance"}],
  "reminders":[...], "requires_approval":["notify"] }
```
Validated against a fixed step vocabulary before it can run.

### Opportunity ranking and narrative (Strategist)
LLM receives computed facts (segment churn rates, ₹ estimates, evidence row keys) and writes the narrative; it may not introduce numbers that are not in the input.

### Agent routing (Supervisor)
Selects the next specialist from a closed set and decides when to interrupt for human approval.

## 5. Non-LLM AI Components

| Component | Method | Purpose |
|-----------|--------|---------|
| Fuzzy dedupe | Splink + rapidfuzz | Probabilistic record linkage |
| Semantic dedupe | Embeddings + Qdrant/Chroma | Catch "Ravi Kumar" / "Kumar, Ravi" |
| Value normalization | Embedding nearest canonical value | "Hydrabad" → "Hyderabad" |
| Column matching | Embedding similarity | Header → schema mapping |
| Anomaly detection | IQR/z-score, isolation forest, distance from clusters | Outliers with explanation |
| PII detection | Presidio + custom recognizers (Aadhaar, PAN, phone, email) | Masking and risk grid |
| Forecasting | Prophet / statsforecast | Revenue, churn, stock-outs, cash flow |
| Synthetic data | SDV (open source) | Privacy-safe twin of a dataset |

## 6. Embeddings

- Local: `fastembed` with `bge-small`.
- Cloud: Qdrant free cloud inference (selected models) is an option.
- Local mode: same bge-small into Chroma.

## 7. Forecasting Policy (important for judges who know ML)

- LLMs are unreliable at predicting numbers; **never** use them for forecasts.
- Use Prophet or statsforecast; output with **confidence ranges**.
- Backtest and show metrics (MAPE/sMAPE).
- **Forecast Accountability:** store each prediction; when actuals arrive, compute error; show track record, including misses.
- LLM then drafts: "Revenue is likely to dip in March because seasonality shows..." using computed components (trend, seasonality) as evidence.

## 8. Strategist: Predict and Advise (main feature)

**Inputs:** cleaned data, forecasts, risks, KPI definitions, company memory.

**Outputs**
1. **Forecasts with confidence ranges** for revenue, churn, stock-outs and cash flow (from the Forecaster, not the LLM).
2. **Ranked "What will add value" list.** Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* Each entry carries:
   - segment comparison computed by SQL/statistics,
   - ₹ estimate with **visible, editable assumptions** (Value-at-Stake meter, e.g. duplicate customers × average invoice × double-billing rate),
   - **evidence rows**,
   - confidence level.
3. **What-if simulator:** "What if we raise prices 5%?" runs a scenario/elasticity model on historical data; LLM explains the result and its limits.
4. **Weekly CEO brief:** metrics, forecast changes, top 3 opportunities, risks; every claim links to evidence.
5. **Impact Tracker (roadmap):** insight → task with owner → later measurement of whether the fix worked.

**Ranking:** score = value-at-stake × confidence ÷ effort estimate, with all terms shown.

**Guardrails:** no number in the narrative that is not computed; uncertainty always shown; forecast accuracy track record displayed next to advice.

## 9. Agent Memory and KPI Truth Layer

- Per-company memory in vector store: past fixes, accepted/rejected suggestions, column meanings.
- KPI definitions ("active customer = purchased in last 90 days") stored and injected into chat and reports to end "two teams, two numbers."
- Preference learning: rejected step types get lower priority next time.

## 10. Safety, Guardrails and Prompt Injection

| Threat | Defense |
|--------|---------|
| Instructions hidden in a cell/PDF | System prompt marks file content as untrusted data; instruction-like text flagged; agents have no destructive tools |
| SQL abuse | Parser-level SELECT-only validation; read-only credentials |
| PII leakage | Mask before send; output scanner for unmasked PII |
| Cross-tenant leak | Tenant filter enforced in code, not in prompt |
| Hallucinated fixes | Schema-validated plan, preview, approval, undo |
| Over-trust | Confidence and risk labels on each step |

**Red Team Agent:** a scheduled attacker agent runs a library of injection, cross-tenant and PII-leak probes against a staging tenant and reports a **Safety Score** with findings. Presented as "tested continuously," not "guaranteed."

## 11. Evaluation

| What | How |
|------|-----|
| Plan quality | Golden dataset with known defects; measure recall of injected defects and false-fix rate |
| Score determinism | Same file → same score |
| Dedupe | Precision/recall on labeled pairs |
| Text-to-SQL | Question set with expected results |
| Forecast | Backtest error; accountability log |
| Safety | Red team suite pass rate |
| Cost | Tokens per file; cache hit rate |

## 12. Cost and Quota Management

- Sample size cap (e.g. 50 rows + column stats).
- Cache plan results by (schema hash, profile hash).
- Semantic cache for chat.
- Route cheap tasks (classification) to small/fast models; long-context only when needed.
- Queue and rate-limit per provider.

## 13. Synthetic Twin

SDV generates a statistically similar dataset with no real individuals; validates with distribution and correlation comparison; used for sharing with vendors/interns and as safe input for cloud LLMs.



---

# PART 8: FEATURES AND MODULES

## 08 · Features and Modules

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



---

# PART 9: TECHSTACK AND SERVICES

## 09 · Tech Stack and External Services

> Stack supports **any data source** (files, URLs, databases, MCP business connectors) and a LangGraph agent crew.

> Free-tier terms change often. **Verify current limits and card requirements before relying on any service, and sign up early, not the night before the demo.**

## 1. Full Stack Table

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js, TypeScript, Tailwind, shadcn/ui | Hosted on Cloudflare Pages (Vercel free tier is non-commercial) |
| Grid | AG Grid Community | Virtualized, huge tables |
| Charts | ECharts | |
| Graph viz | Cytoscape.js or React Flow | Lineage |
| Gestures | MediaPipe Hands | Browser-only |
| Backend | FastAPI, Pydantic | |
| Agents | LangGraph, LangChain, MCP | Supervisor + specialists |
| LLM router | LiteLLM | Failover and caching |
| Data engines | DuckDB, Polars, Pandas | Parquet working format |
| Record linkage | Splink, rapidfuzz | |
| Validation | Pandera | |
| PII | Microsoft Presidio | Custom Indian recognizers |
| Forecasting | Prophet or statsforecast | |
| Synthetic data | SDV | |
| Embeddings | fastembed + bge-small | Local |
| Jobs | Arq workers | Redis-backed (Celery was the first idea; Arq is final) |
| Connectors | MCP servers/clients | Google Sheets, Drive, Gmail, Stripe, HubSpot, Tally (roadmap), DB readers |
| Notifications | Email provider + Slack webhooks | Provider free tier to be verified |
| Vector DB (initial idea) | Postgres pgvector | Replaced by Qdrant/Chroma; optional fallback |
| Scraping | Playwright, Crawl4AI, Trafilatura, BeautifulSoup | |
| OCR/PDF | pdfplumber, Tesseract (or similar) | PDF tables and images |
| Observability | Langfuse, Sentry, Grafana Cloud | |
| CI | GitHub Actions | Also keep-alive pings |

## 2. External Services

### Databases and storage
| Service | Role | Card? | Free-tier notes |
|---------|------|-------|-----------------|
| Supabase | Postgres, auth, RLS, Storage (main file store) | Not verified | ~1 GB storage cap, check current limits; projects can pause on inactivity |
| Neon | Alternative Postgres | Not verified | Check limits |
| Neo4j AuraDB Free | Lineage graph | **No card** (checked) | Up to 200,000 nodes / 400,000 relationships; pauses when idle (sources conflict: ~72 h vs ~1 week), deleted after ~30 days paused; trial extras (Graph Analytics, Aura Agent) are time-boxed bonuses |
| Qdrant Cloud Free | Vectors | **No card, no time limit** (checked) | 1 GB cluster, free cloud inference with selected models; **paused after 7 days of inactivity** |
| Chroma | Local vector store | n/a | Embedded, open source |
| Upstash Redis | Queue/cache | Not verified | Free tier limits apply |
| Hugging Face private dataset repo | Large demo datasets, versioned Parquet | **No card** | Limits not re-verified |
| GitHub private repo | Small files: recipes, Passport JSON, audit snapshots | No card | 100 MB per-file cap; not bulk storage |
| Local disk / MinIO | Offline mode, demo backups | n/a | Zero signup |
| ~~Cloudflare R2~~ | **Dropped** | Requires payment method | Could be added later via StorageAdapter |

### LLM providers
| Provider | Use | Caveat |
|----------|-----|--------|
| Groq | Fast inference | No card (checked); tight limits |
| Gemini Flash | Long context | Free tier prompts used for training; masked/synthetic only. Free tier restricted to Flash since April 2026 |
| OpenRouter free models | Failover | Variable availability |
| Ollama | Local, sensitive data | Needs capable hardware |

### Hosting and ops
| Service | Use | Caveat |
|---------|-----|--------|
| Cloudflare Pages | Frontend, HTTPS | Card not verified |
| Hugging Face Spaces | Backend option | Not re-checked |
| Render free tier | Backend option | Sleeps when idle; cold starts |
| Oracle Cloud Always Free ARM VM | Backend/agents/Qdrant self-host | **Often asks for a card at signup**; not verified. Test or skip |
| Langfuse, Sentry, Grafana Cloud | Tracing, errors, metrics | Free tiers |
| GitHub Actions | CI + keep-alive cron | |

## 3. Stack Corrections and Why (latest wins)

| Change | Reason |
|--------|--------|
| Vercel → **Cloudflare Pages** | Vercel free tier is non-commercial |
| Cloudflare R2 → **dropped** | Activation requires a payment method (card or PayPal) |
| Celery → **Arq** | Lighter, async-native, fits free Redis |
| pgvector → **Qdrant + Chroma** | Hybrid search, payload filters, quantization; Chroma for zero-egress local mode |
| Separate Qdrant collection per company → **one collection + `tenant_id` index** | Efficient on 1 GB free tier; per-company collections remain an enterprise option |
| Oracle Always Free VM → **verify**, else HF Spaces or Render | Oracle often asks for a card |
| Gemini free tier for all prompts → **masked/synthetic only** | Free-tier prompts may be used for training; real data on Ollama |
| Added **Neo4j AuraDB Free** | Lineage, graph dedupe, GraphRAG; no card; up to 200k nodes / 400k relationships |
| Added **LiteLLM** failover | Free LLM limits are tight (Google restricted free tier to Flash in April 2026) |
| Added **Langfuse** | Agent tracing and Agent Replay |

**Embeddings:** `fastembed` with bge-small locally; Qdrant free cloud inference with selected models is optional.

**Scraping stack (all free):** Playwright for JS-heavy pages, BeautifulSoup/Trafilatura for simple ones, Crawl4AI, LLM-assisted extraction into a JSON schema, queue with rate limiting.

## 4. Adapter Interfaces (swap without rewriting)

```python
class StorageAdapter:   put(), get(), delete(), list(), presign()
class VectorStore:      upsert(), query(), filter(), delete()   # Qdrant | Chroma
class LLMRouter:        complete(), json_complete()             # Groq|Gemini|OpenRouter|Ollama
class Notifier:         send()                                  # email | slack
```
Mode switch (`cloud | byo | local`) only changes which adapters load.

## 5. Mode Matrix

| Component | Cloud mode | Local/private mode |
|-----------|-----------|--------------------|
| LLM | Groq/Gemini/OpenRouter (masked data) | Ollama |
| Vectors | Qdrant Cloud | Chroma embedded |
| Files | Supabase Storage (+ encrypted HF/GitHub) | Local disk / MinIO |
| Graph | Neo4j Aura | Neo4j local Docker (optional) |
| Postgres | Supabase/Neon | Local Postgres (Docker) |
| External bytes | Tracked on dashboard | **0** |

## 6. Environment Variables (sample)

```
MODE=cloud
LLM_PROVIDERS=groq,gemini,openrouter,ollama
GROQ_API_KEY= GEMINI_API_KEY= OPENROUTER_API_KEY= OLLAMA_URL=
DATABASE_URL= SUPABASE_URL= SUPABASE_KEY=
NEO4J_URI= NEO4J_USER= NEO4J_PASSWORD=
QDRANT_URL= QDRANT_API_KEY=
REDIS_URL=
STORAGE_BACKEND=supabase|hf|github|local
VECTOR_BACKEND=qdrant|chroma
MASTER_KEY=
SENTRY_DSN= LANGFUSE_KEYS=
```

## 7. Keep-Alive and Demo-Day Checklist

- [ ] GitHub Actions cron pings Qdrant, Neo4j, Supabase, backend every few days
- [ ] Check Qdrant and Neo4j awake the **day before** the demo
- [ ] Verify all LLM keys and quotas that morning
- [ ] Local/offline fallback tested
- [ ] Pre-cleaned backup outputs saved
- [ ] Sign-up of card-uncertain services done early

## 8. Cost Summary

Target: **₹0 / $0 production stack** for the hackathon, with graceful upgrade paths (R2/S3, paid LLM tiers, larger Qdrant/Neo4j) once a card or revenue exists.

## 9. Suggested Repo Structure

```
datacrew/
  apps/web/            Next.js
  apps/api/            FastAPI + agents + workers
  packages/schemas/    shared plan/step JSON schemas
  scripts/demo_data/   Faker corruption generator
  infra/               docker-compose, GitHub Actions
  docs/                these 11 files
```



---

# PART 10: USER FLOW

## 10 · User Flow: Inputs and Outputs

> Inputs are **any data**: files, pasted URLs, databases, business apps (MCP), API/webhook, email-in. Outputs are clean data, risk findings, answers with proof, forecasts, advice, and a Data Passport.

## 1. Master Flow

```
 INPUT                      PROCESS (agent crew)                    OUTPUT
 ─────                      ────────────────────                    ──────
 File / URL / DB /       →  Intake: ingest, profile, classify    →  Health score (42), tags, routing
 MCP app / API / email                                              Source Passport
 Sample (masked)         →  Cleaner: AI plan                     →  Toggleable list of fixes
 User approvals          →  Engine: execute on full data         →  Clean data, diff, score (94)
 Optional contract PDF   →  Auditor: risks and rule checks       →  Red/amber/green risk grid
 Question                →  Analyst: read-only text-to-SQL       →  Answer + chart + SQL + source rows
 Time series             →  Forecaster: Prophet/statsforecast    →  Forecast with confidence range
 Forecasts + risks       →  Strategist: Predict and Advise       →  Ranked value list, what-if, CEO brief
 NL instruction          →  Ops: schedule and alert              →  Workflow, reminders, notifications
 Everything above        →  Compile                              →  Data Passport + recipe + PDF report
```

## 2. Input Catalog

| Input | Format | Where |
|-------|--------|-------|
| Files | CSV, XLSX (multi-sheet, merged cells), JSON, PDF tables, photo/image of table | Sources → Upload |
| Web page | Pasted URL (tables, lists, repeated cards; "extract product name, price, rating") | Sources → Paste URL |
| Database | Postgres first (read-only credentials); MySQL, MongoDB later | Sources → Database |
| Business apps | Google Sheets, Drive, Gmail attachments, Stripe, HubSpot, Tally via MCP | Sources → Apps (roadmap) |
| API/webhook | Push from other apps | Sources → API keys (roadmap) |
| Email-in / watched folder | Forwarded file / Drive or S3 folder | Roadmap |
| Target template | CSV/XLSX with desired headers | Schema mapping |
| Contract/policy | PDF | Contract check |
| Natural-language instruction | Text/voice | Chat-to-clean, rules, chat, automations |
| Approvals | Toggle, click, air-swipe | Plan screen, approval inbox |
| What-if parameters | "raise prices 5%" | Strategy |
| Mode choice | Cloud / BYO key / Local | Settings |

## 3. Output Catalog

| Output | Format |
|--------|--------|
| Clean dataset | CSV, XLSX, Parquet |
| Cleaning recipe | Python, SQL, JSON |
| Data-quality report | PDF |
| Data Passport | Web page + JSON + public link/QR |
| Risk report | In-app grid, exportable |
| Chat answers | Text + chart + SQL/Pandas + source rows |
| Forecast | Chart with confidence band + accuracy record |
| Synthetic Twin | Parquet/CSV |
| Privacy ledger | In-app + export |
| Ranked value opportunities | In-app list with ₹ estimate + evidence rows |
| What-if result | Chart + explanation |
| Weekly CEO brief | In-app page + email/Slack |
| Workflow + run status | Dashboard (roadmap) |
| Source Passport | Origin, timestamp, what collected |
| Deletion receipt | Signed record |
| Audit log | In-app + export |

## 4. Primary Flow A: Clean a Messy File (the #11 core)

1. **Sign in** → workspace dashboard.
2. **Upload** a CSV/Excel (drag and drop). Progress bar; resumable.
3. System **profiles** the file and **classifies** it (e.g. "Sales invoices"). Shows **health score 42/100**, issue badges per column, PII flags, routing suggestion.
4. System **masks PII** in the sample (if cloud mode) and asks the LLM for a **plan**.
5. User opens **Plan screen**: sees steps such as
   - Remove 214 duplicate rows
   - Standardize 5 date formats to ISO
   - Merge city variants into "Hyderabad"
   - Fill 312 missing values in `region` with mode
   - Remove 9 "test" entries
   - Move phone numbers out of `salary` column
6. User **toggles** steps on/off, previews each on sample.
7. Optionally types **"split Name into first and last"** → new step appears.
8. User clicks **Apply**. Background job runs with live progress.
9. **Diff view** appears; score shows **94/100** with per-column before/after.
10. User **downloads** clean file, and **exports recipe** (Python/SQL) and PDF report.
11. **Undo** any step if unhappy; version history retained.

## 5. Flow B: Fuzzy Dedupe Review

1. Run smart dedupe → clusters list.
2. Pick a cluster → side-by-side records ("Ravi Kumar" vs "Kumar, Ravi").
3. Choose surviving field values → Merge / Not duplicate / Skip.
4. Score updates; lineage records merges.

## 6. Flow C: Map to a Target Schema

1. Upload target template (e.g. CRM import format).
2. AI suggests column mapping with confidence.
3. User adjusts; preview restructured output.
4. Apply → download in target format.

## 7. Flow D: Audit and Contract Check

1. Open **Risks** tab → red/amber/green grid with reasons.
2. Upload contract PDF → AI lists extracted rules ("payment within 30 days").
3. User confirms rules.
4. Violating rows (overdue invoices) turn red with the clause cited.

## 8. Flow E: Ask Your Data

1. Open **Chat**; ask "Which region has the most overdue payments?"
2. System checks semantic cache → text-to-SQL → read-only execution.
3. Answer returns with chart, query used, and **source rows** link.

## 9. Flow F: Predict and Advise (the main feature, shown as step two)

1. Open **Forecast**; choose metric (revenue, churn, stock-outs, cash flow) and date column.
2. Forecaster produces a forecast with a **confidence range** using Prophet/statsforecast, plus past accuracy track record.
3. Open **Strategy**: Strategist shows a ranked **"What will add value"** list. Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* Click to see **evidence rows** and editable assumptions.
4. Run **What-if**: "What if we raise prices 5%?" → scenario chart + explanation.
5. Ask in chat: *"Why will revenue dip in March?"* → answer with proof.
6. Receive the **weekly CEO brief** by email/Slack.
7. Later, actuals arrive and the system **scores its own forecast** and shows the result.

## 10. Flow G: Point & Say (optional showstopper)

1. Enable camera (permission prompt) → calibration.
2. **Point** at a column → highlighted.
3. Say **"fix the dates"** → matching plan step highlighted.
4. **Air-swipe right** = approve; **left** = reject.
5. Destructive step → confirmation dialog; pause gesture available.

## 11. Flow H: Privacy and Passport

1. **Privacy dashboard:** pick dataset → see path *file → mask → agent → model → result*, fields masked, bytes sent externally.
2. Switch to **Local mode** → counter shows **0 bytes external**.
3. **Passport:** shows before/after, change timeline, risks resolved, lineage; share link; **Verify** recomputes hash.
4. **Delete** dataset → key destroyed → **deletion receipt**.

## 12. Flow I: Reusable Recipe (retention loop)

1. Save pipeline as a recipe.
2. Next month upload new file → "Apply recipe" → review diffs → download. One click.

## 13. Flow J: Admin

Invite members, assign roles (Admin/Editor/Viewer), create folders/categories, set retention, choose model mode, manage keys, view audit log and ledger.

## 14. Flow K: Connect Any Data

1. **Sources** → pick a tile: Upload, Paste URL, Database, Apps.
2. **Database:** enter read-only credentials; allowlist check; pick tables; sample appears.
3. Intake agent classifies, profiles and masks PII in the sample; a **Source Passport** is created.
4. Dataset enters the same plan → approve → clean → score pipeline.
5. Scheduled sync (roadmap) keeps it updated.

## 15. Flow L: Paste a Messy Public Page (ingestion wow)

1. Paste a URL (practice sites: books.toscrape.com, quotes.toscrape.com, scrapethissite.com, or a Wikipedia table).
2. System checks robots.txt/ToS; shows detected tables/cards; LLM proposes fields ("product name, price, rating"); user edits.
3. Rows are scraped (rate-limited) into a structured table; PII flagged and masked.
4. **One click** runs the cleaning plan; score and diff appear.
5. Source Passport records URL, timestamp and what was collected.

## 16. Flow M: Agents Working Live (Agent Replay)

1. After connecting a messy sales database, open **Crew**.
2. Watch Intake → Cleaner → Auditor → Analyst → Forecaster → Strategist run, with each reasoning step and tool call on a timeline.
3. Approve or reject at each gate (plan execution, writes, notifications).

## 17. Flow N: Ops Autopilot (roadmap)

1. Type: *"Every Monday, clean the sales sheet, flag anomalies, notify finance."*
2. Ops agent builds a workflow with schedule, reminders and approval gates.
3. Dashboard shows run status; finance receives email/Slack alerts.

## 18. Edge Cases and Messages

| Situation | Behavior |
|-----------|----------|
| File too large for memory | Streamed processing; background job |
| LLM provider down | Auto failover, then rule-based suggestions |
| Plan JSON invalid | Retry once, fall back |
| DB asleep | "Waking up services, retry in a moment" |
| PII found | Banner + default mask |
| Scrape blocked by robots.txt | Explain and refuse |
| Login/paywalled page | Refuse; suggest upload or API |
| Database credentials write-capable | Warn and require read-only |
| Forecast has too little history | Say so; show wide range or decline |
| Agent wants to write or notify | Pause for approval |
| Contract has ambiguous clause | Ask user to confirm rule |
| Camera denied | Fall back to mouse/keyboard |

## 19. Live Demo Scripts

### Script 1: #11-led demo (recommended, 3-5 minutes)
| Time | Beat | Message |
|------|------|---------|
| 0:00 | Story of Priya and the month-end sheet | Relatable pain |
| 0:30 | Drop the ugly file (or paste a messy public listings URL). Auto-classified. **Score 42** | Any data in, instant wow |
| 1:00 | Show plan; toggle steps; apply | Human in control |
| 1:45 | Diff view; **score 94**; download file + Python recipe | Core #11 delivered (~50%) |
| 2:15 | Risk grid; upload contract; violations light red; Data Passport | Trust (~30%) |
| 3:00 | Privacy dashboard: masked fields, "0 bytes external" in local mode; Safety Score | Moat |
| 3:30 | (Optional) Point & Say: air-swipe approvals | Showstopper |
| 4:00 | Forecast with confidence band + accuracy record + top-3 value opportunities (~20%) | "Step two" |
| 4:30 | Roadmap slide + closing line | Memorable close |

### Script 2: crew-led demo (DataCrew flow)
1. **Connect a messy sales database.** Agents start working live (Agent Replay).
2. Health score rises; risk grid appears.
3. Forecast chart shows next quarter, with the **top 3 value opportunities**.
4. Ask in chat: *"Why will revenue dip in March?"* → answer with proof.

### Script 3: TrustSheet 3-step version
1. Drop in an ugly file; classified; score drops to **42**.
2. Point and speak; fixes approved by air-swipe; score climbs to **94**.
3. Upload a contract; violations light up red; Data Passport generated.

**Backup plan:** pre-cleaned outputs, offline/local mode, screen recording, backup copy of every demo file in case the network or scraping fails. Rehearse until the score reaches ~94 every time.




---

# PART 11: MARKETING AND PITCH

## 11 · Marketing, Pitch and Uniqueness

## 1. Positioning Statement

**For** teams whose business runs on messy data scattered across files, databases and apps,
**DataCrew is** an autonomous AI data team
**that** cleans it, audits it, watches it, predicts what's coming and tells you what will add value, with every step approved by you and provable on screen,
**unlike** BI dashboards and "chat with your data" tools that either ignore data quality or ship everything to a cloud LLM.

**Not a spreadsheet cleaner anymore.** Messy file in, trusted data, insights and automation out. Connect any data via MCP connectors: files (CSV, Excel, PDF, JSON), databases (Postgres, MySQL, MongoDB), business tools (Google Sheets, Stripe, HubSpot, Tally, Gmail).

## 2. Taglines and Pitch Lines

- **Core:** "Upload the spreadsheet you're embarrassed by. Get back data you can trust, and answers you can use."
- **Crew:** "An autonomous AI data team for every company. Connect any data; agents clean it, watch it, predict what's coming, and tell you what will add value."
- **Trust:** "Every company runs on spreadsheets nobody trusts. We clean them, audit them, and give each one a passport you can trust."
- **Privacy:** "Your data never has to leave your control, and we'll show you every step to prove it."
- **Step-two framing:** "Cleaning is step one. Once data is trusted, we predict, advise and protect it."
- **Forecast story:** "We find the money, predict the future, prove we were right, and keep your data safe while doing it."
- **Closer:** "Spreadsheets run the world, but nobody trusts them. We make every spreadsheet trustworthy, and prove it."
- **One-stop angle:** "AI Data Trust Workspace: it cleans messy data, audits it for risk, routes it automatically, and answers questions with proof."

Differentiator in one line: **privacy you can verify, not just promise.**

## 3. Why This Idea Wins a Hackathon

1. **Bigger than a cleaner.** Reposition from "a cleaner" to an AI data workspace/crew: messy data in, trusted data, insights and automation out.
2. **Universal pain.** Every company has messy spreadsheets; analysts spend most of their time cleaning.
3. **Contrarian pick.** Most teams choose "chat with docs" or "contract analyzer." Nobody expects the data cleaner to win.
4. **Best before/after demo.** A judge uploads an ugly file and sees score 42 → 94 with a visible diff.
5. **Genuinely AI-driven.** The LLM reads columns, understands meaning, proposes a plan; it is not a rules engine.
6. **Solo-buildable core.** Upload → profile → plan → preview → download.
7. **Technically credible.** Sample-then-apply, graph lineage, vectors, real forecasting models, privacy controls.
8. **Memorable hook.** Data Passport.

## 4. How Unique Is It? (honest assessment)

> I can't verify that none of these ideas exist anywhere. Some exist in pieces across different tools. Almost none are **combined in one product**, and that unified combination is the edge.

| Capability | Typical competitors | DataCrew |
|------------|--------------------|----------|
| Data sources | Mostly one format | Any data: files, scraped URLs, databases, MCP business apps, API/webhook |
| Agents | Single chatbot | Crew of specialist agents with supervisor, approvals and replay |
| Data cleaning | Standalone cleaners (OpenRefine, Trifacta-style, Excel Power Query) | AI plan + human toggles + health score + recipe export |
| Chat with data | BI copilots, "chat with CSV" apps | Guarded text-to-SQL with chart, query **and source rows** |
| Data quality monitoring | Enterprise observability tools | Plain-English rules, contract-to-data enforcement, drift sentinel (roadmap) |
| Privacy | Promise/policy pages | **Visible** masking, local mode, hash-chained ledger, "0 bytes external" dashboard |
| Trust record | Rare | **Data Passport**, a "nutrition label" for data |
| Advice | Dashboards show what happened | Ranked "what will add value" with ₹ and evidence; what-if simulator; weekly CEO brief |
| Forecasting | Separate BI/ML tools | Statistical forecasts that **score their own accuracy** |
| Graph | Rare in this space | Neo4j lineage, graph dedupe, GraphRAG |
| Pricing of problems | Rare | Value-at-Stake in ₹ per issue |

### Our 12 differentiators (pick 4 to build deeply)
1. Red Team Agent + live Safety Score ✅ *build*
2. Synthetic Twin (SDV) ✅ *build*
3. Plain-English Governance (roadmap)
4. Data Time Machine (roadmap)
5. Forecast Accountability ✅ *build*
6. Value-at-Stake meter ✅ *build*
7. Impact Tracker (roadmap)
8. Drift Sentinel (roadmap)
9. Money Leak Finder (roadmap)
10. KPI Truth Layer (roadmap)
11. Agent Replay (roadmap/P1)
12. Contract-to-Data Enforcement (wow layer)

### The privacy moat
PII masking before LLM calls · tenant isolation · per-company encryption with crypto-erase receipts · local-model mode · Privacy Ledger · live dashboard · agent sandboxing · Red Team Safety Score.

**Be honest with judges:** nobody can prove absolute safety. We make every control visible and auditable, which is more credible than a claim.

## 5. Staying On-Brief With Problem Statement #11

- Lead with the #11 flow fully working: upload, duplicate removal, missing-value detection, column normalization, restructuring, download.
- Say: "Cleaning is step one."
- Demo ratio: **50% core / 30% trust & privacy / 20% prediction.**
- Show the rest as a roadmap slide.

## 6. Target Segments and Messaging

| Segment | Pain | Message |
|---------|------|---------|
| Finance/SME | Month-end chaos | "Close the books on data you can prove." |
| Analysts | Cleaning time | "Stop cleaning. Start analyzing. Get the Python too." |
| Ops/Sales | Multiple editors | "One recipe, every month." |
| Founders | Don't trust numbers | "Know which numbers to trust." |
| Compliance | Data leaving the company | "See exactly where your data went." |
| Agencies | Client file chaos | "Any client file, clean in minutes." |

## 7. Go-To-Market (post-hackathon)

1. **Free tier** with row limits → viral via shareable Data Passports ("Cleaned with DataCrew" badge).
2. **Content:** before/after teardown posts of famously messy public datasets; "5 ways your spreadsheet is lying."
3. **Communities:** r/excel, data-analyst Discords, Indian startup/SME groups, Tally user forums.
4. **Integrations:** Tally, Google Sheets, HubSpot, Stripe via MCP.
5. **Partnerships:** accountants/CA firms, ERP implementers.
6. **Enterprise:** local mode, DPDP readiness, SOC 2 roadmap.

## 8. Competitive Landscape (categories, not claims about specific products)

- Spreadsheet-native tools (Excel Power Query, Sheets add-ons)
- Data-prep tools (open-source and commercial)
- BI platforms with AI copilots
- "Chat with CSV" apps
- Data quality/observability platforms
Our pitch: none of them combine **approval-based AI cleaning + verifiable privacy + trust passport + guarded Q&A** for non-coders.

## 9. Slide Deck Outline (10 slides + credits)

1. **Title:** DataCrew, "an autonomous AI data team", pitch line
2. **Story:** Priya and the month-end sheet
3. **Problem:** bad, scattered data; wrong decisions; no proof
4. **Solution:** connect any data → plan → approve → trust → predict → advise
5. **Live demo** (or video fallback)
6. **How it works:** sample-then-apply, agent crew, graph lineage, vectors, any-source ingestion
7. **Privacy moat:** masking, local mode, ledger, safety score
8. **Differentiators:** Data Passport, Predict & Advise, Forecast Accountability, Value-at-Stake, Synthetic Twin
9. **Business model and market:** SaaS tiers, usage-based pricing
10. **Roadmap:** MCP connectors, ops autopilot, scheduling, API/webhooks, governance, time machine, DPDP/SOC 2, then closing line
11. **Credits:** dataset sources and licenses; all personal data synthetic

## 10. Free Production Stack (a pitch point)

Frontend on Cloudflare Pages; backend and agents (FastAPI, LangGraph, LangChain, MCP) on Hugging Face Spaces, Render or an Oracle Always Free VM (verify card); Qdrant free cluster; Neo4j AuraDB Free; Supabase or Neon; Upstash Redis; Groq/Gemini/OpenRouter for cloud mode and Ollama for local; fastembed locally; Prophet/statsforecast; GitHub Actions, Sentry, Langfuse, Grafana free tiers. **Honest note:** free tiers have limits and can change; we use caching, queueing, failover and keep-alives.

## 11. Judge Q&A Prep

| Question | Answer |
|----------|--------|
| *How is this different from ChatGPT with a CSV?* | It never edits silently: plan, approvals, undo, score, passport, recipe export, and it scales past context limits by sample-then-apply. |
| *What if the LLM is wrong?* | Schema-validated plan, preview, human toggles, confidence/risk labels, version undo. |
| *How does it handle large files?* | Chunked uploads, DuckDB/Polars streaming, Parquet, background workers; LLM sees only a sample. |
| *Is it really private?* | We don't claim absolute safety. Presidio masking, tenant isolation, local-model mode, hash-chained ledger and a dashboard make controls **verifiable**. Local mode sends 0 bytes externally. |
| *Why two vector databases?* | Qdrant for cloud multi-tenant convenience; Chroma embedded for zero-egress private mode. One interface, config switch. |
| *Why a graph database?* | Lineage for the Passport, graph-based dedupe clusters, and GraphRAG. |
| *Why not let the LLM forecast?* | LLMs are unreliable at numbers. We use Prophet/statsforecast; the LLM only explains. |
| *Why not just rules?* | Rules can't infer that "ph no" is a phone or that "Hydrabad" means Hyderabad in context. LLM + embeddings understand; deterministic code executes. |
| *Is scraping legal?* | We respect robots.txt and ToS, skip logins/paywalls, mask PII, and record a Source Passport. |
| *How do you handle prompt injection in files?* | File content is treated as untrusted data, agents are sandboxed with read-only credentials and approval gates, and a Red Team Agent tests it. |
| *Free-tier fragility?* | Keep-alive pings, caching, LiteLLM failover, StorageAdapter/VectorStore abstractions, offline mode. |
| *Business model?* | Usage-based tiers; stickiness from recipes, Passport history, KPI memory, weekly briefs. |
| *Isn't this just a spreadsheet cleaner?* | No. Cleaning is step one and the #11 core. Any data source flows into the same pipeline, and a crew of agents audits, forecasts, advises and automates on top of trusted data. |
| *Which data sources work?* | Files and pasted URLs now; one database connector; MCP business connectors (Sheets, Stripe, HubSpot, Tally, Gmail) are on the roadmap. |
| *Is it fully built?* | Core and chosen extras are working; the rest is on the roadmap slide, with an honest split. |

## 12. Branding Notes

- Name candidates: **DataCrew** (final working), TrustSheet, DataPilot, TidyAI.
- Voice: confident, plain-English, a touch of humor about spreadsheets.
- Visual signature: score gauge 42 → 94; red/amber/green risk grid; lineage graph.
- Badge idea: "Passport verified ✔" for shared datasets.

## 13. Demo Credits and Ethics Slide

- Credit dataset sources and licenses (Kaggle/UCI/data.gov.in/Wikipedia).
- State: all personal data in the demo is **synthetic** (Faker).
- Scraping demos only on practice sites (books.toscrape.com, quotes.toscrape.com, scrapethissite.com) and Wikipedia tables.



---

# PART 12: BUILD PLAN

## 12 · Build Plan and Repo Skeleton

> Adjust day counts to your real hackathon window. Order matters more than dates: **finish the core before any extra.**

## 1. Repo Skeleton

```
datacrew/
├─ apps/
│  ├─ web/                    Next.js + Tailwind + shadcn/ui
│  │   ├─ app/(app)/workspaces/[id]/{sources,datasets,crew,briefs,privacy,settings}
│  │   ├─ components/         PlanToggleList, DiffGrid, HealthGauge, RiskGrid, ChatPanel...
│  │   └─ lib/                api client, tus upload, gestures
│  └─ api/                    FastAPI
│      ├─ app/{core,api,services,agents,workers}
│      └─ tests/
├─ packages/schemas/          plan_step.schema.json, passport.schema.json
├─ scripts/demo_data/         make_dirty.py (Faker + seeded corruption), make_contract.py
├─ infra/                     docker-compose.yml (api, worker, redis, qdrant, neo4j, ollama), .github/workflows
└─ docs/                      these files
```

## 2. Phase Plan

| Phase | Goal | Tasks | Done when |
|-------|------|-------|-----------|
| **0 Prep** | No surprises later | Sign up for Supabase/Neon, Upstash, Qdrant, Neo4j, Groq, Gemini, Cloudflare Pages, HF now (card requirements unverified for some); write `make_dirty.py`; set GitHub Actions keep-alive; stub `StorageAdapter`, `VectorStore`, `LLMRouter` | Dirty file reproducibly scores ~42 |
| **1 Core engine** | #11 works end to end | tus upload → Parquet; DuckDB profile; health score; plan schema; step executors; execute job; diff; export; recipe export | Score 42 → ~94 on demo file, recipe reruns identically |
| **2 Plan + UI** | Hero screen | LLM plan with JSON-schema validation; toggle list; preview; progress; undo | A judge can upload and approve fixes |
| **3 Crew + ingestion** | DataCrew identity | LangGraph supervisor; Cleaner, Analyst (text-to-SQL guard), Forecaster (Prophet), Strategist; URL scraper; one Postgres connector | Chat returns chart + SQL + source rows; forecast shows confidence band |
| **4 Trust** | Proof | Presidio masking; RLS; audit log; risk grid; Data Passport; privacy dashboard + ledger | Passport page verifies by hash |
| **5 Wow + deep** | Memorability | Pick wow option; then Forecast Accountability, Value-at-Stake, Red Team, Synthetic Twin as time allows | At least wow + 2 deep working |
| **6 Polish** | Demo safety | Rehearse until ~94 every time; backup files; offline mode; roadmap slide; credits slide | Two clean dry runs |

## 3. Cut Rules
- Behind schedule at Phase 3 → drop Auditor, Ops, Point & Say (already roadmap).
- Behind at Phase 5 → ship wow + Forecast Accountability + Value-at-Stake only.
- Never cut: Phase 1 and 2, Data Passport, privacy dashboard.

## 4. Definition of Done (core)
- [ ] Upload CSV/Excel of 100k+ rows without freezing the browser
- [ ] Plan generated from a masked sample only; invalid JSON rejected and retried
- [ ] Every step toggleable; preview matches executed result
- [ ] Health score deterministic (same file, same score)
- [ ] Diff view and per-step undo
- [ ] Download CSV/XLSX + Python/SQL recipe; recipe reproduces output
- [ ] Ledger entry for every LLM call (model, fields masked, bytes out)

## 5. Test Checklist Before Demo
- [ ] Qdrant and Neo4j awake (keep-alive ran)
- [ ] LLM keys valid; failover tested by disabling Groq
- [ ] Local mode (Ollama + Chroma) runs offline
- [ ] Scrape target reachable; backup pre-scraped table ready
- [ ] Cross-tenant access test fails as expected
- [ ] SQL guard rejects non-SELECT and unknown tables
- [ ] Prompt-injection sample file does not change agent behavior

## 6. Suggested Roles (solo or team)
| Role | Phases |
|------|--------|
| Data/AI | 1, 3 (forecast, dedupe), 7 prompts |
| Full-stack | 2, 4 UI, wow layer |
| Infra/security | 0, 4, Red Team, keep-alive |
| Pitch | 6, deck, demo script (file 10) |



---

# PART 13: SCHEMAS AND CONTRACTS

## 13 · Schemas and Contracts

Reference snippets so every file's design has a concrete shape. Treat as starting points.

## 1. Cleaning Plan (LLM output, validated)

```json
{
  "dataset_type": "invoices",
  "steps": [
    {
      "id": "s1",
      "type": "normalize_values",
      "columns": ["city"],
      "params": {"mapping": {"Hyd": "Hyderabad", "hyderabad ": "Hyderabad", "Hydrabad": "Hyderabad"}},
      "rationale": "Variants of one city",
      "confidence": 0.96,
      "risk_level": "low",
      "affected_rows_estimate": 312,
      "reversible": true
    }
  ]
}
```
**Allowed `type` enum:** `drop_duplicates, fuzzy_dedupe, fill_missing, standardize_dates, normalize_values, normalize_phone, rename_columns, split_column, merge_columns, cast_type, remove_rows, flag_outliers, restructure_to_schema, validate_rule`.
`remove_rows` filters use a restricted expression grammar (no arbitrary code).

## 2. Health Score (deterministic)

```
column_score = 100 * (w_c*completeness + w_u*uniqueness + w_k*consistency
                    + w_v*validity + w_o*(1 - outlier_rate) + w_p*(1 - pii_exposed))
dataset_score = weighted mean of column_score (key columns weigh more)
weights (default): completeness .25, uniqueness .20, consistency .20, validity .20, outlier .10, pii .05
```
No LLM in the loop. Store inputs with the score so the Passport can recompute it.

## 3. Data Passport (JSON)

```json
{
  "public_id": "psp_8f2c...",
  "dataset": {"name": "sales_2025.xlsx", "source": {"type": "file", "origin": "upload", "collected_at": "2026-10-09T10:00:00Z"}},
  "score": {"before": 42, "after": 94, "per_column": {"city": [38, 97]}},
  "changes": [{"step_id": "s1", "type": "normalize_values", "approved_by": "user_12", "rows": 312, "undo_ref": "v2"}],
  "risks": {"found": 14, "resolved": 12, "open": 2},
  "lineage": {"versions": ["v0", "v1", "v2"], "recipe_hash": "sha256:..."},
  "privacy": {"fields_masked": 6, "bytes_sent_external": 0, "mode": "local"},
  "content_hash": "sha256:..."
}
```
`content_hash` = SHA-256 of canonical JSON (sorted keys, hash field excluded). "Verify" recomputes it.

## 4. Privacy Ledger Entry (hash chain)

```
entry_hash = SHA256( prev_hash || tenant_id || seq || actor || action || dataset_id
                     || model || fields_masked || bytes_external || payload_hash || ts )
```
Verification walks entries by `seq` and checks each `prev_hash` link. Append-only: no UPDATE/DELETE grants.

## 5. Forecast Accountability Record

```json
{"forecast_id": "f_01", "metric": "revenue", "made_at": "2026-10-09", "horizon": "90d",
 "points": [{"ts": "2026-11-01", "yhat": 12.4, "lower": 10.9, "upper": 13.8}],
 "actuals": [{"ts": "2026-11-01", "actual": 11.7, "abs_pct_error": 0.057, "inside_interval": true}]}
```
Show: MAPE/sMAPE, interval coverage ("actuals fell inside our range 8 of 10 times"), and misses.

## 6. Opportunity (Strategist output)

```json
{"title": "Region B churn is 3x higher",
 "value_at_stake_inr_per_month": "computed, never LLM-generated",
 "assumptions": {"avg_monthly_revenue": "...", "excess_churn_customers": "..."},
 "confidence": "medium",
 "evidence_row_keys": ["c_1042", "c_1077"],
 "next_step": "Review onboarding for Region B"}
```

## 7. Text-to-SQL Guard Rules
1. Parse SQL with a real parser; exactly one statement; must be `SELECT`.
2. Tables/columns must be in the dataset allowlist.
3. Inject `LIMIT` if absent; statement timeout.
4. Execute with read-only credentials.
5. Return `row_keys` of contributing rows for the "source rows" link.

## 8. Example API Calls

```http
POST /datasets/{id}/plan            → 202 {"job_id": "j_1"}
GET  /jobs/j_1                      → {"status":"done","plan_id":"p_9"}
PATCH /plans/p_9/steps/s1           {"approved": false}
POST /plans/p_9/execute             → 202 {"job_id":"j_2"}
GET  /datasets/{id}/diff?step=s1    → changed cells (windowed)
GET  /plans/p_9/recipe?fmt=python   → script
POST /datasets/{id}/chat            {"question":"Which region has the most overdue payments?"}
     → {"answer":"...","chart_spec":{...},"sql":"SELECT ...","source_row_keys":["..."]}
```

## 9. Error Envelope
```json
{"code":"PLAN_INVALID","message":"Plan failed schema validation","hint":"Retried once; falling back to rule-based suggestions","request_id":"r_77"}
```

## 10. Recipe Export (Python shape)
```python
import polars as pl
df = pl.read_parquet("input.parquet")
df = df.unique()                                           # s0 drop_duplicates
df = df.with_columns(pl.col("city").str.strip_chars().replace(MAPPING_CITY))  # s1
# ... one commented block per approved step, in order
df.write_csv("clean.csv")
```



---

# PART 14: INDEX / README

## DataCrew: Project Documentation

An autonomous AI data team. Connect **any data** (files, URLs, databases, MCP business apps); agents clean it, audit it, predict, advise, and prove privacy. Entry problem: **#11 messy data in, trusted data out.**

## Read in this order
| # | File | Read it for |
|---|------|-------------|
| 01 | project_overview | Vision, scope tiers, decision log |
| 02 | non_technical | Story, personas, business, risks |
| 03 | technical | Architecture, pipeline, privacy |
| 04 | frontend | Screens and components |
| 05 | backend | APIs, agents, jobs |
| 06 | database | Schemas, graph, vectors, storage |
| 07 | ai_llm | Prompts, models, Predict & Advise |
| 08 | features_and_modules | Every feature and its priority |
| 09 | techstack_and_services | Tools, limits, stack corrections |
| 10 | user_flow | Inputs, outputs, demo scripts |
| 11 | marketing_and_pitch | Pitch, uniqueness, judge Q&A |
| 12 | build_plan | Day-by-day plan, repo skeleton, definition of done |
| 13 | schemas_and_contracts | Plan JSON schema, score formula, API examples, ledger hashing |

## One-glance summary
- **Core (shown first):** upload → profile → AI plan with toggles → execute on full data → health score 42 → 94 → diff → download → Python/SQL recipe.
- **Trust:** risk grid, Data Passport, privacy dashboard, ledger.
- **Crew build order:** Supervisor → Cleaner → Analyst → Forecaster → Strategist.
- **Wow (pick):** chat + schema mapping, or Point & Say + contract-to-data; plus paste-a-URL ingestion.
- **Deep four:** Forecast Accountability, Value-at-Stake, Red Team Safety Score, Synthetic Twin.
- **Demo ratio:** 50% core / 30% trust and privacy / 20% prediction.



---

# PART 15: OUTPUT CONTRACT (WHAT YOU MUST DELIVER)

## 15.1 Repository layout (final)
```
datacrew/
├─ README.md  STATUS.md  REMAINING.md  CHANGELOG.md  .env.example  Makefile  docker-compose.yml
├─ apps/web/                  frontend
├─ apps/api/                  FastAPI, agents, workers, tests
├─ packages/schemas/          JSON schemas (plan step, passport)
├─ scripts/demo_data/         make_dirty.py, make_contract.py, outputs in data/demo/
├─ infra/                     compose files, GitHub Actions (CI + keep-alive)
└─ docs/                      the spec parts
```

## 15.2 STATUS.md format
```
# Status: vX.Y (date)
## Run it
<exact commands>
## Module status
| Module | Version | State (done/partial/stub) | Tests | Notes |
## Demo checklist
- [ ] upload dirty file → score ~42 ...
## Known issues
```

## 15.3 REMAINING.md format
```
# Remaining work
## P0 (blocks the demo)
## P1 (wow / deep features not finished)
## P2 (roadmap: connectors, ops autopilot, governance, time machine, drift, money leak, KPI layer, impact tracker, billing, compliance)
Each item: what exists | what is missing | how to finish | rough effort (S/M/L)
## Next versions
v1.1 ... v1.x plan
```

## 15.4 Zip
Create `datacrew.zip` at the output location (excluding `node_modules`, `.venv`, `__pycache__`, runtime `data/` except `data/demo/`). Verify by listing the zip contents.

## 15.5 Final message to the user
State: version reached; how to run in 3 commands; what works end to end; what is stubbed or left (point to `REMAINING.md`); which cloud services were not configured; any assumptions; next recommended step.

## 15.6 Start now
Begin with **v0.1**. Do not ask clarifying questions unless something blocks you completely; make reasonable assumptions, record them in `STATUS.md`, and keep building until you reach the highest version you can complete cleanly.
