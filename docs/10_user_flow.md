# PART 10: USER FLOW

## 10 · User Flow: Inputs and Outputs

> Inputs are **any data**: files, pasted URLs, databases, business apps (MCP), API/webhook, email-in. Outputs are clean data, risk findings, answers with proof, forecasts, advice, and a Data Passport.

## 1. Master Flow

```
 INPUT                      PROCESS (agent crew)                    OUTPUT
 ─────                      ────────────────────                    ──────
 File / URL / DB /       →  Intake: ingest, profile, classify    →  Health score (42), tags, routing
 MCP app / API / email                                              Source Passport
 Sample (masked)         →  Cleaner: AI plan                     →  Toggleable list of fixes
 User approvals          →  Engine: execute on full data         →  Clean data, diff, score (94)
 Optional contract PDF   →  Auditor: risks and rule checks       →  Red/amber/green risk grid
 Question                →  Analyst: read-only text-to-SQL       →  Answer + chart + SQL + source rows
 Time series             →  Forecaster: Prophet/statsforecast    →  Forecast with confidence range
 Forecasts + risks       →  Strategist: Predict and Advise       →  Ranked value list, what-if, CEO brief
 NL instruction          →  Ops: schedule and alert              →  Workflow, reminders, notifications
 Everything above        →  Compile                              →  Data Passport + recipe + PDF report
```

## 2. Input Catalog

| Input | Format | Where |
|-------|--------|-------|
| Files | CSV, XLSX (multi-sheet, merged cells), JSON, PDF tables, photo/image of table | Sources → Upload |
| Web page | Pasted URL (tables, lists, repeated cards; "extract product name, price, rating") | Sources → Paste URL |
| Database | Postgres first (read-only credentials); MySQL, MongoDB later | Sources → Database |
| Business apps | Google Sheets, Drive, Gmail attachments, Stripe, HubSpot, Tally via MCP | Sources → Apps (roadmap) |
| API/webhook | Push from other apps | Sources → API keys (roadmap) |
| Email-in / watched folder | Forwarded file / Drive or S3 folder | Roadmap |
| Target template | CSV/XLSX with desired headers | Schema mapping |
| Contract/policy | PDF | Contract check |
| Natural-language instruction | Text/voice | Chat-to-clean, rules, chat, automations |
| Approvals | Toggle, click, air-swipe | Plan screen, approval inbox |
| What-if parameters | "raise prices 5%" | Strategy |
| Mode choice | Cloud / BYO key / Local | Settings |

## 3. Output Catalog

| Output | Format |
|--------|--------|
| Clean dataset | CSV, XLSX, Parquet |
| Cleaning recipe | Python, SQL, JSON |
| Data-quality report | PDF |
| Data Passport | Web page + JSON + public link/QR |
| Risk report | In-app grid, exportable |
| Chat answers | Text + chart + SQL/Pandas + source rows |
| Forecast | Chart with confidence band + accuracy record |
| Synthetic Twin | Parquet/CSV |
| Privacy ledger | In-app + export |
| Ranked value opportunities | In-app list with ₹ estimate + evidence rows |
| What-if result | Chart + explanation |
| Weekly CEO brief | In-app page + email/Slack |
| Workflow + run status | Dashboard (roadmap) |
| Source Passport | Origin, timestamp, what collected |
| Deletion receipt | Signed record |
| Audit log | In-app + export |

## 4. Primary Flow A: Clean a Messy File (the #11 core)

1. **Sign in** → workspace dashboard.
2. **Upload** a CSV/Excel (drag and drop). Progress bar; resumable.
3. System **profiles** the file and **classifies** it (e.g. "Sales invoices"). Shows **health score 42/100**, issue badges per column, PII flags, routing suggestion.
4. System **masks PII** in the sample (if cloud mode) and asks the LLM for a **plan**.
5. User opens **Plan screen**: sees steps such as
   - Remove 214 duplicate rows
   - Standardize 5 date formats to ISO
   - Merge city variants into "Hyderabad"
   - Fill 312 missing values in `region` with mode
   - Remove 9 "test" entries
   - Move phone numbers out of `salary` column
6. User **toggles** steps on/off, previews each on sample.
7. Optionally types **"split Name into first and last"** → new step appears.
8. User clicks **Apply**. Background job runs with live progress.
9. **Diff view** appears; score shows **94/100** with per-column before/after.
10. User **downloads** clean file, and **exports recipe** (Python/SQL) and PDF report.
11. **Undo** any step if unhappy; version history retained.

## 5. Flow B: Fuzzy Dedupe Review

1. Run smart dedupe → clusters list.
2. Pick a cluster → side-by-side records ("Ravi Kumar" vs "Kumar, Ravi").
3. Choose surviving field values → Merge / Not duplicate / Skip.
4. Score updates; lineage records merges.

## 6. Flow C: Map to a Target Schema

1. Upload target template (e.g. CRM import format).
2. AI suggests column mapping with confidence.
3. User adjusts; preview restructured output.
4. Apply → download in target format.

## 7. Flow D: Audit and Contract Check

1. Open **Risks** tab → red/amber/green grid with reasons.
2. Upload contract PDF → AI lists extracted rules ("payment within 30 days").
3. User confirms rules.
4. Violating rows (overdue invoices) turn red with the clause cited.

## 8. Flow E: Ask Your Data

1. Open **Chat**; ask "Which region has the most overdue payments?"
2. System checks semantic cache → text-to-SQL → read-only execution.
3. Answer returns with chart, query used, and **source rows** link.

## 9. Flow F: Predict and Advise (the main feature, shown as step two)

1. Open **Forecast**; choose metric (revenue, churn, stock-outs, cash flow) and date column.
2. Forecaster produces a forecast with a **confidence range** using Prophet/statsforecast, plus past accuracy track record.
3. Open **Strategy**: Strategist shows a ranked **"What will add value"** list. Example: *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* Click to see **evidence rows** and editable assumptions.
4. Run **What-if**: "What if we raise prices 5%?" → scenario chart + explanation.
5. Ask in chat: *"Why will revenue dip in March?"* → answer with proof.
6. Receive the **weekly CEO brief** by email/Slack.
7. Later, actuals arrive and the system **scores its own forecast** and shows the result.

## 10. Flow G: Point & Say (optional showstopper)

1. Enable camera (permission prompt) → calibration.
2. **Point** at a column → highlighted.
3. Say **"fix the dates"** → matching plan step highlighted.
4. **Air-swipe right** = approve; **left** = reject.
5. Destructive step → confirmation dialog; pause gesture available.

## 11. Flow H: Privacy and Passport

1. **Privacy dashboard:** pick dataset → see path *file → mask → agent → model → result*, fields masked, bytes sent externally.
2. Switch to **Local mode** → counter shows **0 bytes external**.
3. **Passport:** shows before/after, change timeline, risks resolved, lineage; share link; **Verify** recomputes hash.
4. **Delete** dataset → key destroyed → **deletion receipt**.

## 12. Flow I: Reusable Recipe (retention loop)

1. Save pipeline as a recipe.
2. Next month upload new file → "Apply recipe" → review diffs → download. One click.

## 13. Flow J: Admin

Invite members, assign roles (Admin/Editor/Viewer), create folders/categories, set retention, choose model mode, manage keys, view audit log and ledger.

## 14. Flow K: Connect Any Data

1. **Sources** → pick a tile: Upload, Paste URL, Database, Apps.
2. **Database:** enter read-only credentials; allowlist check; pick tables; sample appears.
3. Intake agent classifies, profiles and masks PII in the sample; a **Source Passport** is created.
4. Dataset enters the same plan → approve → clean → score pipeline.
5. Scheduled sync (roadmap) keeps it updated.

## 15. Flow L: Paste a Messy Public Page (ingestion wow)

1. Paste a URL (practice sites: books.toscrape.com, quotes.toscrape.com, scrapethissite.com, or a Wikipedia table).
2. System checks robots.txt/ToS; shows detected tables/cards; LLM proposes fields ("product name, price, rating"); user edits.
3. Rows are scraped (rate-limited) into a structured table; PII flagged and masked.
4. **One click** runs the cleaning plan; score and diff appear.
5. Source Passport records URL, timestamp and what was collected.

## 16. Flow M: Agents Working Live (Agent Replay)

1. After connecting a messy sales database, open **Crew**.
2. Watch Intake → Cleaner → Auditor → Analyst → Forecaster → Strategist run, with each reasoning step and tool call on a timeline.
3. Approve or reject at each gate (plan execution, writes, notifications).

## 17. Flow N: Ops Autopilot (roadmap)

1. Type: *"Every Monday, clean the sales sheet, flag anomalies, notify finance."*
2. Ops agent builds a workflow with schedule, reminders and approval gates.
3. Dashboard shows run status; finance receives email/Slack alerts.

## 18. Edge Cases and Messages

| Situation | Behavior |
|-----------|----------|
| File too large for memory | Streamed processing; background job |
| LLM provider down | Auto failover, then rule-based suggestions |
| Plan JSON invalid | Retry once, fall back |
| DB asleep | "Waking up services, retry in a moment" |
| PII found | Banner + default mask |
| Scrape blocked by robots.txt | Explain and refuse |
| Login/paywalled page | Refuse; suggest upload or API |
| Database credentials write-capable | Warn and require read-only |
| Forecast has too little history | Say so; show wide range or decline |
| Agent wants to write or notify | Pause for approval |
| Contract has ambiguous clause | Ask user to confirm rule |
| Camera denied | Fall back to mouse/keyboard |

## 19. Live Demo Scripts

### Script 1: #11-led demo (recommended, 3-5 minutes)
| Time | Beat | Message |
|------|------|---------|
| 0:00 | Story of Priya and the month-end sheet | Relatable pain |
| 0:30 | Drop the ugly file (or paste a messy public listings URL). Auto-classified. **Score 42** | Any data in, instant wow |
| 1:00 | Show plan; toggle steps; apply | Human in control |
| 1:45 | Diff view; **score 94**; download file + Python recipe | Core #11 delivered (~50%) |
| 2:15 | Risk grid; upload contract; violations light red; Data Passport | Trust (~30%) |
| 3:00 | Privacy dashboard: masked fields, "0 bytes external" in local mode; Safety Score | Moat |
| 3:30 | (Optional) Point & Say: air-swipe approvals | Showstopper |
| 4:00 | Forecast with confidence band + accuracy record + top-3 value opportunities (~20%) | "Step two" |
| 4:30 | Roadmap slide + closing line | Memorable close |

### Script 2: crew-led demo (DataCrew flow)
1. **Connect a messy sales database.** Agents start working live (Agent Replay).
2. Health score rises; risk grid appears.
3. Forecast chart shows next quarter, with the **top 3 value opportunities**.
4. Ask in chat: *"Why will revenue dip in March?"* → answer with proof.

### Script 3: TrustSheet 3-step version
1. Drop in an ugly file; classified; score drops to **42**.
2. Point and speak; fixes approved by air-swipe; score climbs to **94**.
3. Upload a contract; violations light up red; Data Passport generated.

**Backup plan:** pre-cleaned outputs, offline/local mode, screen recording, backup copy of every demo file in case the network or scraping fails. Rehearse until the score reaches ~94 every time.




---
