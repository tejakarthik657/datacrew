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
