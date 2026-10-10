"""Deterministic step executors for every plan step type. The LLM never runs any of this logic."""
from __future__ import annotations

import re
from typing import Any, Callable

import networkx as nx
import polars as pl
from rapidfuzz import fuzz

from .clusters import name_canonical, norm_key
from .common import (
    ROW_ID, data_columns, is_null_token, map_unique, parse_date, parse_number, phone_digits, str_values,
)
from .pii import mask_aadhaar, mask_pan

STEP_TYPES = [
    "drop_duplicates", "fuzzy_dedupe", "fill_missing", "standardize_dates", "normalize_values", "normalize_phone",
    "rename_columns", "split_column", "merge_columns", "cast_type", "remove_rows", "flag_outliers",
    "restructure_to_schema", "validate_rule",
]


class StepError(ValueError):
    pass


def _need(df: pl.DataFrame, cols: list[str]) -> None:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise StepError(f"columns not found: {missing}")


# ---- restricted expression grammar for remove_rows / validate_rule -------------------------------
def condition_mask(df: pl.DataFrame, cond: dict[str, Any]) -> pl.Series:
    if "all" in cond or "any" in cond:
        key = "all" if "all" in cond else "any"
        masks = [condition_mask(df, c) for c in cond[key]]
        if not masks:
            return pl.Series([False] * df.height)
        out = masks[0]
        for m in masks[1:]:
            out = (out & m) if key == "all" else (out | m)
        return out
    col, op, val = cond.get("column"), cond.get("op"), cond.get("value")
    _need(df, [col])
    s = df[col]
    st = pl.Series(str_values(s), dtype=pl.Utf8)
    ci = cond.get("ci", True)
    if op == "is_null":
        return pl.Series([is_null_token(v) for v in str_values(s)])
    if op == "not_null":
        return pl.Series([not is_null_token(v) for v in str_values(s)])
    if op in ("eq", "ne", "in"):
        norm = (lambda x: str(x).strip().lower()) if ci else (lambda x: str(x).strip())
        targets = {norm(v) for v in (val if op == "in" else [val])}
        m = pl.Series([v is not None and norm(v) in targets for v in st.to_list()])
        return ~m if op == "ne" else m
    if op == "contains":
        return st.str.to_lowercase().str.contains(re.escape(str(val).lower())).fill_null(False) if ci else st.str.contains(re.escape(str(val))).fill_null(False)
    if op == "regex":
        try:
            re.compile(str(val))
        except re.error as e:
            raise StepError(f"bad regex: {e}") from e
        return st.str.contains(("(?i)" if ci else "") + str(val)).fill_null(False)
    if op in ("lt", "gt", "lte", "gte", "between"):
        nums = [parse_number(v) for v in str_values(s)]
        def f(x: float | None) -> bool:
            if x is None:
                return False
            if op == "lt": return x < float(val)
            if op == "gt": return x > float(val)
            if op == "lte": return x <= float(val)
            if op == "gte": return x >= float(val)
            return float(cond["min"]) <= x <= float(cond["max"])
        return pl.Series([f(x) for x in nums])
    raise StepError(f"unsupported op: {op}")


# ---- individual executors -------------------------------------------------------------------------
def drop_duplicates(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    cols = step.get("columns") or data_columns(df)
    _need(df, cols)
    return df.unique(subset=cols, keep="first", maintain_order=True)


def fuzzy_dedupe(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    cols = step.get("columns") or []
    _need(df, cols)
    if not cols:
        raise StepError("fuzzy_dedupe needs columns")
    threshold = float(step.get("params", {}).get("threshold", 92))
    keys = []
    for r in df.select(cols).iter_rows():
        parts = []
        for v in r:
            t = "" if v is None else norm_key(" ".join(sorted(re.sub(r"[,]", " ", str(v)).lower().split())))
            parts.append(t)
        keys.append("|".join(parts))
    blocks: dict[str, list[int]] = {}
    for i, k in enumerate(keys):
        blocks.setdefault(k[:3], []).append(i)
    g = nx.Graph()
    g.add_nodes_from(range(df.height))
    for idxs in blocks.values():
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                if fuzz.ratio(keys[idxs[a]], keys[idxs[b]]) >= threshold:
                    g.add_edge(idxs[a], idxs[b])
    rows = df.to_dicts()
    drop: set[int] = set()
    for comp in nx.connected_components(g):
        if len(comp) < 2:
            continue
        ordered = sorted(comp)
        keep = ordered[0]
        for other in ordered[1:]:
            for c, v in rows[other].items():
                if c != ROW_ID and is_null_token(rows[keep].get(c)) and not is_null_token(v):
                    rows[keep][c] = v
            drop.add(other)
    kept = [r for i, r in enumerate(rows) if i not in drop]
    return pl.DataFrame(kept, schema=df.schema)


def fill_missing(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    strat = p.get("strategy", "mode")
    cols = step.get("columns", [])
    _need(df, cols)
    for c in cols:
        s = df[c]
        raw = str_values(s)
        miss = [is_null_token(v) for v in raw]
        if not any(miss):
            continue
        if strat in ("median", "mean"):
            nums = sorted(x for x in (parse_number(v) for v in raw) if x is not None)
            if not nums:
                continue
            fill: Any = nums[len(nums) // 2] if strat == "median" else sum(nums) / len(nums)
            if len(nums) % 2 == 0 and strat == "median":
                fill = (nums[len(nums) // 2 - 1] + nums[len(nums) // 2]) / 2
            vals = [fill if m else parse_number(v) for v, m in zip(raw, miss)]
            df = df.with_columns(pl.Series(c, vals, dtype=pl.Float64))
        elif strat == "constant":
            val = p.get("value", "Not specified")
            vals2 = [val if m else v for v, m in zip(raw, miss)]
            df = df.with_columns(pl.Series(c, vals2, dtype=pl.Utf8))
        elif strat == "mode":
            present = [v for v, m in zip(raw, miss) if not m]
            if not present:
                continue
            from collections import Counter
            mode = Counter(present).most_common(1)[0][0]
            df = df.with_columns(pl.Series(c, [mode if m else v for v, m in zip(raw, miss)], dtype=pl.Utf8))
        elif strat == "ffill":
            last = None
            out = []
            for v, m in zip(raw, miss):
                if m:
                    out.append(last)
                else:
                    last = v
                    out.append(v)
            df = df.with_columns(pl.Series(c, out, dtype=pl.Utf8))
        else:
            raise StepError(f"unknown fill strategy {strat}")
    return df


def standardize_dates(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    fmt = step.get("params", {}).get("format", "%Y-%m-%d")
    cols = step.get("columns", [])
    _need(df, cols)
    for c in cols:
        def conv(v: Any) -> str | None:
            d = parse_date(v)
            return d.strftime(fmt) if d else None
        s = pl.Series(c, str_values(df[c]), dtype=pl.Utf8)
        df = df.with_columns(map_unique(s, conv))
    return df


def normalize_values(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    mapping: dict[str, str] = p.get("mapping", {})
    cols = step.get("columns", [])
    _need(df, cols)
    case = p.get("case", "none")
    for c in cols:
        def conv(v: Any) -> Any:
            s = v if isinstance(v, str) else str(v)
            if p.get("null_tokens") and is_null_token(s):
                return None
            if s in mapping:
                return mapping[s]
            if p.get("strip", True):
                s = re.sub(r"\s+", " ", s.strip())
            if s in mapping:
                return mapping[s]
            if p.get("reorder_comma_names"):
                s = name_canonical(s) if case == "title" else s
            if case == "lower": s = s.lower()
            elif case == "upper": s = s.upper()
            elif case == "title" and not p.get("reorder_comma_names"): s = s.title()
            mask = p.get("mask")
            if mask == "aadhaar": s = mask_aadhaar(s)
            elif mask == "pan": s = mask_pan(s)
            return s
        df = df.with_columns(map_unique(pl.Series(c, str_values(df[c]), dtype=pl.Utf8), conv))
    return df


def normalize_phone(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    cols = step.get("columns", [])
    _need(df, cols)
    for c in cols:
        s = pl.Series(c, str_values(df[c]), dtype=pl.Utf8)
        df = df.with_columns(map_unique(s, phone_digits))
    return df


def rename_columns(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    mapping = step.get("params", {}).get("mapping", {})
    _need(df, list(mapping))
    targets = set(df.columns) - set(mapping)
    for new in mapping.values():
        if new in targets:
            raise StepError(f"rename target exists: {new}")
        targets.add(new)
    return df.rename(mapping)


def split_column(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    (col,) = step["columns"][:1] or [None]
    _need(df, [col])
    into = p["into"]
    delim = p.get("delimiter", " ")
    parts = []
    for v in str_values(df[col]):
        if v is None:
            parts.append([None] * len(into))
            continue
        bits = [b.strip() for b in v.split(delim, len(into) - 1)] if not p.get("regex") else list(re.split(p["regex"], v, maxsplit=len(into) - 1))
        bits = (bits + [None] * len(into))[: len(into)]
        parts.append(bits)
    for i, name in enumerate(into):
        df = df.with_columns(pl.Series(name, [r[i] for r in parts], dtype=pl.Utf8))
    if not p.get("keep_original", False):
        df = df.drop(col)
    return df


def merge_columns(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    cols = step.get("columns", [])
    _need(df, cols)
    sep = p.get("separator", " ")
    vals = zip(*[str_values(df[c]) for c in cols])
    merged = [sep.join(x for x in row if not is_null_token(x)) or None for row in vals]
    df = df.with_columns(pl.Series(p["into"], merged, dtype=pl.Utf8))
    if p.get("drop_sources", True):
        df = df.drop([c for c in cols if c != p["into"]])
    return df


def cast_type(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    to = p.get("to", "float")
    mult = p.get("max_median_multiple")
    cols = step.get("columns", [])
    _need(df, cols)
    for c in cols:
        raw = str_values(df[c])
        if to in ("float", "int"):
            nums = [parse_number(v) if p.get("strip_non_numeric", True) else (float(v) if v and re.fullmatch(r"-?\d+(\.\d+)?", v.strip()) else None) for v in raw]
            if p.get("min") is not None:
                nums = [x if x is None or x >= float(p["min"]) else None for x in nums]
            if mult:
                good = sorted(x for x in nums if x is not None and x >= 0)
                med = good[len(good) // 2] if good else 0.0
                lim = float(mult) * max(med, 1.0)
                nums = [x if x is None or abs(x) <= lim else None for x in nums]
            if to == "int":
                df = df.with_columns(pl.Series(c, [None if x is None else int(round(x)) for x in nums], dtype=pl.Int64))
            else:
                df = df.with_columns(pl.Series(c, nums, dtype=pl.Float64))
        elif to == "str":
            df = df.with_columns(pl.Series(c, raw, dtype=pl.Utf8))
        elif to == "date":
            df = df.with_columns(pl.Series(c, [(parse_date(v).isoformat() if parse_date(v) else None) for v in raw], dtype=pl.Utf8))
        elif to == "bool":
            truthy = {"1", "true", "yes", "y", "t"}
            falsy = {"0", "false", "no", "n", "f"}
            df = df.with_columns(pl.Series(c, [None if v is None else (True if v.strip().lower() in truthy else False if v.strip().lower() in falsy else None) for v in raw], dtype=pl.Boolean))
        else:
            raise StepError(f"unsupported cast target {to}")
    return df


def remove_rows(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    where = step.get("params", {}).get("where")
    if not where:
        raise StepError("remove_rows needs params.where")
    mask = condition_mask(df, where)
    return df.filter(~mask)


def flag_outliers(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    k = float(p.get("iqr_k", 3.0))
    action = p.get("action", "flag")
    cols = step.get("columns", [])
    _need(df, cols)
    for c in cols:
        nums = [parse_number(v) for v in str_values(df[c])]
        good = sorted(x for x in nums if x is not None)
        if len(good) < 8:
            continue
        def q(pr: float) -> float:
            i = pr * (len(good) - 1)
            lo = int(i); hi = min(lo + 1, len(good) - 1)
            return good[lo] + (good[hi] - good[lo]) * (i - lo)
        q1, q3 = q(0.25), q(0.75)
        lo, hi = q1 - k * (q3 - q1), q3 + k * (q3 - q1)
        out_mask = [x is not None and (x < lo or x > hi) for x in nums]
        if action == "cap":
            capped = [None if x is None else min(max(x, lo), hi) for x in nums]
            df = df.with_columns(pl.Series(c, capped, dtype=pl.Float64))
        elif action == "null":
            df = df.with_columns(pl.Series(c, [None if m else x for x, m in zip(nums, out_mask)], dtype=pl.Float64))
        else:
            df = df.with_columns(pl.Series(f"{c}_outlier", out_mask, dtype=pl.Boolean))
    return df


def restructure_to_schema(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    p = step.get("params", {})
    mapping: dict[str, str | None] = p.get("target_columns", {})  # target -> source (or None)
    _need(df, [v for v in mapping.values() if v])
    exprs = [ (pl.col(src) if src else pl.lit(None, dtype=pl.Utf8)).alias(tgt) for tgt, src in mapping.items() ]
    out = df.select([ROW_ID] + exprs)
    if not p.get("drop_unmapped", True):
        extra = [c for c in df.columns if c not in mapping.values() and c != ROW_ID and c not in mapping]
        out = out.hstack(df.select(extra))
    return out


def validate_rule(df: pl.DataFrame, step: dict) -> pl.DataFrame:
    """Validation only: records violations in the step result, never mutates data."""
    return df


REGISTRY: dict[str, Callable[[pl.DataFrame, dict], pl.DataFrame]] = {
    "drop_duplicates": drop_duplicates, "fuzzy_dedupe": fuzzy_dedupe, "fill_missing": fill_missing,
    "standardize_dates": standardize_dates, "normalize_values": normalize_values, "normalize_phone": normalize_phone,
    "rename_columns": rename_columns, "split_column": split_column, "merge_columns": merge_columns,
    "cast_type": cast_type, "remove_rows": remove_rows, "flag_outliers": flag_outliers,
    "restructure_to_schema": restructure_to_schema, "validate_rule": validate_rule,
}


def count_changes(before: pl.DataFrame, after: pl.DataFrame) -> dict[str, int]:
    ids = set(after[ROW_ID].to_list())
    removed = before.height - len(ids & set(before[ROW_ID].to_list()))
    b = before.filter(pl.col(ROW_ID).is_in(list(ids))).sort(ROW_ID)
    a = after.filter(pl.col(ROW_ID).is_in(b[ROW_ID].to_list())).sort(ROW_ID)
    common = [c for c in b.columns if c in a.columns and c != ROW_ID]
    changed_rows = [False] * b.height
    cells = 0
    for c in common:
        bs, as_ = str_values(b[c]), str_values(a[c])
        for i, (x, y) in enumerate(zip(bs, as_)):
            if (x is None) != (y is None) or (x is not None and x != y and not _num_equal(x, y)):
                cells += 1
                changed_rows[i] = True
    return {"rows_removed": removed, "rows_changed": sum(changed_rows), "cells_changed": cells}


def _num_equal(x: str, y: str) -> bool:
    try:
        return float(x) == float(y)
    except ValueError:
        return False


def apply_step(df: pl.DataFrame, step: dict) -> tuple[pl.DataFrame, dict[str, Any]]:
    typ = step.get("type")
    if typ not in REGISTRY:
        raise StepError(f"unknown step type: {typ}")
    out = REGISTRY[typ](df, step)
    if ROW_ID not in out.columns:
        raise StepError("step dropped the row id column")
    info: dict[str, Any] = {"rows_before": df.height, "rows_after": out.height, **count_changes(df, out)}
    info["affected_rows"] = info["rows_removed"] + info["rows_changed"]
    if typ == "rename_columns":
        info["affected_rows"] = 0
    if typ == "validate_rule":
        rule = step.get("params", {}).get("rule")
        if rule:
            from .rules import evaluate_rule
            bad = evaluate_rule(df, rule)
            info["violations"] = len(bad)
            info["violation_row_ids"] = bad[:200]
            info["affected_rows"] = len(bad)
    return out, info


def apply_steps(df: pl.DataFrame, steps: list[dict]) -> tuple[pl.DataFrame, list[dict[str, Any]]]:
    infos = []
    for st in steps:
        df, info = apply_step(df, st)
        infos.append({"step_id": st.get("id"), "type": st.get("type"), **info})
    return df, infos
