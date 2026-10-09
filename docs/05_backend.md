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
