# 14 · UX and Design System (Production-Level SaaS)

> Goal: DataCrew must feel like a **finished, trustworthy B2B product**, not a hackathon demo. Calm, fast, honest, accessible. Every AI action is visible, reversible and explained.

## 1. UX Principles

1. **Nothing silent.** AI proposes; the user approves. Every change shows what, why, how many rows, and an Undo.
2. **Show, don't tell.** Before/after, score gauges, diffs and evidence rows beat paragraphs.
3. **Trust is visible.** Health score, Passport, privacy mode and approval state are always one click away.
4. **Progressive disclosure.** Simple default (approve fixes), depth on demand (rationale, SQL, lineage, replay).
5. **Plain English.** No jargon in primary UI ("Fix inconsistent city names", not "normalize_values").
6. **Forgiving.** Undo everywhere, autosave, confirm only destructive actions, never lose uploads.
7. **Fast feel.** Instant feedback (<100 ms), skeletons over spinners, streaming progress for long jobs.
8. **Honest uncertainty.** Confidence, ranges and "I'm not sure" are shown, never hidden.
9. **Accessible by default.** Keyboard-first, screen-reader friendly, gestures optional.
10. **Consistent.** One design system, one component per job.

## 2. Brand and Voice

| Attribute | Direction |
|-----------|-----------|
| Personality | Calm, precise, quietly confident, a touch of dry humor about spreadsheets |
| Tone | Plain, active, specific. No hype, no "magic". |
| Examples | Good: "Found 214 duplicate rows. Review before removing." Avoid: "Oops! Something went wrong 😅" |
| Naming | "Cleaning plan", "Fix", "Data Passport", "Crew" (not "pipeline", "transformation") |
| Emoji | Not in product UI; allowed sparingly in marketing |

## 3. Design Tokens

### 3.1 Color (semantic tokens; light and dark)
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--bg` | #FFFFFF | #0B1020 | App background |
| `--surface` | #F6F8FB | #121A2E | Cards, panels |
| `--surface-raised` | #FFFFFF | #18223A | Popovers, modals |
| `--border` | #E3E8F0 | #26324D | Dividers |
| `--text` | #0F172A | #E6EAF4 | Primary text |
| `--text-muted` | #5B6678 | #9AA6BF | Secondary text |
| `--brand` | #1F6FEB | #4C8DFF | Primary actions |
| `--brand-contrast` | #FFFFFF | #0B1020 | Text on brand |
| `--success` | #12805C | #3DD6A0 | Approved, score good, green risk |
| `--warning` | #B7791F | #F5B544 | Amber risk, caution |
| `--danger` | #C0392B | #FF6B5E | Red risk, destructive |
| `--info` | #0E7490 | #38BDF8 | Neutral info |
| `--diff-added` / `--diff-removed` / `--diff-changed` | #DCFCE7 / #FEE2E2 / #FEF3C7 | #123524 / #3B1518 / #3A2E10 | Diff cells |

**Rules:** red/amber/green are reserved for risk and status semantics. Never use color alone (add icon + label). Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI components.

### 3.2 Typography
- Font: **Inter** (UI), **JetBrains Mono** (SQL, code, row keys). System fallback stack.
- Scale (px / line-height): 12/16 caption, 14/20 body (default), 16/24 large body, 20/28 h3, 24/32 h2, 32/40 h1, 48/56 display (marketing).
- Weights: 400 body, 500 labels, 600 headings. Tabular numerals for all numbers and scores.

### 3.3 Spacing, radius, elevation, motion
- Spacing: 4-pt grid (4, 8, 12, 16, 24, 32, 48, 64).
- Radius: 6 (inputs), 10 (cards), 16 (modals), full (pills).
- Elevation: 3 levels (card 1px border only; popover soft shadow; modal larger shadow + scrim).
- Motion: 120 ms (hover), 200 ms (panels), 400 ms (score gauge count-up, ease-out). Respect `prefers-reduced-motion` (disable count-ups, parallax, auto-play).

### 3.4 Iconography
Lucide icons, 16/20 px, 1.5 stroke. Icon + text label for primary actions.

## 4. Layout and Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Top bar: workspace switcher · global search / ⌘K · mode badge · approvals │
│          (🔔) · help · avatar                                              │
├───────────┬──────────────────────────────────────────────────────────────┤
│ Sidebar   │  Page header: breadcrumb · title · primary action             │
│ Sources   │  ──────────────────────────────────────────────────────────  │
│ Datasets  │  Content area (max 1440 px; data grids full-bleed)            │
│ Crew      │                                                                │
│ Strategy  │                                                                │
│ Briefs    │                                                                │
│ Automations│                                                               │
│ Privacy   │                                                                │
│ Settings  │                                                                │
└───────────┴──────────────────────────────────────────────────────────────┘
```
- Sidebar collapsible to icons; remembers state. Mobile: bottom nav (Datasets, Crew, Ask, Privacy, More).
- **Global command palette (⌘K / Ctrl+K):** jump to dataset, run action ("Clean this dataset"), open Passport, switch mode.
- **Mode badge** always visible: `Cloud (masked)`, `BYO key`, `Local · 0 bytes external`.
- **Approvals bell:** count of pending agent approvals; opens inbox drawer.
- Dataset page uses **tabs**: Overview · Plan · Diff · Risks · Ask · Forecast · Strategy · Passport · Lineage · Recipes.

## 5. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| ≥1280 | Sidebar + content + optional right inspector panel |
| 768-1279 | Collapsed sidebar; inspector becomes drawer |
| <768 | Bottom nav; tables become cards or horizontal-scroll grids; plan steps full-width; gestures hidden; upload via file picker |
Touch targets ≥ 44 px. No hover-only functionality.

## 6. Onboarding and First-Run

1. **Sign up** (email + password or SSO later) → create workspace (name, industry optional).
2. **Choose privacy mode** with plain explanation: Cloud (masked), Bring your own key, Local. Default: Cloud (masked) with link "What leaves my machine?" that opens the Privacy Dashboard preview.
3. **Start with data:** big dropzone + "Try with a sample messy file" (the demo dataset) + "Paste a web page URL".
4. **Guided tour (4 steps, skippable):** score → plan toggles → diff → Passport. Tour state persisted.
5. **Checklist widget** (dismissible): Upload data · Approve a plan · Download clean file · Ask a question · Share a Passport.
6. Empty states always include a primary action and a sample.

## 7. Key Screens: Layout Specs

### 7.1 Upload / Sources
```
┌ Sources ────────────────────────────────────────────────────────────┐
│ [ Drop files here or browse ]   CSV · XLSX · JSON · PDF · image     │
│ ─ or ─  Paste a web page URL [____________________] [Detect tables] │
│ Connect:  [Database] [Google Sheets·soon] [Stripe·soon] [Gmail·soon]│
│ Recent uploads (status chips: Uploading 62% · Profiling · Ready)    │
└──────────────────────────────────────────────────────────────────────┘
```
- Resumable upload with per-file progress, pause/resume, cancel. Errors name the file and the fix.
- URL flow shows robots.txt/ToS result, detected tables with preview, editable field list, PII warning.

### 7.2 Dataset Overview
- Header: name, type chip ("Invoices"), tags, folder, owner, last updated.
- **Health gauge** (big, animated 0→score) with "Before 42 → After 94" when cleaned.
- Per-column cards in a grid: name, meaning, type, null %, issues count, mini health bar, PII badge.
- Right panel: "Routing suggestion" (e.g., "HR only, mask salary") with Accept/Dismiss.
- Primary CTA: **Review cleaning plan**.

### 7.3 Cleaning Plan (hero)
```
┌ Cleaning plan · 9 fixes · projected score 42 → ~94 ───────────────────────┐
│ [Approve all safe]  [Reject risky]  Filter: All | Low | Medium | High risk │
│ ┌─────────────────────────────────────────────────────────────┬───────┐ │
│ │ ☑ Merge city variants → "Hyderabad"      312 rows  Low risk │ ⓘ ▾   │ │
│ │   "Hyd", "hyderabad ", "Hydrabad"        Confidence 96%     │       │ │
│ │ ☑ Standardize 5 date formats to ISO      1,204 rows Low     │       │ │
│ │ ☐ Remove 9 rows containing "test"        9 rows  Medium     │       │ │
│ └─────────────────────────────────────────────────────────────┴───────┘ │
│ Preview (first 20 affected rows, before → after)                          │
│ [Apply 8 selected fixes]   Chat: "split Name into first and last…"  ➤     │
└────────────────────────────────────────────────────────────────────────────┘
```
- Each step: toggle, plain title, affected rows, risk chip, confidence, expandable rationale and exact params. Focused step drives the live preview.
- **Sticky action bar** with count + projected score. Disabled until ≥1 step selected.
- After Apply: non-blocking progress toast + progress panel; on success auto-open Diff with confetti-free, subtle success state.

### 7.4 Diff View
- Side-by-side or unified toggle; virtualized AG Grid. Changed cells colored with icon (not only color). Filter by step/column/status. Per-step **Undo** with confirm toast ("Undone. Score 94 → 91. Redo?").
- Row detail drawer: original vs new per field, step that changed it.

### 7.5 Risk Grid
- Grid cells red/amber/green with icon (✕ / ! / ✓), tooltip "Why this is risky" in plain English, link to rule or contract clause.
- Left filter: category (PII, outliers, rule violations, contract), severity, resolved/unresolved.
- Bulk actions: mask column, flag rows, create rule, mark accepted risk (requires note).

### 7.6 Ask Your Data (chat)
- Message thread; assistant answer card with sections: **Answer**, **Chart**, **Query used** (collapsed, copy button), **Source rows** (opens grid filtered). Suggested follow-ups as chips. "Not enough data" is an allowed, explained answer.

### 7.7 Forecast and Strategy
- Forecast chart: history line, forecast line, shaded confidence band, hover tooltips with ranges. Right card: **Accuracy track record** ("Actuals fell inside our range 8 of 10 times").
- Opportunity list: rank number, title, ₹/month estimate with ⓘ assumptions, confidence chip, "View evidence rows". What-if panel: input, run, side-by-side chart.

### 7.8 Data Passport
- Public page: clean, print-friendly, no app chrome. Header with verification badge ("Hash verified ✔" after client-side recompute). Sections: score before/after, change timeline, risks resolved, source, lineage snippet, privacy summary. Share, copy link, QR, PDF export.

### 7.9 Privacy Dashboard
- Flow diagram per dataset: File → Mask → Agent → Model → Result with counts on each hop. Cards: Fields masked, Bytes sent externally (**0** highlighted in local mode), Models used, Last red-team Safety Score. Ledger table with filters and export. Mode switch with explanation and confirmation.

### 7.10 Crew Console and Agent Replay
- Agent list with status dots. Timeline of steps (input summary, tool call, output summary, duration). Gate steps show Approve/Reject. Replay is read-only and exportable.

### 7.11 Settings and Admin
- Members and roles table (invite, change role, remove), folders/categories manager, retention policy, model mode and keys (masked inputs, "Test connection"), notification channels, audit log viewer, usage and plan, danger zone (delete workspace/dataset → crypto-erase with receipt).

## 8. Component Specs and States

Every component documents: default, hover, focus, active, disabled, loading, error, empty, and read-only (viewer role).

| Component | Notes |
|-----------|-------|
| Button | Primary, secondary, ghost, destructive; loading state keeps width; min 36 px height |
| Toggle (plan step) | Label + description; keyboard Space; announces state |
| Health gauge | 0-100 arc, color bands; numeric text always present for a11y |
| Data grid | Virtualized; sticky header; column resize/pin; keyboard cell nav; copy cells; empty/ error states |
| Diff cell | Color + icon + tooltip (before → after) |
| Chips | Risk (low/med/high), status, type, PII; always text |
| Toasts | 5 s default; persistent for errors needing action; include Undo |
| Modals | Trap focus; Esc closes; destructive confirm requires typing name for deletion |
| Empty state | Illustration (simple), one sentence, primary action, optional sample |
| Skeletons | Match final layout; never spinner-only for page loads |
| Progress | Determinate with ETA when known; cancel button for jobs |
| Tooltips | Short; also available on keyboard focus |

## 9. System States and Microcopy

| Situation | UI | Copy example |
|-----------|----|--------------|
| Loading dataset | Skeleton | none |
| Profiling | Stepper (Uploaded → Profiling → Classifying → Ready) | "Reading your columns… 2 of 4" |
| LLM unavailable | Inline banner, retry, "Use local mode" | "The AI service didn't respond. We used rule-based suggestions instead." |
| Plan invalid | Auto-retry once then fallback notice | "Some AI suggestions were discarded because they didn't pass validation." |
| Job failed | Error card, partial results kept, Retry | "Step 4 failed on row 18,204. Nothing was changed. Retry or skip this fix." |
| DB/service waking | Soft banner | "Waking up services. This can take about 30 seconds." |
| PII found | Banner + default mask | "Found Aadhaar-like numbers in 'id_no'. We masked them before AI saw anything." |
| Scrape blocked | Explain | "This site's robots.txt doesn't allow automated access. Upload the data instead." |
| No permission (viewer) | Disabled control + tooltip | "Editors and admins can apply fixes." |
| Rate/usage limit | Meter + upgrade | "You've used 90% of this month's rows." |
| Offline | Banner, queue actions | "You're offline. Changes will sync when you're back." |
| Destructive | Confirm with consequence | "Delete 'sales_2025'? The encryption key is destroyed and this can't be undone." |

Error messages always include: what happened, what is safe (data unchanged?), what to do next. Never expose stack traces; show a request ID with copy button.

## 10. Trust and Approval UX Patterns

- **Approval inbox:** items grouped by dataset; each shows agent, action, impact (rows, columns), "View details", Approve / Reject / Ask why.
- **Reversibility labels:** "Reversible" chip on every step; irreversible actions get red confirm.
- **Passport button** on every dataset header; "Share" requires explicit confirm showing exactly what becomes public (no raw rows).
- **Privacy transparency:** a "What did the AI see?" link on any AI output opens the masked sample actually sent.
- **Confidence and risk language:** Low / Medium / High with plain explanation; never fake precision.

## 11. Data-Heavy UX Rules

- Grids virtualize; row windows load on scroll; never freeze the browser on 1M rows (server-side windowing).
- Show counts everywhere ("312 of 18,204 rows").
- Persist column widths, filters and sort per dataset per user.
- Numbers right-aligned, tabular figures, locale-aware (₹ with Indian grouping 12,34,567; dates DD-MMM-YYYY by default with ISO in exports).
- Long operations are **backgroundable**: user can leave the page; completion arrives as notification.

## 12. Accessibility (WCAG 2.2 AA)

- Full keyboard operation; visible focus ring (2 px, offset); logical tab order; skip-to-content link.
- Semantic landmarks, headings, ARIA for custom controls (toggle, tabs, grid, dialog); live regions for progress and toasts.
- Color is never the only signal (icons, patterns, text labels).
- Target size ≥ 24×24 px minimum (44 px on touch); drag actions have non-drag alternatives (buttons).
- Gestures (Point & Say) are optional, with keyboard/mouse equivalents and a clear off switch; camera permission is explained before the browser prompt.
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, and zoom to 200% without loss.
- Charts have text summaries and data-table toggles.
- Test with axe, keyboard-only pass, and a screen reader on the core flow.

## 13. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl+K | Command palette |
| g then d / s / c | Go to Datasets / Strategy / Crew |
| j / k | Next / previous plan step |
| Space | Toggle focused step |
| a | Apply selected fixes (confirm) |
| u | Undo last action |
| / | Focus search |
| ? | Shortcut help |

## 14. Internationalization and Localization

- i18n-ready strings (no hard-coded text); start with English, structure for Hindi and Telugu.
- Currency ₹ with Indian digit grouping; configurable per workspace. Timezone IST default, user-overridable.
- Handle messy city-name variants and Indic scripts in data without breaking layout (Noto Sans fallback).
- RTL-safe layout utilities.

## 15. Performance Budgets (UX)

| Metric | Target |
|--------|--------|
| First contentful paint (app shell) | < 1.5 s on broadband |
| Interaction latency (toggle, tab) | < 100 ms |
| Plan generation (typical sample) | < 10 s, with streaming status |
| Grid scroll | 60 fps with 1M-row virtual dataset |
| Initial JS (route) | < 250 KB gzip; lazy-load charts, MediaPipe, graph viz |
| CLS | < 0.1 |
Use optimistic UI for toggles, prefetch next tab, cache queries.

## 16. Notifications

- In-app bell: approvals, job complete/failed, risk found, CEO brief ready. Email/Slack per user preferences with per-event toggles and quiet hours.
- Each notification: title, one-line detail, deep link, timestamp, read state.

## 17. Billing and Plan UX

- Usage meters (rows, agent runs, connectors) with clear limits; soft warning at 80%, hard at 100% with an upgrade path and no data loss.
- Plan comparison table; invoices list; trial banner when applicable.

## 18. Security and Privacy UX

- Re-auth for sensitive actions (change mode, delete, share Passport publicly).
- Session list and revoke; API keys shown once; masked afterwards.
- Clear data-retention and deletion messaging; deletion receipt viewable and downloadable.
- Public pages (Passport) show no raw data, only aggregates and hashes.

## 19. Analytics and UX Instrumentation (privacy-respecting)

Track events with no cell content: `upload_started`, `plan_viewed`, `step_toggled`, `plan_applied`, `score_improved(delta)`, `undo_used`, `export_downloaded`, `chat_asked`, `passport_shared`, `mode_changed`, `approval_decided`. Funnel: upload → plan applied → download. Opt-out available; no third-party trackers in local mode.

## 20. Marketing Site and Pre-Auth UX

- Landing: hero with live before/after score animation; "Try with a sample file" without signup (sandboxed); sections: problem story, how it works (3 steps), privacy proof, Data Passport example, pricing, FAQ, security page.
- Public Passport example page and a "How we handle your data" explainer.
- Legal pages: privacy, terms, subprocessors list.

## 21. UX Acceptance Criteria (Definition of Done)

- [ ] Core flow (upload → plan → apply → diff → download) completed by a new user **without help in under 3 minutes**.
- [ ] Every AI change shows rationale, row count, risk, and Undo.
- [ ] All states designed and implemented: loading, empty, error, partial, offline, no-permission.
- [ ] Light and dark themes pass contrast checks.
- [ ] Keyboard-only run of the core flow succeeds; axe reports no critical issues.
- [ ] Mobile layout usable for review/approve; upload works via file picker.
- [ ] Privacy mode and "what did the AI see" visible on every AI output.
- [ ] Destructive actions confirmed with clear consequences; deletions produce a receipt.
- [ ] Performance budgets met on the 100k-row demo; 1M-row file remains responsive.
- [ ] Microcopy reviewed for plain English; no jargon in primary UI.

## 22. Design Deliverables to Build in Code

1. `design-tokens` (CSS variables + Tailwind theme) for light/dark.
2. Component library on shadcn/ui with the states above, documented in a `/design` route or Storybook.
3. Screen templates for all screens in section 7.
4. Shared empty/error/loading patterns.
5. Accessibility test script (axe + keyboard checklist) in CI.
