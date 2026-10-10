# DataCrew Frontend: build prompt + folder structure (Next.js, multi-page, component-based)

Use this file as the instruction for an agent (or developer) who builds `apps/web` as a production-grade Next.js app that talks to the existing FastAPI backend in `apps/api`. The backend does not change. The current single-file UI (`apps/web/index.html`) is the functional reference: port every screen, then delete it.

---
## PART A: THE PROMPT (copy everything in this block)

```
ROLE: You are a senior frontend engineer. Build the DataCrew web app as a production-quality, multi-page,
component-based Next.js application. Work autonomously, commit in small steps, and finish with a working app.

PRODUCT: DataCrew is an AI data team: messy data in, trusted data out. Users upload a dirty file, see a deterministic
health score, review an AI-proposed cleaning plan (toggle per step), apply it, inspect a before/after diff, download
results and a re-runnable recipe, ask questions in plain English, get forecasts and ranked rupee opportunities, run a
multi-agent "crew" with a human approval gate, and issue a hash-verifiable Data Passport. Privacy is a feature:
the UI must make local/masked/no-data-sent status visible.

STACK (fixed):
- Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS, shadcn/ui (Radix), lucide-react.
- Data fetching: TanStack Query v5. Forms: react-hook-form + zod. Tables: TanStack Table (+ TanStack Virtual for >200 rows).
- Charts: Recharts (bar, line + confidence band). No chart image libs.
- API types: generate from the backend OpenAPI (http://localhost:8000/openapi.json) with openapi-typescript; wrap with a
  small typed fetch client. Never hand-write response types that the generator can produce.
- Tests: Vitest + React Testing Library (components), MSW (API mocks), Playwright (e2e on the demo path).
- Lint/format: ESLint (next/core-web-vitals + typescript-eslint strict), Prettier, husky + lint-staged.
- Package manager: pnpm. Node 20+.
- Deploy target: Cloudflare Pages via OpenNext/@cloudflare/next-on-pages (or Vercel for dev). Keep it adapter-agnostic.

BACKEND CONTRACT: The API base URL comes from NEXT_PUBLIC_API_URL (default http://localhost:8000). Auth is a Bearer JWT.
Do NOT keep the JWT in localStorage. Use a Next.js BFF: route handlers under /app/api/session (login/register/logout) that
set an httpOnly, SameSite=Lax, Secure cookie holding the JWT, plus a catch-all proxy /app/api/proxy/[...path] that
forwards to the FastAPI with Authorization: Bearer from the cookie. Browser code only calls /api/proxy/*.
Errors from the API always look like {code, message, hint, request_id}; show message + hint, log request_id.
Long operations (plan generation, execute) return 202 {job_id}; poll GET /jobs/{id} every 400-800 ms with backoff until
status is done|failed, and show real progress (0..1).

SCREENS (routes in section B): login/register, dataset list + upload/import, dataset workspace with tabs
(Clean, Risks & rules, Ask, Forecast, Strategy, Crew, Trust & privacy, Data & versions), crew run page, workspace settings
(members, audit log), public Data Passport page (no auth).

NON-NEGOTIABLE UI RULES:
1. Score display: always show "before -> after" with the number, a gauge, and the version label. Scores come from the API; never compute them client-side.
2. Plan table: one row per step with an Apply checkbox (PATCH /plans/{id}/steps/{sid}), type, columns, rationale, rows affected, risk badge, confidence, and a Preview button (lazy GET .../preview; show changed cells old -> new, removed rows struck through). "Apply approved steps" runs execute and shows progress. Explain that "per-step undo" = untick a step and apply again (engine always reruns from the original).
3. Colour: red/amber/green are reserved for risk and severity. Brand colour for actions. Support light + dark (CSS variables / Tailwind dark class). WCAG AA contrast.
4. Never render API strings as HTML. React escaping only; no dangerouslySetInnerHTML. Render markdown (CEO brief) with a sanitising renderer.
5. Stale-response safety: ignore results of requests for a dataset/tab the user already left (TanStack Query keys include datasetId, version; cancel on unmount).
6. Large data: never request or render more than 500 rows; paginate with offset/limit; virtualise tables.
7. Privacy surface: persistent header chip showing MODE (local/byo/cloud) and "0 bytes sent externally" from GET /privacy/dashboard; link to the ledger verify result.
8. Role-aware UI: read role from GET /auth/me. viewer = read only (hide mutate buttons), editor = upload/plan/apply, admin = members/audit/DB import.
9. Accessibility: keyboard reachable tabs/dialogs, aria-live for job progress and toasts, focus management in dialogs, reduced-motion respected.
10. Every async view has loading, empty, error, and success states (skeleton components, not spinners only).
11. No secrets in the client bundle. Only NEXT_PUBLIC_API_URL is public.

DELIVERABLES:
- apps/web as specified in the folder structure (section B), pnpm scripts: dev, build, start, lint, typecheck, test, e2e, gen:api.
- README.md in apps/web with setup, env vars, scripts, architecture, and how to regenerate API types.
- Playwright e2e that walks: register -> upload demo CSV -> generate plan -> toggle a step -> preview -> apply -> see score rise -> open diff -> download CSV -> ask a question -> run forecast -> strategy what-if -> crew run approve -> issue passport -> verify on public page.
- Component tests for ScoreGauge, PlanTable, StepRow, DiffViewer, JobProgress, RiskBadge, QuestionBox.
- Update STATUS.md / REMAINING.md / CHANGELOG.md honestly (mark anything not verified in a real browser).

DEFINITION OF DONE: pnpm typecheck && pnpm lint && pnpm test pass; pnpm build succeeds; Playwright demo path passes against a
running backend (make dev); Lighthouse a11y >= 90 on the dataset workspace page; no console errors on the demo path.
```

---
## PART B: FOLDER STRUCTURE

```
apps/web/
├─ package.json  pnpm-lock.yaml  tsconfig.json  next.config.ts  tailwind.config.ts  postcss.config.mjs
├─ components.json                      # shadcn/ui config
├─ .env.example                         # NEXT_PUBLIC_API_URL=http://localhost:8000  (API_URL for server-side proxy)
├─ playwright.config.ts  vitest.config.ts  .eslintrc.cjs  .prettierrc
├─ public/                              # logo, favicon, og image
├─ e2e/
│  ├─ demo-path.spec.ts                 # full happy path
│  ├─ tenant-and-roles.spec.ts          # viewer cannot see mutate buttons; 404 pages
│  └─ fixtures/dirty_customers.csv      # copy of data/demo (or the production demo file)
├─ src/
│  ├─ app/                              # ROUTES ONLY (thin: fetch + compose components)
│  │  ├─ layout.tsx                     # fonts, <Providers>, theme
│  │  ├─ globals.css                    # Tailwind layers + CSS variables (light/dark tokens)
│  │  ├─ not-found.tsx  error.tsx  loading.tsx
│  │  ├─ (marketing)/page.tsx           # optional landing (/)
│  │  ├─ (auth)/
│  │  │  ├─ layout.tsx                  # centered card layout
│  │  │  ├─ login/page.tsx
│  │  │  └─ register/page.tsx
│  │  ├─ (app)/                         # authenticated shell (sidebar + header)
│  │  │  ├─ layout.tsx                  # <AppShell>: session guard, role context, privacy chip
│  │  │  ├─ datasets/
│  │  │  │  ├─ page.tsx                 # list + UploadDialog + ImportUrlDialog + ImportDbDialog (admin)
│  │  │  │  └─ [datasetId]/
│  │  │  │     ├─ layout.tsx           # DatasetHeader (name, rows, score before->now) + DatasetTabs
│  │  │  │     ├─ page.tsx             # redirects to ./clean
│  │  │  │     ├─ clean/page.tsx       # plan + apply + result (the hero screen)
│  │  │  │     ├─ risks/page.tsx       # RiskGrid + RuleBuilder
│  │  │  │     ├─ ask/page.tsx         # QuestionBox + AnswerCard (+ SQL, source rows, chart)
│  │  │  │     ├─ forecast/page.tsx    # ForecastForm + ForecastChart + AccountabilityPanel
│  │  │  │     ├─ strategy/page.tsx    # OpportunityList + AssumptionEditor + CeoBrief
│  │  │  │     ├─ crew/page.tsx        # start run; links to /crew/[runId]
│  │  │  │     ├─ trust/page.tsx       # PrivacyDashboard + LedgerStatus + PassportIssuer
│  │  │  │     └─ data/page.tsx        # DataGrid (paged) + ProfileTable + VersionTimeline
│  │  │  ├─ crew/[runId]/page.tsx       # AgentReplay timeline + ApprovalGate
│  │  │  └─ settings/
│  │  │     ├─ members/page.tsx         # admin: list/add members + roles
│  │  │     └─ audit/page.tsx           # admin: audit log table
│  │  ├─ passport/[publicId]/page.tsx   # PUBLIC: PassportView + VerifyButton (no auth, server-rendered)
│  │  └─ api/                           # BFF (server only)
│  │     ├─ session/route.ts            # POST login/register -> set httpOnly cookie; DELETE logout
│  │     └─ proxy/[...path]/route.ts    # forwards to FastAPI with Bearer from cookie; streams downloads
│  ├─ components/
│  │  ├─ ui/                            # shadcn primitives (button, dialog, tabs, table, badge, toast, skeleton, ...)
│  │  ├─ layout/                        # AppShell, Sidebar, Header, PrivacyChip, ThemeToggle, DatasetTabs, UserMenu
│  │  ├─ feedback/                      # JobProgress, EmptyState, ErrorState (shows hint + request_id), Skeletons
│  │  ├─ dataset/                       # DatasetList, DatasetCard, UploadDialog, ImportUrlDialog, ImportDbDialog, DatasetHeader
│  │  ├─ score/                         # ScoreGauge, ScoreDelta (before->after), ColumnScoreBars
│  │  ├─ plan/                          # PlanTable, StepRow, StepPreview, RiskBadge, ApplyBar, ResultCard
│  │  ├─ diff/                          # DiffViewer (changed cells old->new, removed rows), DiffToolbar
│  │  ├─ versions/                      # VersionTimeline, RestoreButton, UndoButton
│  │  ├─ downloads/                     # DownloadMenu (csv/xlsx/parquet), RecipeTabs (python/sql/json) + CopyButton
│  │  ├─ risks/                         # RiskGrid, RuleBuilder, ViolationList
│  │  ├─ ask/                           # QuestionBox, AnswerCard, SqlBlock, SourceRows, BarChart
│  │  ├─ forecast/                      # ForecastForm, ForecastChart (history + dashed forecast + band), AccountabilityPanel
│  │  ├─ strategy/                      # OpportunityCard, AssumptionEditor, WhatIfButton, CeoBrief (sanitised markdown)
│  │  ├─ crew/                          # CrewStarter, AgentReplay, AgentEvent, ApprovalGate
│  │  ├─ trust/                         # PrivacyDashboard, LedgerStatus, PassportIssuer, PassportView, VerifyButton
│  │  └─ data/                          # DataGrid (virtualised), ProfileTable
│  ├─ lib/
│  │  ├─ api/
│  │  │  ├─ client.ts                   # typed fetch wrapper -> /api/proxy; throws ApiError{code,message,hint,requestId}
│  │  │  ├─ schema.d.ts                 # GENERATED by openapi-typescript (do not edit)
│  │  │  ├─ endpoints/                  # datasets.ts plans.ts jobs.ts analysis.ts trust.ts crew.ts auth.ts
│  │  │  └─ jobs.ts                     # pollJob(jobId, {onProgress, signal}) with backoff
│  │  ├─ hooks/                         # useSession, useRole, useDataset, usePlan, useJob, useDiff, useDownload, useDebounce
│  │  ├─ query/                         # queryClient.ts, queryKeys.ts (['dataset', id, version], ['plan', id], ...)
│  │  ├─ auth/                          # session helpers (server: read cookie; client: /auth/me)
│  │  ├─ format/                        # number, rupee (en-IN), percent, date helpers
│  │  ├─ schemas/                       # zod schemas for forms (login, rule text, forecast params, assumptions)
│  │  └─ utils.ts                       # cn(), assertNever(), download blob helper
│  ├─ providers/                        # Providers.tsx (QueryClient, Theme, Toaster, SessionContext)
│  ├─ types/                            # app-level view models derived from schema.d.ts (e.g. PlanStepVM)
│  ├─ styles/                           # tokens.css (semantic colours: --risk-red/amber/green, --brand)
│  └─ test/                             # setup.ts, msw handlers (mirror API envelope), test-utils.tsx
└─ README.md
```

### Routing and layout rules
| Concern | Rule |
|---|---|
| Pages | `app/**/page.tsx` files stay thin: read params, call hooks/server fetch, compose components from `components/` |
| Route groups | `(auth)` public auth, `(app)` authenticated shell, `passport/[publicId]` public and SSR, `(marketing)` optional |
| Auth guard | `(app)/layout.tsx` checks the session cookie server-side; no cookie -> redirect `/login?next=` |
| Dataset tabs | nested layout at `datasets/[datasetId]/layout.tsx` so header + score stay mounted while tabs switch |
| Server vs client | Server Components for shells and the public passport page; Client Components for interactive tabs (`"use client"` only where needed) |
| Data fetching | TanStack Query in client components; query keys always include `datasetId` (and `version`) to prevent stale views |
| Downloads | go through the proxy route and stream; never buffer big files in React state |

### Route map -> backend endpoints
| Route | Calls |
|---|---|
| `/login` `/register` | `POST /auth/login`, `POST /auth/register` (via BFF cookie), `GET /auth/me` |
| `/datasets` | `GET /datasets`, `POST /datasets` (multipart), `POST /datasets/from-url`, `POST /datasets/from-db` (admin) |
| `/datasets/[id]` header | `GET /datasets/{id}` (score, versions, profile), `GET /health` (mode) |
| `/datasets/[id]/clean` | `POST /datasets/{id}/plan` -> `GET /jobs/{id}` -> `GET /plans/{id}`; `PATCH /plans/{id}/steps/{sid}`; `GET /plans/{id}/steps/{sid}/preview`; `POST /plans/{id}/execute` -> job; `GET /datasets/{id}/diff`; `GET /datasets/{id}/export?fmt=`; `GET /plans/{id}/recipe?fmt=`; `POST /datasets/{id}/undo`; `POST /datasets/{id}/versions/{n}/restore` |
| `/datasets/[id]/risks` | `GET /datasets/{id}/risks[?version=0]`, `POST /datasets/{id}/rules` |
| `/datasets/[id]/ask` | `POST /datasets/{id}/chat` (answer, sql, columns, rows, source_row_keys, chart_spec) |
| `/datasets/[id]/forecast` | `POST /datasets/{id}/forecast`, `POST /forecasts/{id}/score` |
| `/datasets/[id]/strategy` | `GET /datasets/{id}/strategy`, `POST /datasets/{id}/strategy/simulate` |
| `/datasets/[id]/crew`, `/crew/[runId]` | `POST /crew/run`, `POST /crew/runs/{id}/approve`, `GET /crew/runs/{id}` |
| `/datasets/[id]/trust` | `GET /privacy/dashboard`, `GET /ledger/verify`, `POST /datasets/{id}/passport` |
| `/datasets/[id]/data` | `GET /datasets/{id}/rows`, `GET /datasets/{id}/versions` |
| `/passport/[publicId]` | `GET /passports/{id}` (public), `POST /passports/verify` (public) |
| `/settings/members` `/settings/audit` | `GET/POST /workspaces/members`, `GET /audit` (admin) |

### Component contracts (props the agent must implement)
| Component | Key props | Behaviour |
|---|---|---|
| `ScoreGauge` | `value:number`, `label`, `size?` | semicircle SVG, number centered, aria-label with value |
| `ScoreDelta` | `before`, `after` | "46 -> 93" with +delta, uses ScoreGauge twice |
| `PlanTable` | `plan`, `onToggle(stepId,bool)`, `onPreview(stepId)` | virtualise if >100 steps; disabled while applying |
| `StepRow` | `step`, `approved`, `expanded` | risk badge, confidence %, lazy preview panel |
| `JobProgress` | `jobId`, `onDone(result)`, `onError(err)` | polls `pollJob`, `aria-live="polite"`, cancel on unmount |
| `DiffViewer` | `diff`, `onPage(offset)` | changed cells old -> **new**, removed rows struck, added/dropped/renamed columns summary |
| `RecipeTabs` | `planId` | lazy-load text per format; Copy + Download |
| `RiskGrid` | `risks` | severity badges (red/amber), sorted by severity then count |
| `QuestionBox` / `AnswerCard` | `datasetId` / `result` | shows SQL read-only, source row ids, bar chart if `chart_spec` |
| `ForecastChart` | `history[]`, `points[]` | line + dashed forecast + shaded 80% band; table fallback |
| `OpportunityCard` | `opportunity`, `onAssumptionsChange` | rupee formatting (en-IN), editable assumptions, "Recalculate" |
| `ApprovalGate` | `run`, `onDecide(bool)` | only when `status==="awaiting_approval"` and role>=editor |
| `PassportView` | `doc` | score before/after, risks found/resolved/open, changes table, hashes, Verify button result |
| `PrivacyChip` | - | mode + bytes_sent_external + ledger ok from `/privacy/dashboard` |

### Design tokens (Tailwind + CSS variables)
`--brand` (actions), `--bg`, `--card`, `--ink`, `--mute`, `--line`, and semantic `--risk-red`, `--risk-amber`, `--risk-green`. Reserve the three risk colours for severity only. System font stack or Inter. Radius 8-10 px. Light + dark.

### Folder-level conventions
- One component per file, named export, props typed, co-located `*.test.tsx`; stories optional.
- `components/ui` is generated by shadcn; do not put business logic there.
- No API calls inside `components/ui`; business components receive data via props or hooks from `lib/hooks`.
- Everything user-visible text goes through a single `copy` object per feature folder (easy later i18n).
- Absolute imports via `@/*`.

---
## PART C: BUILD ORDER FOR THE AGENT
1. Scaffold (`create-next-app`, Tailwind, shadcn init), tokens, providers, `gen:api` script, BFF session + proxy routes.
2. Auth pages + AppShell + role context + PrivacyChip.
3. Datasets list + UploadDialog (then ImportUrl/ImportDb).
4. Dataset layout + header + tabs; **Clean tab** (PlanTable, JobProgress, preview, apply, ScoreDelta, DiffViewer, versions, downloads, recipes). This is the hero; get it fully tested first.
5. Risks, Ask, Forecast, Strategy, Crew (+ approval gate), Trust (+ public passport page), Data & versions, Settings.
6. Playwright demo path, a11y pass, dark mode pass, mobile widths (>= 360 px), performance check on a 20k-row dataset.
7. Remove `index.html`/`passport.html` from `apps/web` only after the new app passes the demo path; update docs.

## PART D: INVARIANTS FROM THE BACKEND (the frontend must respect these)
- Row ids (`_row_id`) are stable across versions; show them as "#id" in diffs/evidence.
- Jobs: plan generation and execute are async (202 + job id).
- `current_version` can move backward (undo/restore); always refetch dataset after those calls.
- Passport page is public and read-only; verify endpoint is public; never include row data in it.
- Exports exclude `_row_id`. Error envelope is `{code,message,hint,request_id}`.
- Roles: viewer < editor < admin < owner; hide, but do not rely on hiding for security (the API enforces).
