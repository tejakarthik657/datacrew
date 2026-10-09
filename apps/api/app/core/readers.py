"""File readers. Everything is read as text so dirty values survive intact; typing is a plan step."""
from __future__ import annotations

import io
import json
from typing import Any

import polars as pl

from .common import ROW_ID


class ReadError(ValueError):
    pass


def _uniq_headers(headers: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    out = []
    for i, h in enumerate(headers):
        h = (h or f"column_{i + 1}").strip() if isinstance(h, str) else f"column_{i + 1}"
        h = h or f"column_{i + 1}"
        if h in seen:
            seen[h] += 1
            h = f"{h}_{seen[h]}"
        else:
            seen[h] = 0
        out.append(h)
    return out


def _stringify(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    if hasattr(v, "isoformat"):
        return v.isoformat()[:10] if hasattr(v, "date") or True else str(v)
    return str(v)


def read_bytes(filename: str, content: bytes) -> pl.DataFrame:
    name = filename.lower()
    try:
        if name.endswith((".csv", ".tsv", ".txt")):
            sep = "\t" if name.endswith(".tsv") else ","
            df = pl.read_csv(io.BytesIO(content), separator=sep, infer_schema_length=0, truncate_ragged_lines=True,
                             encoding="utf8-lossy")
        elif name.endswith((".xlsx", ".xlsm")):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            ws = wb.worksheets[0]
            rows = list(ws.iter_rows(values_only=True))
            if not rows:
                raise ReadError("empty workbook")
            headers = _uniq_headers([str(h) if h is not None else "" for h in rows[0]])
            body = [[_stringify(v) for v in r] + [None] * (len(headers) - len(r)) for r in rows[1:]]
            df = pl.DataFrame({h: [r[i] for r in body] for i, h in enumerate(headers)}, schema={h: pl.Utf8 for h in headers})
        elif name.endswith(".json"):
            data = json.loads(content.decode("utf-8", errors="replace"))
            if isinstance(data, dict):
                data = next((v for v in data.values() if isinstance(v, list)), [data])
            if not isinstance(data, list) or not data or not isinstance(data[0], dict):
                raise ReadError("JSON must be a list of objects")
            headers = list(dict.fromkeys(k for r in data for k in r))
            df = pl.DataFrame({h: [_stringify(r.get(h)) for r in data] for h in headers}, schema={h: pl.Utf8 for h in headers})
        elif name.endswith(".parquet"):
            df = pl.read_parquet(io.BytesIO(content))
            if ROW_ID in df.columns:
                df = df.drop(ROW_ID)
        else:
            raise ReadError("Unsupported file type. Use CSV, XLSX, JSON or Parquet.")
    except ReadError:
        raise
    except Exception as e:  # corrupt file etc.
        raise ReadError(f"Could not read file: {e}") from e
    df.columns = _uniq_headers(df.columns)
    if df.width == 0 or df.height == 0:
        raise ReadError("File has no rows or no columns")
    return df.with_columns(pl.Series(ROW_ID, list(range(1, df.height + 1)), dtype=pl.Int64)).select([ROW_ID, *[c for c in df.columns if c != ROW_ID]])


def export_bytes(df: pl.DataFrame, fmt: str) -> tuple[bytes, str]:
    out = df.drop(ROW_ID) if ROW_ID in df.columns else df
    if fmt == "csv":
        safe = out.with_columns([pl.col(c).map_elements(csv_safe, return_dtype=pl.Utf8) for c in out.columns if out[c].dtype == pl.Utf8])
        return safe.write_csv().encode(), "text/csv"
    if fmt == "parquet":
        buf = io.BytesIO(); out.write_parquet(buf); return buf.getvalue(), "application/octet-stream"
    if fmt == "xlsx":
        import openpyxl
        wb = openpyxl.Workbook(); ws = wb.active
        ws.append(out.columns)
        for r in out.iter_rows():
            ws.append([csv_safe(v) if isinstance(v, str) else v for v in r])
        buf = io.BytesIO(); wb.save(buf)
        return buf.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    raise ReadError("format must be csv, xlsx or parquet")


def csv_safe(v: str | None) -> str | None:
    """Neutralise spreadsheet formula injection (=, +, -, @, tab, CR prefixes)."""
    if v is None:
        return None
    if v and v[0] in ("=", "+", "@", "\t", "\r") or (v[:1] == "-" and not _is_number(v)):
        return "'" + v
    return v


def _is_number(v: str) -> bool:
    try:
        float(v)
        return True
    except ValueError:
        return False
