# Status: v0.6.0 (2026-10-10)
## Run it
```
make install && make test && make dev     # UI+API on http://localhost:8000
make demo                                 # terminal end-to-end demo
```
Tests: **47 passed** (~70 s) on Python 3.12. Seeded demo: **45.8 → 93.3** health score (spec target "~42 → ~94"), 2328 rows in, 1987 out.

## Module status
| Module | Version | State | Tests | Notes |
|---|---|---|---|---|
| Skeleton, auth, workspaces, roles | v0.1 | done | yes | local JWT; viewer/editor/admin/owner; no UI for member mgmt |
| Upload, profiling, classification | v0.2 | done | yes | heuristic only (LLM classification not wired); in-memory Polars (no chunked large-file path) |
| Health score | v0.2 | done | yes | deterministic; sensitivities calibrated, see docs/SCORING.md |
| 14 step executors | v0.2 | done | each step type | `validate_rule` is report-only; `restructure_to_schema` takes an explicit mapping (no auto-mapping) |
| Versions, undo, diff, exports, recipes | v0.2 | done | yes | Python recipe embeds engine and reruns to identical output (tested); SQL recipe is partial by design |
| Planner + validation + jobs | v0.3 | done | yes | LLM path (Ollama / OpenAI-compatible) implemented but **not exercised live** |
| Trust: masking, ledger, audit, passport, risk, rules, privacy dashboard | v0.4 | done | yes | regex PII recognisers (Presidio optional, not installed) |
| Crew + analyst + forecaster + strategist | v0.5 | done (simple) | yes | plain state machine, not LangGraph; forecast uses statsmodels Holt-Winters (statsforecast/Prophet not installed); Analyst rules are keyword heuristics |
| Forecast accountability | v0.8 (part) | partial | yes | API only (log + MAPE/sMAPE/coverage), no UI |
| Value-at-stake with editable assumptions | v0.8 (part) | partial | yes | in Strategy tab |
| URL scrape + Source Passport, DB connector | v0.6 | done | yes (fake fetcher, local SQLite) | robots.txt, SSRF block, 5 MB cap, 1 req/s/host; **never run against a live site** (sandbox egress is restricted); DB connector is API-only, admin role, SQLite limited to `<storage>/connectors`, Postgres/MySQL untested; no scheduled re-scrape |
| Wow layer, red team, synthetic twin, fuzzy graph UI | v0.6-0.9 | **not built** | no | see REMAINING.md |

## Demo checklist
- [x] upload dirty file → score ~46 → plan → toggle → apply → score ~93 → diff → download → recipe reruns to same output
- [x] passport issued and verifies; tampering fails verification
- [x] privacy dashboard shows bytes_sent_external = 0 in local mode
- [x] UI walked end to end in jsdom against a live server (`scripts/ui/ui_walkthrough.mjs`, 15 steps: register → demo → plan → preview → apply → recipe → risks → ask → forecast → strategy → crew gate → passport → passport-page verify), zero JS errors
- [ ] **No real browser / visual / mobile check** (no browser in the build sandbox): layout and styling are unreviewed

## Assumptions / known issues
- UI is a single HTML file (Next.js not used, allowed by spec). DOM-tested in jsdom only.
- Bugs the jsdom run caught and fixed: stale async tab renders overwriting the current tab; Data Passport hash failing after a JavaScript JSON round trip (100.0 vs 100).
- Upload size capped at 50 MB, whole file in memory. Version scoring makes plan execution ~3 s on the demo; slow on big data.
- Step estimates come from a real dry run; `fill_missing` median/“Unknown” invents values (flagged medium/low risk, toggleable).
- Null markers also include "ERROR" and "UNKNOWN" (common in dirty Kaggle files); fill_missing constant is now "Not specified" so filled cells are not re-read as missing.
- Timing (synthetic, generated): 100k rows read 0.1 s, score 1.8 s, plan 6 s, apply 2 s per pass; service also scores every step version, so a full execute on 100k rows takes noticeably longer. Not tested at 500k.
- Dates: ambiguous `dd/mm` vs `mm/dd` is read day-first (Indian convention).
- Public passport pages are readable by unguessable id; they contain scores/counts, no row data.
- No cloud services configured. `JWT_SECRET` defaults to a dev value: set it.
