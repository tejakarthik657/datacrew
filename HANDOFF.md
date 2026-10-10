# DataCrew: Handoff to the next agent (state at v0.6.1, 2026-10-10)

Goal: continue from this repo to **v1.0**. Read this file first, then `STATUS.md`, `REMAINING.md`, and the spec in `docs/` (`docs/00_MASTER_BUILD_PROMPT.md` is the full original; `docs/12_build_plan.md` = phases and Definition of Done, `docs/15_output_contract.md` = what the final delivery must contain).
Author's note: the version labels below (v0.7 chat-to-clean, v0.8 deep four, v0.9 graph dedupe, v1.0 polish) were taken from my reading of the spec; **re-verify them against `docs/12_build_plan.md` and `docs/15_output_contract.md` before planning.**

## 1. Product in one paragraph
DataCrew = autonomous AI data team: messy data in, trusted data out. Upload → deterministic health score → proposed cleaning plan (toggle per step) → run on full data → diff, versions/undo, downloads, re-runnable recipe → Data Passport (hash-verifiable) → crew (Supervisor, Cleaner, Analyst, Forecaster, Strategist). Privacy: the LLM (optional) only sees a masked sample + type profile; everything that changes data is deterministic code.

## 2. Progress summary
| Area | Done | Left (to v1.0) |
|---|---|---|
| Spec phases 0-4 (prep, core engine, plan+UI, crew+ingestion, trust) | ~85% in a simplified, local-first form | scale path, Presidio/RLS, LangGraph, Prophet, live LLM tests |
| Phase 5 (wow + deep four) | Value-at-Stake (partial), Forecast Accountability (API only) | chat-to-clean wow, Red Team, Synthetic Twin, accountability UI |
| Phase 6 (polish) | nothing beyond README/docs | browser/mobile pass, perf, rehearsal, backup/offline checks |
| Overall to v1.0 | roughly 60% | see backlog in section 9 |

Tests: **47 passing** (`make test`, ~70 s) + a 15-step jsdom UI walkthrough (`scripts/ui/ui_walkthrough.mjs`). Demo: seeded file scores **45.8 → 93.3** (2328 rows → 1987).
**Never verified:** real browser rendering/mobile; any live LLM; any live website scrape; Postgres/MySQL; Docker image build; GitHub CI (`infra/ci.yml` is a template to copy into `.github/workflows/`).

## 3. Stack as built (and deviations from the spec)
| Spec | Built | Why / note |
|---|---|---|
| Next.js frontend | single `apps/web/index.html` (vanilla JS, no build) + `passport.html` | fast, zero tooling; spec allows alternatives. Port to Next only if needed |
| Supabase/Postgres + RLS | SQLAlchemy 2, SQLite default (Postgres via `DATABASE_URL`, untested). Tenant isolation = every query filtered by `workspace_id` from the JWT (tested) | RLS not implemented |
| Arq/Redis jobs | FastAPI `BackgroundTasks` + `jobs` table (progress polling) | no worker process |
| LangGraph + Langfuse | plain state machine in `services.crew_start/crew_continue` + event list (Agent Replay) | |
| Prophet/statsforecast | statsmodels Holt-Winters (damped), seasonal-naive/mean fallbacks, 80% interval from residual sigma | |
| Presidio | regex recognisers (email, phone, Aadhaar-like, PAN); Presidio auto-detected but not installed | |
| tus resumable upload, 100k+ rows | plain multipart, 50 MB cap, whole file in Polars memory | biggest DoD gap |
| DuckDB profiling | Python/Polars profiling; DuckDB only used for guarded text-to-SQL | |
| LiteLLM router | `llm.py`: Mock (default), Ollama, OpenAI-compatible (Groq/OpenRouter/Gemini-compat) via httpx | external provider only in `MODE=byo|cloud` |
| Qdrant/Neo4j/Chroma | not used | needed only for v0.9 graph/semantic features |

Runtime: Python 3.12, polars 2.0, duckdb 1.5, fastapi 0.143, sqlalchemy 2.1, sqlglot 30, rapidfuzz, networkx, statsmodels, bs4+lxml, PyJWT, bcrypt. Install: `make install` (venv) then `make dev` (http://localhost:8000, API docs at `/docs`).

## 4. Repository map
```
apps/api/app/
  main.py        routes, error envelope {code,message,hint,request_id}, auth deps, static UI + demo file route
  services.py    ALL orchestration, tenant-scoped (datasets, versions, plans, jobs, diff, export, rules, chat, forecast, strategy, passport, crew, ingest)
  db.py          models: User Workspace Membership Dataset DatasetVersion Plan Job AuditLog LedgerEntry Passport ForecastRecord CrewRun
  auth.py        bcrypt + JWT (token carries user id + workspace id); roles viewer<editor<admin<owner via require("role")
  llm.py         LLMRouter adapters (mock/ollama/openai_compat) incl. plan JSON + text_to_sql prompts
  storage.py     StorageAdapter + LocalStorage (path-traversal safe)     notifier.py  console + file log
  config.py      env settings (MODE, LLM_*, JWT_SECRET, MAX_UPLOAD_MB ...)
  core/
    common.py    null tokens, parse_number/parse_date_fmt/phone_digits, map_unique, ROW_ID="_row_id"
    readers.py   CSV/TSV/XLSX/JSON/Parquet -> all-string Polars + _row_id; export csv/xlsx/parquet (formula-injection safe)
    profile.py   semantic type inference (id,email,phone,aadhaar,pan,date,numeric,name,category,text)
    clusters.py  variant clustering ("Hyd"/"hyderabad "/"Hydrabad" -> "Hyderabad"), name_canonical ("Kumar, Ravi" -> "Ravi Kumar")
    health.py    DETERMINISTIC score (see section 6); recompute_from_inputs for passport verify
    executors.py 14 step executors + apply_step/apply_steps + count_changes + restricted condition grammar
    planner.py   rule_based_plan (runs detectors on the evolving frame), generate_plan (LLM -> schema validate -> 1 retry -> fallback), plan schema validation
    pii.py       detection, placeholders, masked_sample, Aadhaar/PAN masking
    ledger.py    hash-chained privacy ledger + audit helper + privacy_summary
    passport.py  canonical JSON (integral floats normalised) + SHA-256, verify (hash + score recompute)
    recipe.py    Python recipe (embeds engine source, reruns identically), partial SQL recipe, JSON recipe
    sqlguard.py  sqlglot guard (single SELECT, table `data`, column allowlist, LIMIT inject, no read_*/pragma), DuckDB run with 5 s timeout, source_row_keys
    analyst.py   keyword heuristic question->SQL + chart_spec (LLM SQL used if configured, always guarded)
    forecast.py  monthly series, Holt-Winters, intervals, score_forecast (MAPE/sMAPE/coverage)
    strategist.py opportunities (receivables, segment concentration, forecast downside), value formula, CEO brief markdown
    risk.py rules.py ingest.py   risk grid, plain-English rules, URL scraper + DB connector
apps/web/index.html, passport.html          packages/schemas/plan.schema.json
scripts/demo_data/make_dirty.py (seeded, Faker)   scripts/run_demo.py (terminal demo)   scripts/ui/ui_walkthrough.mjs (jsdom)
apps/api/tests/  conftest.py (session-scoped fixtures, temp DB) test_core.py test_api.py test_ingest.py
docs/ spec parts + SCORING.md        infra/ci.yml   Makefile Dockerfile docker-compose.yml .env.example
```

## 5. Invariants: do NOT break these
1. **Row identity:** every frame carries `_row_id` (Int64, 1..n from upload). Executors must keep it; `apply_step` raises if dropped. Diff, SQL source rows, evidence and undo all depend on it. Exports drop it.
2. **All-string ingestion:** files are read as text (dirty values must survive). Typing happens only via plan steps (`cast_type`). Profile/health handle both string and numeric dtypes through `str_values`.
3. **Determinism:** no LLM in scoring, execution, forecasting numbers or ₹ values. LLM output is only a *plan* (schema-validated, `affected_rows_estimate` recomputed by dry run) or candidate SQL (guarded).
4. **Execution always restarts from v0** with the currently approved steps; versions append monotonically (one version per step); "per-step undo" = untick + re-apply; `undo`/`restore` only move `current_version`.
5. **Tenant isolation:** never query a table without `workspace_id` filter derived from `Ctx`; add a cross-tenant 404 test for every new endpoint (pattern in `test_tenant_isolation`).
6. **Privacy:** anything sent to an external LLM goes through `masked_sample` + `profile_for_llm` (no raw samples/top values), and writes a ledger row (model, fields_masked, bytes_external). `MODE=local` must send nothing external. Ledger is append-only; verify tamper test must stay green.
7. **Passport canonicalisation:** hash is over `_norm` JSON (sorted keys, ints for integral floats). Any new passport field must survive a JS `JSON.parse/stringify` round trip (a regression test exists).
8. **Safety rails:** SQL guard and connector guard stay allowlist-based; CSV/XLSX export keeps formula-injection neutralisation; URL ingest keeps SSRF block + robots + size/rate limits; remove_rows/validate_rule use the restricted grammar (never eval).
9. **UI rule:** async tab views must check `S.rid` before writing to `#pane` (stale-render bug fixed once).
10. Colors red/amber/green are reserved for risk semantics in the UI.

## 6. Key contracts
**Plan JSON** (`packages/schemas/plan.schema.json`): `{dataset_type, steps:[{id:"s<n>", type, columns[], params{}, rationale, confidence 0-1, risk_level low|medium|high, affected_rows_estimate int, reversible bool}]}`; approvals stored separately (`Plan.approvals_json`, default approved unless risk high).

**Step types and params**
| type | columns | params |
|---|---|---|
| drop_duplicates | optional subset | - |
| fuzzy_dedupe | key columns | threshold (92); blocks by first 3 chars of key, rapidfuzz ratio, networkx components, survivor = first row with nulls filled from the rest |
| fill_missing | targets | strategy median/mean/constant/mode/ffill, value |
| standardize_dates | targets | format (default %Y-%m-%d); day-first for ambiguous |
| normalize_values | targets | mapping{raw:canon}, strip, case lower/upper/title, reorder_comma_names, null_tokens, mask aadhaar/pan |
| normalize_phone | targets | - (10-digit Indian mobile, invalid → null) |
| rename_columns | - | mapping{old:new} |
| split_column / merge_columns | source(s) | into, delimiter/regex, keep_original / into, separator, drop_sources |
| cast_type | targets | to float/int/str/date/bool, strip_non_numeric, min, max_median_multiple |
| remove_rows | cols used | where: {all|any:[..]} or {column, op eq/ne/in/contains/regex/is_null/not_null/lt/gt/lte/gte/between, value, ci} |
| flag_outliers | numeric | action flag/cap/null, iqr_k (3.0) |
| restructure_to_schema | - | target_columns{target:source|null}, drop_unmapped |
| validate_rule | col | rule JSON (report-only; never mutates) |

**Health score** (`core/health.py`, documented in `docs/SCORING.md`): `col = 100*(.25 comp + .20 uniq + .20 cons + .20 valid + .10 (1-outlier) + .05 (1-pii))`, each dim `1-min(1, SENS*issue_rate)` with SENS comp 3, uniq 10, cons 5, valid 7, outlier 12 (calibrated to hit ~46/93 on the demo; spec left them open). Dataset score = weighted mean (id/email/name/numeric ×2, text ×0.5). Per-column inputs are stored so the passport can recompute it.

**Ledger hash:** `sha256(prev|tenant|seq|actor|action|dataset|model|fields_masked|bytes_external|payload_hash|ts)`.
**Passport:** `{public_id, dataset{name,source{...,collected_at}}, score{before,after,per_column,after_inputs}, changes[], risks{found,resolved,open}, lineage{versions,recipe_hash}, privacy{fields_masked,bytes_sent_external,mode}, content_hash}`; public read by unguessable id; `POST /passports/verify` is public.

## 7. HTTP API (all JSON; Bearer JWT unless noted)
Auth: `POST /auth/register|login|switch`, `GET /auth/me`, `GET|POST /workspaces/members` (admin). Datasets: `POST /datasets` (multipart), `POST /datasets/from-url` (editor), `POST /datasets/from-db` (admin), `GET /datasets`, `GET /datasets/{id}`, `/rows`, `/versions`, `POST /versions/{n}/restore`, `POST /undo`, `GET /diff?step|frm|to|offset|limit`, `GET /export?fmt=csv|xlsx|parquet&version`, `POST|GET /rules`... (`POST /datasets/{id}/rules`), `GET /risks`. Plans: `POST /datasets/{id}/plan` → 202 job, `GET /jobs/{id}`, `GET /plans/{id}`, `PATCH /plans/{id}/steps/{sid}` {approved}, `GET .../steps/{sid}/preview`, `POST /plans/{id}/execute` → 202 job, `GET /plans/{id}/recipe?fmt=python|sql|json`. Analysis: `POST /datasets/{id}/chat|forecast`, `POST /forecasts/{id}/score`, `GET /datasets/{id}/strategy`, `POST .../strategy/simulate`. Trust: `GET /ledger/verify`, `/privacy/dashboard`, `/audit` (admin), `POST /datasets/{id}/passport`, `GET /passports/{id}` (public), `POST /passports/verify` (public). Crew: `POST /crew/run`, `POST /crew/runs/{id}/approve`, `GET /crew/runs/{id}`. Static: `/`, `/passport/{id}`, `/demo/dirty_customers.csv`, `/health`, `/docs`.

## 8. Gotchas learned the hard way
- Polars 2.0 API; ints/floats: casting yields Float64; `replace_strict` avoided; use `map_unique` for per-distinct transforms.
- Diffing across versions must account for `rename_columns` (`services.rename_between`); preview of a single step diffs before/after directly.
- `TestClient` runs BackgroundTasks synchronously after the response, so job tests just poll once; in production they run after response in-process.
- Test fixtures are session-scoped (one temp DB for the whole run): tests share state; `test_tenant_isolation` and role tests depend on earlier uploads.
- Version scoring runs on every step version (≈3 s for the demo): slow on large data; compute only final + on demand when optimising.
- The Python recipe embeds `common/clusters/pii/rules/executors` source with `from .` imports stripped; if you add a module executors depend on, add it to the list in `recipe.recipe_python` and keep the recipe-rerun test green.
- Analyst heuristics match words to column names (works on cleaned names like `amount_inr`, `city`, `status`; fails on raw headers) — expected until an LLM/semantic matcher is added.
- sqlite file connector must be under `<STORAGE_DIR>/connectors`.
- Default `JWT_SECRET` is a dev value; set it for anything non-local.

## 9. Backlog to v1.0 (ordered; each item has an acceptance check)
| # | Item | Where / how | Done when |
|---|---|---|---|
| 1 | **Real browser pass** | `make dev`, walk demo; fix layout, mobile, a11y; screenshots | demo path clean on desktop + phone width |
| 2 | **Scale path** (DoD: 100k+ rows) | chunked/resumable upload (tus or multipart chunks), stream to Parquet, switch profiling/health/executors to Polars lazy or DuckDB; score only final version by default; paginate diff | 200k-row file uploads, plans and applies without UI freeze (jobs + progress) |
| 3 | **Chat-to-clean (v0.7 wow)** | new endpoint `POST /plans/{id}/steps` accepting NL → LLM (or heuristics) → one validated step (reuse schema, dry-run estimate, risk) appended unapproved; UI chat box in Clean tab; reuse `restructure_to_schema` for target-schema mapping | "convert dates to ISO and drop rows where city is empty" yields 2 valid previewable steps |
| 4 | **Contract-to-Data check** (spec §13/3.7) | extract rules from pasted policy text → rule JSON (`rules.py` kinds) → violations report; `scripts/demo_data/make_contract.py` | contract with 3 clauses flags the right rows |
| 5 | **Red Team agent + Safety Score (v0.8)** | adversarial checks: prompt-injection strings in cells, formula injection, PII leaks in outputs, SQL guard fuzz; score + report page; add injection sample file test (spec checklist) | injection file does not alter agent behaviour; safety score shown on passport |
| 6 | **Synthetic Twin (v0.8)** | generate privacy-safe synthetic rows from profile distributions (Faker + sampled marginals), compare score/stats, no real values copied | twin passes "no row equals a real row" test |
| 7 | **Forecast Accountability UI + Value-at-Stake polish** | UI for logging/scoring forecasts (API exists); history of calls with hit/miss | after entering actuals, UI shows MAPE and coverage text |
| 8 | **Fuzzy dedupe at scale + merge review UI + lineage graph (v0.9)** | blocking + Splink or rapidfuzz process.cdist; review screen to accept/split clusters; graph via networkx → JSON → SVG (Neo4j optional) | 100k rows dedupe < 60 s; reviewer can undo a merge |
| 9 | **Live LLM path** | run Ollama locally and one OpenAI-compatible provider; verify masked payload, retry-on-invalid-JSON, ledger bytes_external > 0 only in byo/cloud; add failover (Groq → Gemini → Ollama) | tests with a stub HTTP server + one manual live run documented |
| 10 | **Presidio + Postgres RLS** | optional dependency path in `pii.py`; Postgres `DATABASE_URL` run of full tests; add RLS policies or keep app-level filter with tests | suite green on Postgres |
| 11 | **LangGraph + Langfuse port** | map `crew_*` nodes; keep approval gate + event schema (UI reads `events`) | crew tests unchanged |
| 12 | **Prophet/statsforecast backend** (optional) | behind `forecast.forecast_series`, keep Holt-Winters fallback | same API, better backtests |
| 13 | **Ingestion extras** | live URL test + backup pre-scraped table; DB import UI; Postgres/MySQL tests; scheduled re-scrape (Arq/cron) | demo URL imports; connector UI works |
| 14 | **Polish (phase 6)** | rehearse demo until ~94 every time; backup files; offline mode check; docs refresh; CI enabled (`infra/ci.yml` → `.github/workflows/`); Docker build verified | two clean dry runs |
| P2 | Roadmap only | MCP connectors, ops autopilot/scheduling, governance, data time machine UI, drift sentinel, money-leak finder, KPI truth layer, impact tracker, billing, compliance | not required for v1.0 |

Suggested order: 1 → 2 → 9 → 3 → 4 → 5 → 6 → 7 → 8 → 14, then 10-13 as time allows. Per the spec's cut rules: never cut core engine, plan UI, Data Passport, privacy dashboard; if short on time ship wow (3) + Forecast Accountability (7) + Value-at-Stake only.

## 10. Spec Definition of Done check (docs/12 §4)
| Item | State |
|---|---|
| Upload 100k+ rows without freezing | **not met** (50 MB cap, in-memory, no chunking) |
| Plan from masked sample only; invalid JSON rejected + retried | met in code (schema validate + 1 retry + fallback); live LLM untested |
| Every step toggleable; preview matches executed result | met (preview = dry run on same frames) |
| Deterministic score | met (tested) |
| Diff view and per-step undo | met |
| CSV/XLSX download + Python/SQL recipe reproduces output | met for Python (tested identical); SQL recipe is partial by design |
| Ledger entry for every LLM call | met (plan_generation/chat rows; bytes_external only counted for external providers) |
Test checklist (docs/12 §5): cross-tenant test ✔, SQL guard ✔; not done: failover test, offline Ollama+Chroma run, prompt-injection sample file, keep-alives, scrape backup.

## 11. How to work in this repo
```
make install && make test        # 47 tests; regenerate demo data automatically
make dev                         # UI+API on :8000
make demo                        # terminal end-to-end
cd scripts/ui && npm i jsdom && node ui_walkthrough.mjs   # needs server on :8765 (DATABASE_URL/STORAGE_DIR temp)
```
Conventions: add a test with every feature (core in `test_core.py`, HTTP in `test_api.py`/`test_ingest.py`); keep error envelope; new executors go in `executors.REGISTRY` + `STEP_TYPES` + `plan.schema.json` enum + planner/UI/recipe handling; update `STATUS.md` (what is real vs stub), `REMAINING.md`, `CHANGELOG.md` at the end of every work session; commit with git. Be honest in STATUS: label anything not exercised live as untested.
