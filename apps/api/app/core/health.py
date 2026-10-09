"""Deterministic Data Health Score (0-100). No LLM anywhere in this module.

column_score = 100 * (.25*completeness + .20*uniqueness + .20*consistency + .20*validity
                      + .10*(1-outlier) + .05*(1-pii_exposed))
Each dimension is 1 - min(1, SENS[dim] * issue_rate); the sensitivities are documented in docs/SCORING.md
and are stored with every score so the Data Passport can recompute it.
dataset_score = weighted mean of column scores (key columns weigh 2, others 1).
"""
from __future__ import annotations

import re
from collections import Counter
from typing import Any

import polars as pl

from .clusters import name_canonical, variant_clusters
from .common import (
    EMAIL_RE, NUM_RE, ROW_ID, data_columns, is_null_token, parse_date_fmt, parse_number, pattern_class,
    phone_digits, str_values,
)
from .pii import PII_SEMANTIC, column_masked_share
from .profile import profile_dataframe

WEIGHTS = {"completeness": 0.25, "uniqueness": 0.20, "consistency": 0.20, "validity": 0.20, "outlier": 0.10, "pii": 0.05}
SENS = {"completeness": 3.0, "uniqueness": 10.0, "consistency": 5.0, "validity": 7.0, "outlier": 12.0}
KEY_TYPES = {"id", "email", "name", "numeric"}
KEY_WEIGHT = 2.0
TEST_RE = re.compile(r"(?i)(^|[^a-z])test([^a-z]|$)")
MAGNITUDE_LIMIT = 1000.0
OUTLIER_IQR_K = 3.0


def _dim(rate: float, key: str) -> float:
    return 1.0 - min(1.0, SENS[key] * rate)


def row_duplicate_rate(df: pl.DataFrame) -> float:
    cols = data_columns(df)
    if df.height == 0 or not cols:
        return 0.0
    return (df.height - df.select(cols).unique().height) / df.height


def numeric_stats(vals: list[float]) -> dict[str, float]:
    s = sorted(vals)
    n = len(s)
    if n == 0:
        return {"median": 0.0, "q1": 0.0, "q3": 0.0}
    def q(p: float) -> float:
        i = p * (n - 1)
        lo = int(i)
        hi = min(lo + 1, n - 1)
        return s[lo] + (s[hi] - s[lo]) * (i - lo)
    return {"median": q(0.5), "q1": q(0.25), "q3": q(0.75)}


def numeric_validity(raw: list[str | None]) -> tuple[list[float], int, int]:
    """Return (valid floats, n_invalid, n_non_null)."""
    non_null = [v for v in raw if not is_null_token(v)]
    parsed = [parse_number(v) for v in non_null]
    good = [x for x in parsed if x is not None and x >= 0]
    med = numeric_stats(good)["median"]
    limit = MAGNITUDE_LIMIT * max(med, 1.0)
    valid = [x for x in good if abs(x) <= limit]
    return valid, len(non_null) - len(valid), len(non_null)


def _column_metrics(c: str, s: pl.Series, sem: str, row_dup: float, n: int) -> dict[str, Any]:
    raw = str_values(s)
    non_null = [v for v in raw if not is_null_token(v)]
    m = len(non_null)
    null_rate = (n - m) / n if n else 0.0
    inconsistent = 0
    invalid = 0
    outliers = 0
    uniq_rate = row_dup
    if sem in ("id", "email") and m:
        key = [v.strip().lower() for v in non_null]
        uniq_rate = (m - len(set(key))) / m
    if m:
        if sem == "category":
            mapping = variant_clusters(non_null)
            inconsistent = sum(1 for v in non_null if mapping[v] != v)
        elif sem == "date":
            parsed = [parse_date_fmt(v) for v in non_null]
            ok = [p for p in parsed if p]
            invalid = len(parsed) - len(ok)
            if ok:
                dom = Counter(f for _, f in ok).most_common(1)[0][0]
                inconsistent = sum(1 for _, f in ok if f != dom) if s.dtype == pl.Utf8 else 0
        elif sem == "phone":
            canon = [phone_digits(v) for v in non_null]
            invalid = sum(1 for x in canon if x is None)
            inconsistent = sum(1 for v, x in zip(non_null, canon) if x is not None and v.strip() != x)
        elif sem == "email":
            invalid = sum(1 for v in non_null if not EMAIL_RE.match(v.strip().lower()))
            inconsistent = sum(1 for v in non_null if v != v.strip().lower())
            invalid += sum(1 for v in non_null if TEST_RE.search(v))
        elif sem == "name":
            inconsistent = sum(1 for v in non_null if name_canonical(v) != v)
            invalid = sum(1 for v in non_null if TEST_RE.search(v))
        elif sem == "numeric":
            valid, invalid, _ = numeric_validity(raw)
            inconsistent = sum(1 for v in non_null if not (isinstance(v, (int, float)) or NUM_RE.match(str(v).strip())))
            if len(valid) >= 8:
                st = numeric_stats(valid)
                iqr = st["q3"] - st["q1"]
                lo, hi = st["q1"] - OUTLIER_IQR_K * iqr, st["q3"] + OUTLIER_IQR_K * iqr
                outliers = sum(1 for x in valid if x < lo or x > hi)
        elif sem == "aadhaar":
            def ok(v: str) -> bool:
                d = re.sub(r"\D", "", v)
                return len(d) == 12 or bool(re.match(r"^X{4} X{4} \d{4}$", v.strip()))
            invalid = sum(1 for v in non_null if not ok(v))
            cls = Counter(pattern_class(v) for v in non_null)
            inconsistent = m - cls.most_common(1)[0][1]
        elif sem == "id":
            cls = Counter(pattern_class(v) for v in non_null)
            inconsistent = m - cls.most_common(1)[0][1]
            invalid = sum(1 for v in non_null if TEST_RE.search(v))
        else:
            inconsistent = sum(1 for v in non_null if v != v.strip())
    inc_rate = inconsistent / m if m else 0.0
    inv_rate = invalid / m if m else 0.0
    out_rate = outliers / m if m else 0.0
    pii_exposed = 0.0
    if sem in PII_SEMANTIC:
        pii_exposed = 1.0 - column_masked_share(s)
    dims = {
        "completeness": _dim(null_rate, "completeness"),
        "uniqueness": _dim(uniq_rate, "uniqueness"),
        "consistency": _dim(inc_rate, "consistency"),
        "validity": _dim(inv_rate, "validity"),
        "outlier": _dim(out_rate, "outlier"),
        "pii": 1.0 - pii_exposed,
    }
    score = 100.0 * sum(WEIGHTS[k] * dims[k] for k in WEIGHTS)
    return {
        "semantic": sem, "score": round(score, 2), "dims": {k: round(v, 4) for k, v in dims.items()},
        "inputs": {"null_rate": round(null_rate, 4), "uniq_rate": round(uniq_rate, 4), "inconsistent_rate": round(inc_rate, 4),
                   "invalid_rate": round(inv_rate, 4), "outlier_rate": round(out_rate, 4), "pii_exposed": round(pii_exposed, 4)},
        "weight": KEY_WEIGHT if sem in KEY_TYPES else (0.5 if sem == "text" else 1.0),
    }


def score_dataframe(df: pl.DataFrame, semantic: dict[str, str] | None = None) -> dict[str, Any]:
    n = df.height
    if semantic is None:
        semantic = profile_dataframe(df)["semantic"]
    row_dup = row_duplicate_rate(df)
    cols: dict[str, Any] = {}
    for c in data_columns(df):
        cols[c] = _column_metrics(c, df[c], semantic.get(c, "text"), row_dup, n)
    tw = sum(v["weight"] for v in cols.values()) or 1.0
    total = sum(v["score"] * v["weight"] for v in cols.values()) / tw
    return {
        "score": round(total, 1), "rows": n, "row_duplicate_rate": round(row_dup, 4),
        "weights": WEIGHTS, "sensitivities": SENS, "per_column": cols,
        "formula_version": "1.0",
    }


def recompute_from_inputs(score_doc: dict[str, Any]) -> float:
    """Recompute the dataset score from stored column inputs (used by Passport verify)."""
    cols = score_doc["per_column"]
    tw = sum(v["weight"] for v in cols.values()) or 1.0
    total = 0.0
    for v in cols.values():
        i = v["inputs"]
        dims = {
            "completeness": _dim(i["null_rate"], "completeness"), "uniqueness": _dim(i["uniq_rate"], "uniqueness"),
            "consistency": _dim(i["inconsistent_rate"], "consistency"), "validity": _dim(i["invalid_rate"], "validity"),
            "outlier": _dim(i["outlier_rate"], "outlier"), "pii": 1.0 - i["pii_exposed"],
        }
        total += 100.0 * sum(WEIGHTS[k] * dims[k] for k in WEIGHTS) * v["weight"]
    return round(total / tw, 1)
