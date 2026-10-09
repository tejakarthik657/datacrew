# DataCrew

An autonomous AI data team: **messy data in, trusted data out**. Upload a dirty file, get a deterministic health score, an AI-proposed cleaning plan with a toggle per step, execution on the full data, a before/after diff, downloads, a re-runnable recipe, a verifiable Data Passport, and a crew (Supervisor → Cleaner → Analyst → Forecaster → Strategist) that answers questions, forecasts and ranks ₹ opportunities.

Runs **fully offline with no keys** (rule-based planner, SQLite, local disk, in-process jobs). Cloud LLMs are optional adapters. Demo data is synthetic (Faker).

## Run (3 commands)
```bash
make install          # venv + dependencies (or: pip install -r apps/api/requirements.txt)
make test             # generates demo data, runs 33 tests (~75 s)
make dev              # http://localhost:8000  (UI + API; docs at /docs)
```
One-shot terminal demo: `make demo`. Docker: `cp .env.example .env && docker compose up`.

## Demo path (UI)
Register → **Load demo** → *Clean* → **Generate AI plan** → toggle steps / preview → **Apply** (score ~46 → ~93) → diff, versions/undo, CSV/XLSX/Parquet, Python/SQL/JSON recipe → *Risks*, *Ask*, *Forecast*, *Strategy*, *Crew* (approval gate + replay) → *Trust* (passport + privacy dashboard).

## Architecture
```
apps/web/index.html      single-page UI (no build step) + passport.html
apps/api/app/main.py     FastAPI routes, error envelope, auth/roles
apps/api/app/services.py tenant-scoped orchestration (datasets, plans, jobs, passport, crew)
apps/api/app/core/       profile, health (deterministic), executors (14 step types), planner (+schema validation),
                         pii, ledger (hash chain), passport, recipe, sqlguard, analyst, forecast, strategist, risk, rules
apps/api/app/{llm,storage,notifier}.py   adapters with local fallbacks
packages/schemas/        plan JSON schema     scripts/demo_data/  seeded generator     docs/  spec parts
```
Key rules enforced in code: the LLM (if any) sees only a masked sample + type profile and returns schema-validated JSON; all execution is deterministic; SQL is SELECT-only behind a parser guard; CSV/XLSX exports are formula-injection-safe; every query is scoped by workspace id from the JWT.

See `STATUS.md` (what is built/tested) and `REMAINING.md` (what is not).
