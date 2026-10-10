# 13 · Schemas and Contracts

Reference snippets so every file's design has a concrete shape. Treat as starting points.

## 1. Cleaning Plan (LLM output, validated)

```json
{
  "dataset_type": "invoices",
  "steps": [
    {
      "id": "s1",
      "type": "normalize_values",
      "columns": ["city"],
      "params": {"mapping": {"Hyd": "Hyderabad", "hyderabad ": "Hyderabad", "Hydrabad": "Hyderabad"}},
      "rationale": "Variants of one city",
      "confidence": 0.96,
      "risk_level": "low",
      "affected_rows_estimate": 312,
      "reversible": true
    }
  ]
}
```
**Allowed `type` enum:** `drop_duplicates, fuzzy_dedupe, fill_missing, standardize_dates, normalize_values, normalize_phone, rename_columns, split_column, merge_columns, cast_type, remove_rows, flag_outliers, restructure_to_schema, validate_rule`.
`remove_rows` filters use a restricted expression grammar (no arbitrary code).

## 2. Health Score (deterministic)

```
column_score = 100 * (w_c*completeness + w_u*uniqueness + w_k*consistency
                    + w_v*validity + w_o*(1 - outlier_rate) + w_p*(1 - pii_exposed))
dataset_score = weighted mean of column_score (key columns weigh more)
weights (default): completeness .25, uniqueness .20, consistency .20, validity .20, outlier .10, pii .05
```
No LLM in the loop. Store inputs with the score so the Passport can recompute it.

## 3. Data Passport (JSON)

```json
{
  "public_id": "psp_8f2c...",
  "dataset": {"name": "sales_2025.xlsx", "source": {"type": "file", "origin": "upload", "collected_at": "2026-10-09T10:00:00Z"}},
  "score": {"before": 42, "after": 94, "per_column": {"city": [38, 97]}},
  "changes": [{"step_id": "s1", "type": "normalize_values", "approved_by": "user_12", "rows": 312, "undo_ref": "v2"}],
  "risks": {"found": 14, "resolved": 12, "open": 2},
  "lineage": {"versions": ["v0", "v1", "v2"], "recipe_hash": "sha256:..."},
  "privacy": {"fields_masked": 6, "bytes_sent_external": 0, "mode": "local"},
  "content_hash": "sha256:..."
}
```
`content_hash` = SHA-256 of canonical JSON (sorted keys, hash field excluded). "Verify" recomputes it.

## 4. Privacy Ledger Entry (hash chain)

```
entry_hash = SHA256( prev_hash || tenant_id || seq || actor || action || dataset_id
                     || model || fields_masked || bytes_external || payload_hash || ts )
```
Verification walks entries by `seq` and checks each `prev_hash` link. Append-only: no UPDATE/DELETE grants.

## 5. Forecast Accountability Record

```json
{"forecast_id": "f_01", "metric": "revenue", "made_at": "2026-10-09", "horizon": "90d",
 "points": [{"ts": "2026-11-01", "yhat": 12.4, "lower": 10.9, "upper": 13.8}],
 "actuals": [{"ts": "2026-11-01", "actual": 11.7, "abs_pct_error": 0.057, "inside_interval": true}]}
```
Show: MAPE/sMAPE, interval coverage ("actuals fell inside our range 8 of 10 times"), and misses.

## 6. Opportunity (Strategist output)

```json
{"title": "Region B churn is 3x higher",
 "value_at_stake_inr_per_month": "computed, never LLM-generated",
 "assumptions": {"avg_monthly_revenue": "...", "excess_churn_customers": "..."},
 "confidence": "medium",
 "evidence_row_keys": ["c_1042", "c_1077"],
 "next_step": "Review onboarding for Region B"}
```

## 7. Text-to-SQL Guard Rules
1. Parse SQL with a real parser; exactly one statement; must be `SELECT`.
2. Tables/columns must be in the dataset allowlist.
3. Inject `LIMIT` if absent; statement timeout.
4. Execute with read-only credentials.
5. Return `row_keys` of contributing rows for the "source rows" link.

## 8. Example API Calls

```http
POST /datasets/{id}/plan            → 202 {"job_id": "j_1"}
GET  /jobs/j_1                      → {"status":"done","plan_id":"p_9"}
PATCH /plans/p_9/steps/s1           {"approved": false}
POST /plans/p_9/execute             → 202 {"job_id":"j_2"}
GET  /datasets/{id}/diff?step=s1    → changed cells (windowed)
GET  /plans/p_9/recipe?fmt=python   → script
POST /datasets/{id}/chat            {"question":"Which region has the most overdue payments?"}
     → {"answer":"...","chart_spec":{...},"sql":"SELECT ...","source_row_keys":["..."]}
```

## 9. Error Envelope
```json
{"code":"PLAN_INVALID","message":"Plan failed schema validation","hint":"Retried once; falling back to rule-based suggestions","request_id":"r_77"}
```

## 10. Recipe Export (Python shape)
```python
import polars as pl
df = pl.read_parquet("input.parquet")
df = df.unique()                                           # s0 drop_duplicates
df = df.with_columns(pl.col("city").str.strip_chars().replace(MAPPING_CITY))  # s1
# ... one commented block per approved step, in order
df.write_csv("clean.csv")
```
