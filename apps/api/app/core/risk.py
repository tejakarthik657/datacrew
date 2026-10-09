"""Risk grid (Auditor): PII, outliers, rule violations, duplicates, missing values. Colours reserved for risk semantics."""
from __future__ import annotations

from typing import Any

import polars as pl

from .health import numeric_validity, row_duplicate_rate, score_dataframe
from .pii import PII_SEMANTIC, column_masked_share
from .rules import evaluate_rule


def risk_grid(df: pl.DataFrame, semantic: dict[str, str], rules: list[dict] | None = None, score: dict | None = None) -> list[dict[str, Any]]:
    score = score or score_dataframe(df, semantic)
    risks: list[dict[str, Any]] = []
    for c, m in score["per_column"].items():
        i = m["inputs"]
        sem = m["semantic"]
        if sem in PII_SEMANTIC and i["pii_exposed"] > 0.5:
            sev = "red" if sem in ("aadhaar", "pan") else "amber"
            risks.append({"id": f"pii:{c}", "kind": "pii", "column": c, "severity": sev, "count": df.height, "detail": f"{sem} values are unmasked"})
        if i["outlier_rate"] > 0:
            risks.append({"id": f"outlier:{c}", "kind": "outliers", "column": c, "severity": "amber", "count": round(i["outlier_rate"] * df.height), "detail": "extreme values (3×IQR)"})
        if i["invalid_rate"] > 0:
            risks.append({"id": f"invalid:{c}", "kind": "rule_violation", "column": c, "severity": "red" if i["invalid_rate"] > 0.05 else "amber",
                          "count": round(i["invalid_rate"] * df.height), "detail": f"invalid {sem} values"})
        if i["null_rate"] > 0.05:
            risks.append({"id": f"missing:{c}", "kind": "missing", "column": c, "severity": "amber" if i["null_rate"] < 0.25 else "red",
                          "count": round(i["null_rate"] * df.height), "detail": f"{i['null_rate']:.0%} missing"})
    dup = row_duplicate_rate(df)
    if dup > 0:
        risks.append({"id": "duplicates", "kind": "duplicates", "column": None, "severity": "amber" if dup < 0.1 else "red", "count": round(dup * df.height), "detail": "exact duplicate rows"})
    for r in rules or []:
        try:
            bad = evaluate_rule(df, r)
        except ValueError:
            continue
        if bad:
            risks.append({"id": f"rule:{r['text']}", "kind": "custom_rule", "column": r.get("column"), "severity": "amber", "count": len(bad), "detail": r["text"]})
    return risks


def risk_summary(before: list[dict], after: list[dict]) -> dict[str, int]:
    b = {r["id"] for r in before}
    a = {r["id"] for r in after}
    return {"found": len(b), "resolved": len(b - a), "open": len(a)}
