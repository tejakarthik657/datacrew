# 06 · Database and Storage Document

> Stores support **any data source**: raw objects and Parquet for data, Postgres for metadata and governance, Neo4j for lineage, Qdrant/Chroma for vectors.

## 1. Data Stores and Roles

| Store | Product | Role |
|-------|---------|------|
| Relational | Postgres (Supabase or Neon) | Tenants, users, datasets metadata, plans, jobs, audit, ledger, passports, recipes, forecasts |
| Graph | Neo4j AuraDB Free | Lineage, dedupe clusters, relationships |
| Vector (cloud) | Qdrant Cloud Free (replaces the earlier pgvector idea; pgvector remains an optional fallback) | Semantic dedupe, value normalization, column matching, KPI memory, semantic cache |
| Vector (local) | Chroma (embedded) | Same roles in zero-egress private mode |
| Files | StorageAdapter (Supabase Storage / HF dataset repo / GitHub / local-MinIO) | Raw files, Parquet, exports |
| Cache/queue | Upstash Redis | Jobs, rate limits, caches |
| Analytical | DuckDB (in-process) | Query Parquet directly |

All vector access behind a **VectorStore** interface; all files behind a **StorageAdapter** interface.

## 2. Postgres Schema (core tables)

```sql
tenants(id, name, plan, mode, key_id, created_at)
users(id, tenant_id, email, role, created_at)
folders(id, tenant_id, parent_id, name)
datasets(id, tenant_id, folder_id, name, source_type, source_ref,
         classification, tags[], routing_suggestion, status,
         current_version_id, created_by, created_at)
dataset_versions(id, dataset_id, version_no, storage_key, format,
                 row_count, col_count, health_score, content_hash,
                 parent_version_id, created_by, created_at)
column_profiles(id, version_id, column_name, inferred_type, semantic_meaning,
                null_pct, unique_pct, pattern_summary, health_score, is_pii, pii_type)
plans(id, dataset_id, version_id, status, llm_model, mode, created_at)
plan_steps(id, plan_id, ord, type, columns[], params_json, rationale,
           confidence, risk_level, approved, applied, affected_rows)
jobs(id, tenant_id, type, ref_id, status, progress, error, started_at, finished_at)
dedupe_clusters(id, dataset_id, status, resolution_json)
dedupe_cluster_members(cluster_id, row_key, score)
risks(id, dataset_id, version_id, category, severity, column_name, row_key,
      explanation, value_at_stake, resolved, source_rule_id)
rules(id, dataset_id, origin, nl_text, compiled_check, source_doc_id, active)
documents(id, tenant_id, type, storage_key, extracted_rules_json)
recipes(id, tenant_id, name, steps_json, python_code, sql_code, created_from_plan_id)
schema_maps(id, dataset_id, template_storage_key, mapping_json, status)
chat_threads(id, dataset_id, user_id), chat_messages(id, thread_id, role, content,
             sql_used, chart_spec, source_row_keys[])
forecasts(id, dataset_id, metric, model, params, horizon, created_at)
forecast_points(forecast_id, ts, yhat, lower, upper)
forecast_actuals(forecast_id, ts, actual, error)   -- accountability
passports(id, dataset_id, public_id, content_json, content_hash, created_at)
kpi_definitions(id, tenant_id, name, definition, sql_expr)
audit_log(id, tenant_id, actor_type, actor_id, action, target, detail_json, ts)
privacy_ledger(id, tenant_id, seq, actor, action, dataset_id, model, fields_masked,
               bytes_external, payload_hash, prev_hash, entry_hash, ts)
agent_runs(id, tenant_id, agent, input_json, output_json, tool_calls_json, approved_by, ts)
safety_scores(id, tenant_id, score, findings_json, ts)
encryption_keys(id, tenant_id, wrapped_key, status, created_at, destroyed_at)
deletion_receipts(id, tenant_id, dataset_id, key_id, ts, signature)
```

### Row-Level Security pattern
```sql
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON datasets
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```
Apply to every tenant-owned table.

## 3. Additional Tables (sources, crew, strategy, SaaS)

```sql
sources(id, tenant_id, type, name, config_json, status, read_only, last_sync_at)  -- file|url|db|mcp|api|email|watch
source_credentials(id, source_id, encrypted_blob, scopes, rotated_at)
source_passports(id, dataset_id, source_id, origin_ref, collected_at, collected_what,
                 robots_check, pii_found, rows_collected)
scrape_jobs(id, source_id, url, schema_json, status, rate_limit_key, last_run_at)
webhook_keys(id, tenant_id, key_hash, label, created_at, revoked_at)
workflows(id, tenant_id, nl_instruction, steps_json, schedule_cron, reminders_json, active)
workflow_runs(id, workflow_id, status, started_at, finished_at, log_json)
approvals(id, tenant_id, agent_run_id, kind, status, requested_at, decided_by, decided_at)
opportunities(id, tenant_id, dataset_id, title, narrative, value_at_stake_inr, assumptions_json,
              confidence, evidence_row_keys[], status, task_owner, outcome_json)
whatif_scenarios(id, dataset_id, params_json, result_json, created_by, created_at)
ceo_briefs(id, tenant_id, period, content_json, sent_at)
notification_channels(id, tenant_id, type, config_json)   -- email|slack
notifications(id, tenant_id, channel_id, event, payload_json, sent_at, status)
usage_events(id, tenant_id, kind, quantity, ts)           -- rows, agent_runs, connectors, forecasts
plan_limits(plan, kind, limit)
api_keys(id, tenant_id, key_hash, scopes, created_at)
```

All tenant-owned tables get the same row-level security policy shown above.

## 4. Folders / Categories

`folders` form a tree per tenant; datasets also carry `classification` (payroll, invoices, sales, inventory, HR) and free-form `tags`. Routing suggestion example: "HR only, mask salary column".

## 5. Neo4j Lineage Graph

**Nodes:** `Dataset`, `Version`, `Column`, `Step`, `Agent`, `User`, `Rule`, `Document`, `Cluster`, `Record` (for dedupe, optional).

**Relationships:**
```
(Version)-[:DERIVED_FROM]->(Version)
(Step)-[:APPLIED_TO]->(Column)
(Step)-[:PRODUCED]->(Version)
(User|Agent)-[:APPROVED|PROPOSED]->(Step)
(Column)-[:MAPPED_TO]->(Column)          // schema mapping
(Rule)-[:CHECKS]->(Column)
(Document)-[:DEFINES]->(Rule)
(Record)-[:DUPLICATE_OF {score}]->(Record)
(Cluster)-[:CONTAINS]->(Record)
```

Uses: Data Passport lineage, "what breaks if I change this column?", graph-based dedupe (connected components), GraphRAG chat.

**Why a graph:** lineage (datasets, columns, cleaning steps, agents and users are nodes) powers the Data Passport and "what breaks if I change this column?"; **graph-based dedupe** turns near-duplicate pairs into edges and merges each connected cluster, directly serving #11; GraphRAG adds relationships to vector search.

**Free-tier limit:** ~200,000 nodes and 400,000 relationships. Store **cluster/lineage metadata**, not every raw cell. For huge dedupe jobs, keep pair edges in Postgres/DuckDB and push only summaries to Neo4j.

## 6. Vector Collections

**What vectors do in the product:**
- **Semantic dedupe:** embed each row; "Ravi Kumar" and "Kumar, Ravi" cluster together, then the graph merges them.
- **Value normalization:** "Hyd", "hyderabad " and "Hydrabad" snap to the nearest canonical value.
- **Column matching:** map messy headers to a target schema by meaning ("ph no" → "phone").
- **Anomaly flagging:** rows far from every cluster are flagged.
- **Agent memory and KPI Truth Layer:** each company's definitions and past fixes.
- **Semantic cache:** reuse answers to similar questions to save free LLM quotas.
- **GraphRAG chat:** Qdrant finds similar content, Neo4j adds relationships.

### Qdrant (cloud mode)
Single collection per purpose with a `tenant_id` payload index (efficient on 1 GB free tier).

| Collection | Vectors | Payload |
|------------|---------|---------|
| `row_embeddings` | named: `row_content`, `description` | tenant_id, dataset_id, row_key |
| `column_embeddings` | `name`, `meaning` | tenant_id, dataset_id, column |
| `value_canon` | canonical value vectors | tenant_id, column_type, canonical |
| `kpi_memory` | definition text | tenant_id, kpi |
| `semantic_cache` | question embedding | tenant_id, dataset_id, answer_ref |

**Tenancy:** final choice is **one collection per purpose with a `tenant_id` payload index** (efficient on the 1 GB free tier). The earlier idea (separate collection per company with scoped API keys) is kept as an enterprise-tier option.

Features used: hybrid (dense + sparse, RRF), payload filtering, named/multi vectors, scalar/binary quantization, recommend/discovery API, grouping (one best match per cluster), snapshots (Time Machine backups).

**Free-tier note:** 1 GB cluster, no card, no time limit; **paused after ~7 consecutive days of inactivity.** Keep-alive needed. Recommend/discovery API supports "find rows like these good ones, unlike those bad ones"; grouping returns one best match per cluster for dedupe review.

### Chroma (local mode)
Embedded persistent client, one collection per company, metadata filters. Same logical collections as above.

### Embeddings
`fastembed` with `bge-small` locally (or Qdrant free cloud inference with selected models).

## 7. File Storage Layout

```
tenant/{tenant_id}/
  raw/{dataset_id}/{original_filename}.enc
  work/{dataset_id}/v{n}.parquet.enc
  exports/{dataset_id}/{timestamp}.{csv|xlsx}
  docs/{doc_id}.pdf.enc
  passports/{public_id}.json
  recipes/{recipe_id}.json
  twins/{dataset_id}.parquet
```

**No-card storage plan (R2 dropped because it needs a payment method):**
| Option | Use | Caveat |
|--------|-----|--------|
| Supabase Storage | Primary file store | ~1 GB free (verify current limit); keep retention short; Parquet to save space |
| Hugging Face private dataset repo | Large demo datasets, versioned Parquet | Limits not re-verified |
| GitHub private repo + token | Small items only: recipes, Passport JSON, audit snapshots | 100 MB per-file cap; not bulk storage |
| Local disk / MinIO | Offline private mode, demo backups | Zero signup |

**Client-side encryption:** because GitHub and Hugging Face are third parties, encrypt with the per-company key before upload so they hold only ciphertext. Swap in R2/S3 later via StorageAdapter if a card is available.

## 8. Encryption and Crypto-Erasure

- Envelope encryption: master key (env/KMS) wraps per-tenant data keys.
- Files and sensitive columns encrypted with data key.
- "Delete" = destroy wrapped key + remove objects; write `deletion_receipts` row with signature.

## 9. Versioning ("Data Time Machine")

- Each execution creates a new `dataset_versions` row and Parquet file; original raw file is never modified.
- Undo = repoint `current_version_id` and log it.
- Time Machine (roadmap): snapshot of dataset versions, rules, KPIs and agent decisions per date; Qdrant snapshots + Postgres history.

## 10. Retention and Quotas

| Item | Default |
|------|---------|
| Raw uploads | Keep until user deletes (free tier: short retention) |
| Working versions | Keep last N; prune older |
| Ledger | Never pruned (append-only) |
| Semantic cache | TTL 7-30 days |

## 11. Indexing Notes

Postgres: indexes on `(tenant_id, dataset_id)`, `(dataset_id, version_no)`, `risks(dataset_id, severity)`, `privacy_ledger(tenant_id, seq)`. Neo4j: constraints on `id`, index on `tenant_id`. Qdrant: payload index on `tenant_id`, `dataset_id`.

## 12. Demo Dataset Spec

Base data (pick one): Olist Brazilian E-Commerce, Superstore Sales or Online Retail II, Telco Customer Churn, Nashville Housing, "Dirty Cafe Sales", data.gov.in / Kaggle India datasets. Credit sources and check licenses.

Inject with a Python + Faker script:
- ~8% duplicates, including near-duplicates ("Ravi Kumar" / "Kumar, Ravi")
- Dates in 4-5 formats
- City variants ("Hyd", "hyderabad ", "Hyderabad")
- 10-15% missing values in key columns
- Phone numbers in the salary column; "test" entries
- A few extreme outliers
- Fake PII (names, emails, Aadhaar-style numbers)
- Fake contract PDF ("payment within 30 days") plus invoices, some violating it

Keep a seeded generator so the "before" score is reproducibly ~42.
