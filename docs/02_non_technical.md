# PART 2: NON TECHNICAL

## 02 · Non-Technical Document

> DataCrew is an **autonomous AI data team**: connect *any* data (files, databases, business apps, web pages) and agents clean, watch, predict and advise. Spreadsheets are the entry point, not the limit.

## 1. The Story (use this when pitching)

It's month-end in a small company. **Priya**, in finance, opens the sales sheet that three people have edited for a year.

- Dates are written five different ways.
- "Hyderabad" is also "Hyd" and "hyderabad ".
- Half the customers appear twice.
- Someone typed salaries into the phone column.

She spends two days fixing it by hand and still isn't sure it's right. Then the boss asks, **"Can we trust this number?"** She can't answer.

## 2. The Real Problem

- Every business runs on data, and almost none of it is trustworthy: spreadsheets, exports, CRM dumps, databases, scraped web listings.
- Data is **scattered** across files, databases and SaaS tools (Sheets, Stripe, HubSpot, Tally, Gmail), each with its own mess.
- Analysts spend most of their time cleaning data instead of using it.
- Bad data quietly causes wrong invoices, wrong forecasts and wrong decisions.
- Nobody can **prove** what changed or why.
- Forecasts and insights are only as good as the data under them, yet most tools skip cleaning.
- Existing tools clean data *or* chart it *or* chat with it, but don't build trust, and the people who most need help can't write code.
- "Chat with your data" tools often ship everything to a cloud LLM, which many companies cannot accept.
- Scraped and imported data is the messiest of all and rarely has a record of where it came from.

## 3. Our Solution (plain English)

DataCrew is an **autonomous AI data team**. You connect any data, and a crew of agents does the work while you stay in control.

1. **Connect or upload any data:** files (CSV, Excel, PDF, JSON, photo of a table), a pasted URL, a database, or business tools. It's auto-classified (payroll, invoices, sales) and given a health score (say 42/100).
2. **Clean (human-approved):** the AI reads what each column means and proposes fixes. You approve or reject each one. Nothing changes silently.
3. **Audit:** a red/amber/green risk grid flags exposed personal data, outliers and broken rules. Upload a contract and your data is checked against it.
4. **Ask:** "Which region has the most overdue payments?" The answer comes with a chart, the query used and the exact rows as proof.
5. **Predict:** forecasts of revenue, churn, stock-outs and cash flow, with confidence ranges.
6. **Advise (main feature):** a ranked "what will add value" list with evidence, a what-if simulator and a weekly CEO brief.
7. **Automate:** agents run on schedule and send alerts to email or Slack.
8. **Certify:** every dataset gets a **Data Passport** (before/after score, every change, risks resolved, source and lineage).
9. **Prove privacy:** a live dashboard shows what was masked, which model saw what, and "0 bytes sent externally" in local mode.

### The main feature: Predict and Advise (non-technical view)
Think of a data analyst who never sleeps. Example outputs:
- *"Customers in Region B churn 3x faster. Fixing onboarding there could save about ₹X/month."* (with the exact customer rows as evidence)
- *"Revenue will likely dip in March (range ₹A to ₹B). Here is why."*
- *"What if we raise prices 5%?"* answered by a simulator, not a guess.
- A **weekly CEO brief** in the inbox.
The system also **grades its own past predictions**, so people learn how much to trust it.

### The honest framing for #11
Cleaning is step one. Once data is trusted, we predict, advise and protect it.

## 4. Target Users (personas)

| Persona | Role | Pain | What they get |
|---------|------|------|---------------|
| **Priya** | Finance exec at an SME | Hand-fixing month-end sheets, can't prove accuracy | One-click cleaning plus a Passport to show her boss |
| **Arjun** | Data analyst | 60-80% of time spent cleaning | Reusable recipes, Python/SQL export |
| **Meera** | Operations manager | Many sheets from many people | Auto-classification and routing |
| **Rahul** | Founder / CEO | Doesn't trust numbers; data lives in many tools | Connected sources, weekly CEO brief, forecasts, ranked value opportunities |
| **Sana** | Compliance / IT lead | Fear of data leaving the company | Local mode, privacy dashboard, audit ledger |

## 5. Target Market

- Indian SMEs and startups first (Tally, Excel, GST/invoice-heavy workflows, Hindi/regional city-name variants).
- Finance, HR, sales-ops, retail, logistics teams.
- Agencies and consultants who receive messy client data.
- Later: mid-market and regulated sectors needing DPDP/SOC 2.

## 6. Business Model (proposal) and SaaS Foundations

| Tier | Audience | Includes |
|------|----------|----------|
| Free | Individuals, demo | Limited rows/files per month, cloud mode with masking |
| Pro | Small teams | More rows, recipes, chat with data, forecasts, Data Passport sharing |
| Team | Companies | Workspaces, roles, audit log, scheduled runs, connectors, notifications (email, Slack) |
| Enterprise / Private | Regulated | Local-model mode, BYO key, SSO, per-company encryption keys, compliance reports |

Pricing is **usage-based** (rows processed, agent runs, connectors, forecasts). Final numbers are TBD.

**What makes it a real SaaS:** multi-tenant workspaces, roles and an audit log; background jobs and scheduled runs; human approval before agents change anything; email and Slack notifications; usage metering and tiers; the Data Passport for every dataset; API and webhooks.

## 7. Why Customers Stay (the honest way)

- Saved **cleaning recipes** and agent memory of how their data works
- A knowledge base of their business context and KPI definitions
- **Data Passport** history and the audit trail
- **Weekly CEO briefs** and alerts people start relying on
- Connected sources and scheduled runs that keep working in the background
- A forecast accuracy track record that builds credibility over time

## 8. Success Metrics

| Metric | Meaning |
|--------|---------|
| Health score lift | Average before → after (target demo: 42 → ~94) |
| Time to clean | Minutes from upload to download |
| Plan acceptance rate | % of AI suggestions the user approves (quality signal) |
| Recipe reuse rate | Retention signal |
| Forecast accuracy track record | Credibility signal (if built) |
| Value-at-Stake resolved | ₹ of data problems fixed |
| Connected sources per workspace | Platform stickiness |
| Privacy incidents | Target: zero; ledger proves it |

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Judges see it as off-brief (too much forecasting) | Lead with #11, 50/30/20 demo ratio |
| Free-tier DB pauses before demo | GitHub Actions keep-alive; check the day before |
| Free LLM rate limits | Caching, semantic cache, provider failover (LiteLLM) |
| Gemini free tier may use prompts for training | Send only masked/synthetic data to cloud LLMs; real data stays on Ollama |
| Over-promising security | Say "verifiable controls", never "100% safe" |
| Scraping legality | Respect robots.txt/ToS, no logins/paywalls, flag PII |
| LLM mistakes in cleaning | Human approval, undo, versioning |
| Prompt injection in uploaded files | Sandboxed agents, read-only creds, approval before writes |
| Demo network failure | Offline backup mode, pre-cleaned fallback files |
| Scope creep | Strict priority tiers (files 01 and 08) |
| Demo too heavy on prediction | 50/30/20 ratio; prediction shown as step two |
| Scraped data legality | robots.txt/ToS respected, no logins/paywalls, Source Passport |
| Free-tier privacy mismatch | Masked/synthetic data to cloud LLMs; real data on Ollama |

## 10. Legal, Ethical and Compliance Notes

- **Use only fake personal data** in demos (Faker); a privacy product demoed on real people would undercut the pitch.
- **Check each dataset's license** and credit sources on a slide.
- **Scraping:** respect robots.txt and terms of service; skip logins and paywalled content; mask PII by default; keep a Source Passport.
- **Compliance roadmap:** DPDP Act (India), then SOC 2. Listed as *next steps*, not current claims.
- Do not claim certifications you don't hold.

## 11. Team and Process Suggestions

| Role | Focus |
|------|-------|
| Full-stack lead | Next.js UI, FastAPI endpoints |
| Data/AI engineer | Cleaning engine, LLM plan, dedupe, forecasting |
| Infra/security | Privacy layer, storage, deployment |
| Pitch/design | Demo script, slides, branding |

Solo builders: follow the must-have list only, then add one wow feature.

## 12. Pre-Demo Checklist

- [ ] Fake demo company dataset generated, with known health score (~42)
- [ ] Rehearsed until score reaches ~94 every time
- [ ] Backup "before" and "after" files ready
- [ ] Offline/local mode tested
- [ ] All free-tier accounts created early and keep-alive running
- [ ] Qdrant and Neo4j confirmed awake the day before
- [ ] Dataset licenses credited on a slide
- [ ] Roadmap slide ready for unbuilt features



---
