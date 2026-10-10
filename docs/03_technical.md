# 03 · Technical Document

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
