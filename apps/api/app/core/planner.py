"""Plan generation: rule-based planner (deterministic, offline) + schema validation + LLM orchestration with retry/fallback."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

import jsonschema
import polars as pl

from ..config import settings
from .clusters import name_canonical, variant_clusters
from .common import ROW_ID, data_columns, is_null_token, parse_date, parse_number, snake, str_values
from .executors import apply_step
from .health import TEST_RE, numeric_validity
from .profile import profile_dataframe

ALIASES = {
    "ph_no": "phone", "phone_number": "phone", "mobile_no": "phone", "mobile": "phone", "contact_no": "phone",
    "full_name": "name", "customer_name": "name", "e_mail": "email", "email_id": "email", "email_address": "email",
    "cust_id": "customer_id", "customer_no": "customer_id", "aadhaar_no": "aadhaar", "aadhar_no": "aadhaar",
    "aadhaar_number": "aadhaar", "amt_inr": "amount_inr", "amt": "amount",
}


def load_plan_schema() -> dict[str, Any]:
    return json.loads((Path(settings.schemas_dir) / "plan.schema.json").read_text())


def validate_plan(plan: dict[str, Any]) -> list[str]:
    v = jsonschema.Draft202012Validator(load_plan_schema())
    return [f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message}" for e in v.iter_errors(plan)]


def _step(n: int, typ: str, cols: list[str], params: dict, why: str, conf: float, risk: str, reversible: bool = True) -> dict:
    return {"id": f"s{n}", "type": typ, "columns": cols, "params": params, "rationale": why,
            "confidence": conf, "risk_level": risk, "affected_rows_estimate": 0, "reversible": reversible}


def guess_dataset_type(semantic: dict[str, str], cols: list[str]) -> str:
    names = " ".join(snake(c) for c in cols)
    if "invoice" in names or ("amount" in names and "status" in names):
        return "invoices"
    if "salary" in names or "employee" in names:
        return "hr_records"
    if "email" in semantic.values() and "phone" in semantic.values():
        return "customer_records"
    return "generic_table"


def rule_based_plan(df: pl.DataFrame) -> dict[str, Any]:
    """Build a plan by running detectors against the evolving frame so later steps see earlier cleaning."""
    cur = df
    steps: list[dict] = []
    prof0 = profile_dataframe(df)
    dataset_type = guess_dataset_type(prof0["semantic"], data_columns(df))

    def add(typ, cols, params, why, conf, risk, reversible=True) -> None:
        nonlocal cur
        st = _step(len(steps) + 1, typ, cols, params, why, conf, risk, reversible)
        try:
            new, info = apply_step(cur, st)
        except Exception:
            return
        if info["affected_rows"] == 0 and typ not in ("rename_columns",):
            return
        st["affected_rows_estimate"] = info["affected_rows"]
        steps.append(st)
        cur = new

    # 1. column names
    mapping: dict[str, str] = {}
    used = set(data_columns(df))
    for c in data_columns(df):
        new = ALIASES.get(snake(c), snake(c))
        if new != c and (new not in used or new == snake(c) and new not in used):
            mapping[c] = new
            used.add(new)
    if mapping:
        add("rename_columns", list(mapping), {"mapping": mapping}, "Normalise headers to snake_case and standard names", 0.97, "low")

    str_cols = [c for c in data_columns(cur) if cur[c].dtype == pl.Utf8]
    add("normalize_values", str_cols, {"null_tokens": True, "strip": False},
        "Turn placeholders like 'N/A', '-', 'null' and blanks into real empty cells", 0.95, "low")

    prof = profile_dataframe(cur)
    sem = prof["semantic"]
    cols = data_columns(cur)
    by = lambda t: [c for c in cols if sem.get(c) == t]

    # 2. test entries
    id_like = [c for c in cols if sem.get(c) in ("name", "email", "id")]
    if id_like:
        where = {"any": [{"column": c, "op": "regex", "value": r"(^|[^a-z])test([^a-z]|$)", "ci": True} for c in id_like]}
        add("remove_rows", id_like, {"where": where}, "Rows whose name/email/id contains 'test' look like test entries", 0.85, "medium", True)

    # 3. categorical variants
    for c in by("category"):
        vals = [v for v in str_values(cur[c]) if not is_null_token(v)]
        if not vals:
            continue
        mp = variant_clusters(vals)
        diff = {k: v for k, v in mp.items() if k != v}
        if diff:
            add("normalize_values", [c], {"mapping": diff, "strip": True}, f"Merge spelling/case/whitespace variants in '{c}'", 0.93, "low")

    # 4. names / emails
    for c in by("name"):
        vals = [v for v in str_values(cur[c]) if not is_null_token(v)]
        has_comma = any("," in v for v in vals)
        add("normalize_values", [c], {"strip": True, "case": "title", "reorder_comma_names": has_comma},
            "Trim, title-case and put 'Last, First' into 'First Last'", 0.92, "low")
    for c in by("id"):
        vals = [v for v in str_values(cur[c]) if not is_null_token(v)]
        if any(v != v.strip() or v != v.upper() for v in vals):
            add("normalize_values", [c], {"strip": True, "case": "upper"}, "Trim and upper-case identifiers so the same ID is always written the same way", 0.9, "low")
    for c in by("aadhaar"):
        vals = [v for v in str_values(cur[c]) if not is_null_token(v)]
        if vals:
            add("normalize_values", [c], {"mapping": {v: " ".join(re.sub(r"\D", "", v)[i:i + 4] for i in (0, 4, 8)) for v in set(vals) if len(re.sub(r"\D", "", v)) == 12 and v != " ".join(re.sub(r"\D", "", v)[i:i + 4] for i in (0, 4, 8))}, "strip": True},
                "Write 12-digit ID numbers in one format (4-4-4)", 0.9, "low")
    for c in by("email"):
        add("normalize_values", [c], {"strip": True, "case": "lower"}, "Trim and lower-case email addresses", 0.97, "low")

    # 5. dates, phones, numbers
    for c in by("date"):
        add("standardize_dates", [c], {"format": "%Y-%m-%d"}, "Convert mixed date formats to ISO 8601 (day-first for ambiguous dates)", 0.9, "medium")
    for c in by("phone"):
        add("normalize_phone", [c], {}, "Normalise to 10-digit Indian mobile numbers; invalid numbers become empty", 0.9, "medium")
    for c in by("numeric"):
        if cur[c].dtype.is_numeric():
            continue
        add("cast_type", [c], {"to": "float", "strip_non_numeric": True, "max_median_multiple": 1000},
            f"Convert '{c}' to a number; strip currency/commas and blank implausible values (e.g. phone numbers)", 0.85, "medium")

    # 6. duplicates
    add("drop_duplicates", [], {}, "Remove exact duplicate rows (after normalisation)", 0.98, "low")
    key_cols = [c for c in cols if sem.get(c) in ("name", "email")] or [c for c in cols if sem.get(c) in ("name",)]
    if key_cols:
        add("fuzzy_dedupe", key_cols, {"threshold": 92}, "Merge near-duplicate records (same person written differently)", 0.8, "medium")

    # 7. missing values (only where a defensible fill exists)
    prof = profile_dataframe(cur)
    for c in data_columns(cur):
        s = prof["semantic"].get(c)
        info = prof["columns"][c]
        if info["null_count"] == 0:
            continue
        if s == "numeric":
            add("fill_missing", [c], {"strategy": "median"}, f"Fill missing '{c}' with the median (flagged medium risk: invents values)", 0.7, "medium")
        elif s == "category":
            add("fill_missing", [c], {"strategy": "constant", "value": "Unknown"}, f"Mark missing '{c}' as 'Unknown'", 0.8, "low")

    # 8. outliers
    for c in data_columns(cur):
        if prof["semantic"].get(c) == "numeric":
            add("flag_outliers", [c], {"action": "cap", "iqr_k": 3.0}, f"Cap extreme values in '{c}' at 3×IQR fences", 0.75, "medium")

    # 9. PII masking of government ids
    for c in data_columns(cur):
        s = prof["semantic"].get(c)
        if s in ("aadhaar", "pan"):
            add("normalize_values", [c], {"mask": s, "strip": True}, f"Mask {s.upper()} numbers (keep last 4) before sharing", 0.9, "medium")

    plan = {"dataset_type": dataset_type, "steps": steps}
    return plan


def generate_plan(df: pl.DataFrame, llm: Any, masked_rows: list[dict], profile: dict) -> tuple[dict[str, Any], str, str]:
    """Return (plan, source, notes). LLM first (validated, one retry), else rule-based fallback."""
    notes = ""
    base = rule_based_plan(df)
    if llm is not None and getattr(llm, "name", "mock") != "mock":
        feedback = ""
        for attempt in range(2):
            try:
                raw = llm.plan(profile_for_llm(profile), masked_rows, feedback)
            except Exception as e:  # network down, bad key, etc.
                notes = f"LLM unavailable ({type(e).__name__}); used rule-based planner"
                break
            errs = validate_plan(raw) if isinstance(raw, dict) else ["not an object"]
            if not errs:
                return _finalize(df, raw), "llm", "LLM plan validated against schema; row estimates recomputed by the engine"
            feedback = "; ".join(errs[:5])
            notes = f"LLM plan failed validation ({feedback}); retried" if attempt == 0 else f"LLM plan failed validation twice; fell back to rule-based planner"
    return base, "rule_based", notes or "Rule-based planner (deterministic, offline)"


def profile_for_llm(profile: dict) -> dict:
    """Profile with raw sample values removed: only types and counts leave the machine."""
    cols = {c: {k: v for k, v in i.items() if k not in ("samples", "top_values")} for c, i in profile["columns"].items()}
    return {"rows": profile["rows"], "columns": cols}


def _finalize(df: pl.DataFrame, plan: dict) -> dict:
    cur = df
    good = []
    for st in plan["steps"]:
        try:
            cur2, info = apply_step(cur, st)
        except Exception:
            continue  # drop steps that cannot execute on the real data
        st["affected_rows_estimate"] = info["affected_rows"]
        good.append(st)
        cur = cur2
    plan["steps"] = good
    return plan
