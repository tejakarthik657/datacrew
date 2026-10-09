"""Profiling + semantic type inference. Deterministic (no LLM)."""
from __future__ import annotations

import re
from collections import Counter
from typing import Any

import polars as pl

from .common import (
    EMAIL_RE, ROW_ID, data_columns, is_null_token, parse_date, parse_number, phone_digits, snake, str_values,
)

NAME_HINTS = {
    "email": ("email", "e_mail", "mail"),
    "phone": ("phone", "mobile", "contact", "ph_no", "ph", "cell", "whatsapp"),
    "aadhaar": ("aadhaar", "aadhar", "uid"),
    "pan": ("pan",),
    "date": ("date", "dob", "created", "signup", "joined", "timestamp", "_on", "_at"),
    "name": ("name",),
    "numeric": ("amount", "amt", "salary", "price", "revenue", "total", "qty", "quantity", "age", "income", "cost", "balance"),
}


def _hint(colname: str) -> str | None:
    n = snake(colname)
    parts = set(n.split("_"))
    if n == "id" or n.endswith("_id") or n.startswith("id_") or "id" in parts:
        return "id"
    for typ in ("email", "aadhaar", "pan", "phone", "name", "date", "numeric"):
        for h in NAME_HINTS[typ]:
            if h in parts or (len(h) > 3 and h in n):
                return typ
    return None


def _share(vals: list[str], pred) -> float:
    return sum(1 for v in vals if pred(v)) / len(vals) if vals else 0.0


def infer_semantic(colname: str, s: pl.Series) -> str:
    if s.dtype.is_numeric():
        return "numeric"
    vals = [v for v in str_values(s) if not is_null_token(v)]
    if not vals:
        return "text"
    sample = vals[:2000]
    hint = _hint(colname)
    if any(w in snake(colname).split("_") for w in ("notes", "note", "comment", "comments", "remark", "remarks", "description", "desc")):
        return "text"
    email_sh = _share(sample, lambda v: bool(EMAIL_RE.match(v.strip().lower())))
    aad_sh = _share(sample, lambda v: len(re.sub(r"\D", "", v)) == 12 and re.fullmatch(r"[\d\s-]+", v.strip()) is not None)
    date_sh = _share(sample, lambda v: parse_date(v) is not None)
    num_sh = _share(sample, lambda v: parse_number(v) is not None)
    ph_sh = _share(sample, lambda v: phone_digits(v) is not None)
    if (hint == "email" and email_sh >= 0.3) or email_sh >= 0.6:
        return "email"
    if hint == "aadhaar" or aad_sh >= 0.6:
        return "aadhaar"
    if hint == "pan":
        return "pan"
    if hint == "phone" and ph_sh >= 0.3:
        return "phone"
    if ph_sh >= 0.7 and hint != "numeric":
        return "phone"
    if hint == "date" and date_sh >= 0.4 or date_sh >= 0.7:
        return "date"
    if hint == "id":
        return "id"
    if hint == "numeric" and num_sh >= 0.5 or num_sh >= 0.8:
        return "numeric"
    if hint == "name":
        return "name"
    distinct = len(set(sample))
    if distinct <= max(25, int(0.05 * len(sample))):
        return "category"
    return "text"


def profile_dataframe(df: pl.DataFrame) -> dict[str, Any]:
    cols: dict[str, Any] = {}
    n = df.height
    for c in data_columns(df):
        s = df[c]
        raw = str_values(s)
        nulls = sum(1 for v in raw if is_null_token(v))
        non_null = [v for v in raw if not is_null_token(v)]
        sem = infer_semantic(c, s)
        top = Counter(non_null).most_common(5)
        info: dict[str, Any] = {
            "dtype": str(s.dtype), "semantic": sem, "null_count": nulls,
            "null_rate": round(nulls / n, 4) if n else 0.0,
            "distinct": len(set(non_null)), "top_values": [[k, v] for k, v in top],
            "samples": non_null[:5],
        }
        if sem == "numeric":
            nums = sorted(x for x in (parse_number(v) for v in non_null) if x is not None)
            if nums:
                info["min"], info["max"] = nums[0], nums[-1]
                info["median"] = nums[len(nums) // 2]
        cols[c] = info
    return {"rows": n, "columns": cols, "semantic": {c: v["semantic"] for c, v in cols.items()}}
