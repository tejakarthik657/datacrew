# Status: v0.5.0 (2026-10-09)
## Run it
```
make install && make test && make dev     # UI+API on http://localhost:8000
make demo                                 # terminal end-to-end demo
```
Tests: **33 passed** (~75 s) on Python 3.12. Seeded demo: **45.8 → 93.3** health score (spec target "~42 → ~94"), 2328 rows in, 1987 out.

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
| Ingestion (URL scrape, DB connector), wow layer, red team, synthetic twin, fuzzy graph UI | v0.6-0.9 | **not built** | no | see REMAINING.md |

## Demo checklist
- [x] upload dirty file → score ~46 → plan → toggle → apply → score ~93 → diff → download → recipe reruns to same output
- [x] passport issued and verifies; tampering fails verification
- [x] privacy dashboard shows bytes_sent_external = 0 in local mode
- [ ] UI verified only by serving files + API tests; **no browser/visual test was run**

## Assumptions / known issues
- UI is a single HTML file (Next.js not used, allowed by spec). Not browser-tested.
- Upload size capped at 50 MB, whole file in memory. Version scoring makes plan execution ~3 s on the demo; slow on big data.
- Step estimates come from a real dry run; `fill_missing` median/“Unknown” invents values (flagged medium/low risk, toggleable).
- Dates: ambiguous `dd/mm` vs `mm/dd` is read day-first (Indian convention).
- Public passport pages are readable by unguessable id; they contain scores/counts, no row data.
- No cloud services configured. `JWT_SECRET` defaults to a dev value: set it.
