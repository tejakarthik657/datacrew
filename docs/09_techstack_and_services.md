# PART 9: TECHSTACK AND SERVICES

## 09 · Tech Stack and External Services

> Stack supports **any data source** (files, URLs, databases, MCP business connectors) and a LangGraph agent crew.

> Free-tier terms change often. **Verify current limits and card requirements before relying on any service, and sign up early, not the night before the demo.**

## 1. Full Stack Table

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | Next.js, TypeScript, Tailwind, shadcn/ui | Hosted on Cloudflare Pages (Vercel free tier is non-commercial) |
| Grid | AG Grid Community | Virtualized, huge tables |
| Charts | ECharts | |
| Graph viz | Cytoscape.js or React Flow | Lineage |
| Gestures | MediaPipe Hands | Browser-only |
| Backend | FastAPI, Pydantic | |
| Agents | LangGraph, LangChain, MCP | Supervisor + specialists |
| LLM router | LiteLLM | Failover and caching |
| Data engines | DuckDB, Polars, Pandas | Parquet working format |
| Record linkage | Splink, rapidfuzz | |
| Validation | Pandera | |
| PII | Microsoft Presidio | Custom Indian recognizers |
| Forecasting | Prophet or statsforecast | |
| Synthetic data | SDV | |
| Embeddings | fastembed + bge-small | Local |
| Jobs | Arq workers | Redis-backed (Celery was the first idea; Arq is final) |
| Connectors | MCP servers/clients | Google Sheets, Drive, Gmail, Stripe, HubSpot, Tally (roadmap), DB readers |
| Notifications | Email provider + Slack webhooks | Provider free tier to be verified |
| Vector DB (initial idea) | Postgres pgvector | Replaced by Qdrant/Chroma; optional fallback |
| Scraping | Playwright, Crawl4AI, Trafilatura, BeautifulSoup | |
| OCR/PDF | pdfplumber, Tesseract (or similar) | PDF tables and images |
| Observability | Langfuse, Sentry, Grafana Cloud | |
| CI | GitHub Actions | Also keep-alive pings |

## 2. External Services

### Databases and storage
| Service | Role | Card? | Free-tier notes |
|---------|------|-------|-----------------|
| Supabase | Postgres, auth, RLS, Storage (main file store) | Not verified | ~1 GB storage cap, check current limits; projects can pause on inactivity |
| Neon | Alternative Postgres | Not verified | Check limits |
| Neo4j AuraDB Free | Lineage graph | **No card** (checked) | Up to 200,000 nodes / 400,000 relationships; pauses when idle (sources conflict: ~72 h vs ~1 week), deleted after ~30 days paused; trial extras (Graph Analytics, Aura Agent) are time-boxed bonuses |
| Qdrant Cloud Free | Vectors | **No card, no time limit** (checked) | 1 GB cluster, free cloud inference with selected models; **paused after 7 days of inactivity** |
| Chroma | Local vector store | n/a | Embedded, open source |
| Upstash Redis | Queue/cache | Not verified | Free tier limits apply |
| Hugging Face private dataset repo | Large demo datasets, versioned Parquet | **No card** | Limits not re-verified |
| GitHub private repo | Small files: recipes, Passport JSON, audit snapshots | No card | 100 MB per-file cap; not bulk storage |
| Local disk / MinIO | Offline mode, demo backups | n/a | Zero signup |
| ~~Cloudflare R2~~ | **Dropped** | Requires payment method | Could be added later via StorageAdapter |

### LLM providers
| Provider | Use | Caveat |
|----------|-----|--------|
| Groq | Fast inference | No card (checked); tight limits |
| Gemini Flash | Long context | Free tier prompts used for training; masked/synthetic only. Free tier restricted to Flash since April 2026 |
| OpenRouter free models | Failover | Variable availability |
| Ollama | Local, sensitive data | Needs capable hardware |

### Hosting and ops
| Service | Use | Caveat |
|---------|-----|--------|
| Cloudflare Pages | Frontend, HTTPS | Card not verified |
| Hugging Face Spaces | Backend option | Not re-checked |
| Render free tier | Backend option | Sleeps when idle; cold starts |
| Oracle Cloud Always Free ARM VM | Backend/agents/Qdrant self-host | **Often asks for a card at signup**; not verified. Test or skip |
| Langfuse, Sentry, Grafana Cloud | Tracing, errors, metrics | Free tiers |
| GitHub Actions | CI + keep-alive cron | |

## 3. Stack Corrections and Why (latest wins)

| Change | Reason |
|--------|--------|
| Vercel → **Cloudflare Pages** | Vercel free tier is non-commercial |
| Cloudflare R2 → **dropped** | Activation requires a payment method (card or PayPal) |
| Celery → **Arq** | Lighter, async-native, fits free Redis |
| pgvector → **Qdrant + Chroma** | Hybrid search, payload filters, quantization; Chroma for zero-egress local mode |
| Separate Qdrant collection per company → **one collection + `tenant_id` index** | Efficient on 1 GB free tier; per-company collections remain an enterprise option |
| Oracle Always Free VM → **verify**, else HF Spaces or Render | Oracle often asks for a card |
| Gemini free tier for all prompts → **masked/synthetic only** | Free-tier prompts may be used for training; real data on Ollama |
| Added **Neo4j AuraDB Free** | Lineage, graph dedupe, GraphRAG; no card; up to 200k nodes / 400k relationships |
| Added **LiteLLM** failover | Free LLM limits are tight (Google restricted free tier to Flash in April 2026) |
| Added **Langfuse** | Agent tracing and Agent Replay |

**Embeddings:** `fastembed` with bge-small locally; Qdrant free cloud inference with selected models is optional.

**Scraping stack (all free):** Playwright for JS-heavy pages, BeautifulSoup/Trafilatura for simple ones, Crawl4AI, LLM-assisted extraction into a JSON schema, queue with rate limiting.

## 4. Adapter Interfaces (swap without rewriting)

```python
class StorageAdapter:   put(), get(), delete(), list(), presign()
class VectorStore:      upsert(), query(), filter(), delete()   # Qdrant | Chroma
class LLMRouter:        complete(), json_complete()             # Groq|Gemini|OpenRouter|Ollama
class Notifier:         send()                                  # email | slack
```
Mode switch (`cloud | byo | local`) only changes which adapters load.

## 5. Mode Matrix

| Component | Cloud mode | Local/private mode |
|-----------|-----------|--------------------|
| LLM | Groq/Gemini/OpenRouter (masked data) | Ollama |
| Vectors | Qdrant Cloud | Chroma embedded |
| Files | Supabase Storage (+ encrypted HF/GitHub) | Local disk / MinIO |
| Graph | Neo4j Aura | Neo4j local Docker (optional) |
| Postgres | Supabase/Neon | Local Postgres (Docker) |
| External bytes | Tracked on dashboard | **0** |

## 6. Environment Variables (sample)

```
MODE=cloud
LLM_PROVIDERS=groq,gemini,openrouter,ollama
GROQ_API_KEY= GEMINI_API_KEY= OPENROUTER_API_KEY= OLLAMA_URL=
DATABASE_URL= SUPABASE_URL= SUPABASE_KEY=
NEO4J_URI= NEO4J_USER= NEO4J_PASSWORD=
QDRANT_URL= QDRANT_API_KEY=
REDIS_URL=
STORAGE_BACKEND=supabase|hf|github|local
VECTOR_BACKEND=qdrant|chroma
MASTER_KEY=
SENTRY_DSN= LANGFUSE_KEYS=
```

## 7. Keep-Alive and Demo-Day Checklist

- [ ] GitHub Actions cron pings Qdrant, Neo4j, Supabase, backend every few days
- [ ] Check Qdrant and Neo4j awake the **day before** the demo
- [ ] Verify all LLM keys and quotas that morning
- [ ] Local/offline fallback tested
- [ ] Pre-cleaned backup outputs saved
- [ ] Sign-up of card-uncertain services done early

## 8. Cost Summary

Target: **₹0 / $0 production stack** for the hackathon, with graceful upgrade paths (R2/S3, paid LLM tiers, larger Qdrant/Neo4j) once a card or revenue exists.

## 9. Suggested Repo Structure

```
datacrew/
  apps/web/            Next.js
  apps/api/            FastAPI + agents + workers
  packages/schemas/    shared plan/step JSON schemas
  scripts/demo_data/   Faker corruption generator
  infra/               docker-compose, GitHub Actions
  docs/                these 11 files
```



---
