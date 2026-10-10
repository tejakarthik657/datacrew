# Changelog
## v0.6.1 (2026-10-10)
- UI: fixed stale async tab render race; added jsdom end-to-end walkthrough script.
- Passport: canonical hash now stable across JavaScript JSON round trips (regression test).
## v0.6.0 (2026-10-10)
- URL table scraping with Source Passport (robots.txt, SSRF block, size/time/rate limits, PII column flags); read-only SQL connector (SELECT-only guard, SQLite jail, admin role); 'Import from web page' button.
## v0.5.0 (2026-10-09)
- v0.1 skeleton: FastAPI + single-page UI, JWT auth, workspaces/roles, SQLite models, seeded demo generator, Makefile/Docker.
- v0.2 engine: CSV/XLSX/JSON/Parquet upload, profiling, deterministic health score, 14 step executors, versions/undo/restore, diff, CSV/XLSX/Parquet export, Python/SQL/JSON recipes.
- v0.3 plan + UI: rule-based planner, JSON-schema validation with LLM retry-then-fallback, toggles, preview, background jobs with progress, score gauge, per-step undo (re-run).
- v0.4 trust: PII masking before any LLM call, audit log, hash-chained privacy ledger + verify, tenant-isolation tests, risk grid, plain-English rules, Data Passport (JSON, page, verify), privacy dashboard.
- v0.5 crew: Supervisor→Cleaner→Analyst→Forecaster→Strategist state machine with approval gate and Agent Replay; guarded text-to-SQL; Holt-Winters forecasts with intervals; ₹ opportunities with what-if simulator and CEO brief; forecast accountability scoring (API).
