"""Shared helpers: null tokens, number/date parsing, string-column helpers. Pure and deterministic."""
from __future__ import annotations

import datetime as dt
import re
from typing import Any, Callable

import polars as pl

ROW_ID = "_row_id"
NULL_TOKENS = {"", "na", "n/a", "nan", "null", "none", "-", "--", "?", "nil", "#n/a"}
DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%b %d, %Y", "%d.%m.%Y", "%Y/%m/%d", "%d %B %Y"]
NUM_RE = re.compile(r"^-?\d+(\.\d+)?$")
EMAIL_RE = re.compile(r"^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)+$")


def is_null_token(v: Any) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and v != v:
        return True
    if isinstance(v, str):
        return v.strip().lower() in NULL_TOKENS
    return False


def data_columns(df: pl.DataFrame) -> list[str]:
    return [c for c in df.columns if c != ROW_ID]


def parse_number(v: Any) -> float | None:
    """Parse '₹ 45,000', 'Rs.45000.50', '45000' -> float. Returns None if not a clean number."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return None if v != v else float(v)
    s = str(v).strip()
    if is_null_token(s):
        return None
    s = re.sub(r"(?i)(₹|rs\.?|inr|\$|usd|eur|€)", "", s).replace(",", "").replace(" ", "")
    return float(s) if NUM_RE.match(s) else None


def is_plain_number(v: Any) -> bool:
    if isinstance(v, (int, float)):
        return True
    return bool(NUM_RE.match(str(v).strip()))


def parse_date_fmt(v: Any) -> tuple[dt.date, str] | None:
    if v is None:
        return None
    if isinstance(v, dt.datetime):
        return v.date(), "%Y-%m-%d"
    if isinstance(v, dt.date):
        return v, "%Y-%m-%d"
    s = str(v).strip()
    if is_null_token(s):
        return None
    for f in DATE_FORMATS:
        try:
            return dt.datetime.strptime(s, f).date(), f
        except ValueError:
            continue
    return None


def parse_date(v: Any) -> dt.date | None:
    r = parse_date_fmt(v)
    return r[0] if r else None


def pattern_class(s: str) -> str:
    return re.sub(r"[A-Za-z]", "A", re.sub(r"\d", "9", s.strip()))


def phone_digits(v: Any) -> str | None:
    """Return canonical 10 digit Indian mobile or None."""
    if v is None:
        return None
    d = re.sub(r"\D", "", str(v))
    if len(d) == 12 and d.startswith("91"):
        d = d[2:]
    elif len(d) == 11 and d.startswith("0"):
        d = d[1:]
    return d if len(d) == 10 and d[0] in "6789" else None


def str_values(s: pl.Series) -> list[str | None]:
    """Series -> python list of str|None; numeric dtypes keep a plain textual form."""
    if s.dtype == pl.Utf8:
        return s.to_list()
    out: list[str | None] = []
    for v in s.to_list():
        if v is None or (isinstance(v, float) and v != v):
            out.append(None)
        elif isinstance(v, float) and v.is_integer():
            out.append(str(int(v)))
        else:
            out.append(str(v))
    return out


def map_unique(s: pl.Series, fn: Callable[[Any], Any], dtype: Any = pl.Utf8) -> pl.Series:
    """Apply fn once per distinct value (fast for categorical-ish columns), keep nulls as nulls."""
    cache: dict[Any, Any] = {}
    out = []
    for v in s.to_list():
        if v is None:
            out.append(None)
            continue
        if v not in cache:
            cache[v] = fn(v)
        out.append(cache[v])
    return pl.Series(s.name, out, dtype=dtype)


def snake(name: str) -> str:
    n = re.sub(r"[^0-9a-zA-Z]+", "_", name.strip().lower()).strip("_")
    return n or "col"
