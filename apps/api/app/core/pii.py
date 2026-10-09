"""PII detection and masking. Presidio is used if installed, else regex recognisers (email, phone, Aadhaar-like, PAN)."""
from __future__ import annotations

import re
from typing import Any

import polars as pl

from .common import ROW_ID, data_columns, str_values

EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+")
AADHAAR = re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}\b")
PAN = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")

try:  # optional
    import presidio_analyzer  # type: ignore  # noqa: F401

    PRESIDIO = True
except Exception:  # pragma: no cover
    PRESIDIO = False

PII_SEMANTIC = {"email", "phone", "aadhaar", "name", "pan"}


def mask_text(text: str) -> tuple[str, int]:
    """Replace PII inside free text with placeholders; returns (masked, n_replacements)."""
    n = 0
    for rx, tag in ((EMAIL, "<EMAIL>"), (AADHAAR, "<AADHAAR>"), (PAN, "<PAN>"), (PHONE, "<PHONE>")):
        text, k = rx.subn(tag, text)
        n += k
    return text, n


def mask_aadhaar(v: str) -> str:
    d = re.sub(r"\D", "", v)
    if len(d) == 12:
        return f"XXXX XXXX {d[-4:]}"
    return v


def mask_pan(v: str) -> str:
    return re.sub(r"^([A-Z]{2})[A-Z]{3}(\d{4})([A-Z])$", r"\1XXX\2\3", v.strip())


def is_masked(v: str) -> bool:
    return bool(re.match(r"^(X{4} X{4} \d{4}|[A-Z]{2}XXX\d{4}[A-Z])$", v.strip()))


def masked_sample(df: pl.DataFrame, semantic: dict[str, str], n: int = 20) -> tuple[list[dict[str, Any]], int]:
    """First/evenly spaced n rows with every PII cell replaced by a placeholder. Returns (rows, fields_masked)."""
    cols = data_columns(df)
    step = max(1, df.height // n)
    sample = df.select(cols)[::step].head(n)
    fields = 0
    rows: list[dict[str, Any]] = []
    placeholders = {"email": "<EMAIL>", "phone": "<PHONE>", "aadhaar": "<AADHAAR>", "name": "<NAME>", "pan": "<PAN>"}
    for r in sample.iter_rows(named=True):
        out: dict[str, Any] = {}
        for c, v in r.items():
            sem = semantic.get(c, "text")
            if v is None:
                out[c] = None
            elif sem in placeholders:
                out[c] = placeholders[sem]
                fields += 1
            elif isinstance(v, str):
                m, k = mask_text(v)
                out[c] = m
                fields += k
            else:
                out[c] = v
        rows.append(out)
    return rows, fields


def pii_columns(semantic: dict[str, str]) -> list[str]:
    return [c for c, t in semantic.items() if t in PII_SEMANTIC]


def column_masked_share(s: pl.Series) -> float:
    vals = [v for v in str_values(s) if v is not None and v.strip()]
    if not vals:
        return 0.0
    return sum(1 for v in vals if is_masked(v)) / len(vals)
