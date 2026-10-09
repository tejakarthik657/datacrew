"""Plain-English validation rules -> restricted rule JSON -> violation row ids."""
from __future__ import annotations

import re
from typing import Any

import polars as pl

from .common import EMAIL_RE, ROW_ID, data_columns, is_null_token, parse_date, parse_number, phone_digits, snake, str_values


def _find_col(df: pl.DataFrame, word: str) -> str | None:
    w = snake(word)
    cols = data_columns(df)
    for c in cols:
        if snake(c) == w:
            return c
    for c in cols:
        if w in snake(c) or snake(c) in w:
            return c
    return None


def parse_rule(text: str, df: pl.DataFrame) -> dict[str, Any]:
    """Heuristic parser (a configured LLM may produce the same JSON; this is the deterministic fallback)."""
    t = text.strip().rstrip(".")
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) be (?:exactly )?(\d+) digits?$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": "digits", "n": int(m.group(2))}
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) be (?:between|from) (-?[\d.]+) (?:and|to) (-?[\d.]+)$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": "between", "min": float(m.group(2)), "max": float(m.group(3))}
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) be (?:at least|>=|greater than or equal to) (-?[\d.]+)$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": "between", "min": float(m.group(2)), "max": 1e18}
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) not be (?:empty|blank|missing|null)$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": "not_empty"}
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) be unique$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": "unique"}
    m = re.match(r"(?i)^(?:the )?(.+?) (?:must|should) be a valid (email|date|phone)(?: number| address)?$", t)
    if m:
        return {"text": text, "column": _find_col(df, m.group(1)), "kind": f"valid_{m.group(2).lower()}"}
    raise ValueError("Could not understand that rule. Try: 'phone must be 10 digits', 'age between 18 and 60', 'email must not be empty', 'id must be unique'.")


def evaluate_rule(df: pl.DataFrame, rule: dict[str, Any]) -> list[int]:
    col = rule.get("column")
    if not col or col not in df.columns:
        raise ValueError(f"rule column not found: {col}")
    vals = str_values(df[col])
    ids = df[ROW_ID].to_list()
    kind = rule["kind"]
    bad: list[int] = []
    seen: dict[str, int] = {}
    for rid, v in zip(ids, vals):
        null = is_null_token(v)
        if kind == "not_empty":
            if null: bad.append(rid)
            continue
        if null:
            continue
        if kind == "digits":
            if len(re.sub(r"\D", "", v)) != rule["n"]: bad.append(rid)
        elif kind == "between":
            x = parse_number(v)
            if x is None or not (rule["min"] <= x <= rule["max"]): bad.append(rid)
        elif kind == "valid_email":
            if not EMAIL_RE.match(v.strip().lower()): bad.append(rid)
        elif kind == "valid_date":
            if parse_date(v) is None: bad.append(rid)
        elif kind == "valid_phone":
            if phone_digits(v) is None: bad.append(rid)
        elif kind == "unique":
            k = v.strip().lower()
            if k in seen: bad.append(rid)
            seen[k] = rid
        else:
            raise ValueError(f"unknown rule kind {kind}")
    return bad
