# DataCrew Web Frontend (`apps/web`)

Production-grade Next.js 15 App Router web application for **DataCrew: The Autonomous AI Data Team**.

---

## 🌟 Architecture & Features

- **Next.js 15 App Router + React 19**: Modern server components, client interactivity, streaming, and layouts.
- **Backend-For-Frontend (BFF) Pattern**:
  - `/api/session`: Manages authentication with `httpOnly`, `SameSite=Lax`, `Secure` JWT cookies (JWT never touches `localStorage`).
  - `/api/proxy/[...path]`: Catch-all proxy forwarding client requests to the FastAPI backend with the `Authorization: Bearer` header and response streaming.
- **State Management & Querying**: TanStack Query v5 with automatic cancellation on unmount and scoped query keys `['dataset', id, version]`.
- **Design System & Aesthetics**:
  - Linear.app-inspired dark workbench foundation (`#0d0e12`).
  - Semantic token isolation: red/amber/green reserved strictly for risk severity.
  - Multi-agent LangGraph specialist badges: Intake, Cleaner, Auditor, Analyst, Forecaster, Strategist, Ops.
  - Supabase emerald green (`#3ecf8e`) cryptographic trust tokens and Data Passport badges.
  - Tabular monospace numbers (`JetBrains Mono`, `font-variant-numeric: tabular-nums`).

---

## 🚀 Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
API_URL=http://localhost:8000
```

- `NEXT_PUBLIC_API_URL`: Exposed to client code if needed for fallback.
- `API_URL`: Used by Next.js server route handlers (BFF proxy and SSR passport rendering).

---

## 🛠️ Scripts

```bash
# Development server (runs on http://localhost:3000)
pnpm dev

# Type checking
pnpm typecheck

# Code linting
pnpm lint

# Production build
pnpm build

# Start production server
pnpm start

# Run unit tests
pnpm test

# Run end-to-end tests
pnpm e2e

# Regenerate API client types from FastAPI openapi.json
pnpm gen:api
```

---

## 📂 Route Map

| Path | Description | Access |
|---|---|---|
| `/login`, `/register` | Authentication with reactive form validation and BFF session cookies | Public |
| `/datasets` | Workspace datasets grid, file upload, URL import, and demo loader | Authenticated |
| `/datasets/[id]/clean` | Hero screen: before/after score gauge, AI plan toggle, apply, undo | Authenticated |
| `/datasets/[id]/risks` | Risk matrix, PII audit, and natural language custom rules | Authenticated |
| `/datasets/[id]/ask` | Dual-pane natural language chat with data, SQL audit, source rows | Authenticated |
| `/datasets/[id]/forecast` | Time-series forecasting with 80% confidence intervals and score tracking | Authenticated |
| `/datasets/[id]/strategy` | Ranked Rupee (₹) commercial opportunities and CEO executive brief | Authenticated |
| `/datasets/[id]/crew` | Autonomous multi-agent crew mission launcher | Authenticated |
| `/crew/[runId]` | Agent event stream replay and human-in-the-loop approval gate | Authenticated |
| `/datasets/[id]/trust` | Privacy dashboard (quarantined bytes), ledger verification, passport issuer | Authenticated |
| `/datasets/[id]/data` | Paginated data grid, version timeline, and dataset restore | Authenticated |
| `/settings/members` | Workspace member invitation and role management (viewer/editor/admin) | Admin |
| `/settings/audit` | Tamper-evident workspace audit log of user and model actions | Admin |
| `/passport/[publicId]` | Public verifiable Data Passport with SHA-256 cryptographic check | Public (SSR) |

---

## 🔒 Security & Privacy Guarantees

1. **HttpOnly Cookie Auth**: No JWT tokens stored in localStorage.
2. **Local/Masked Privacy**: All chat and planning queries pass through PII masking and redaction layers.
3. **Deterministic Clean Engine**: Scores and cleaning execution run deterministically on Polars engines.
4. **Zero-Knowledge Data Passport**: Public passports display cryptographic SHA-256 hashes without leaking underlying row data.
