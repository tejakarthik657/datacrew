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
