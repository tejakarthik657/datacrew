"""Recipe export (Python / SQL / JSON). The Python recipe embeds the engine so it reruns standalone and
produces byte-identical output to the app (needs: polars, rapidfuzz, networkx)."""
from __future__ import annotations

import hashlib
import inspect
import json
from pathlib import Path
from typing import Any

from . import clusters, common, executors, pii, rules

def recipe_json(steps: list[dict], dataset_name: str) -> str:
    return json.dumps({"dataset": dataset_name, "engine": "datacrew-1", "steps": steps}, indent=2, sort_keys=True)


def recipe_hash(steps: list[dict]) -> str:
    return "sha256:" + hashlib.sha256(json.dumps(steps, sort_keys=True).encode()).hexdigest()


def _strip_imports(src: str) -> str:
    out = []
    skip = False
    for line in src.splitlines():
        if line.lstrip().startswith("from .") or line.startswith("from __future__"):
            if line.rstrip().endswith("("):
                skip = True
            continue
        if skip:
            if line.strip().endswith(")"):
                skip = False
            continue
        out.append(line)
    return "\n".join(out)


def recipe_python(steps: list[dict], dataset_name: str) -> str:
    base = Path(common.__file__).parent
    engine = "\n\n".join(_strip_imports((base / f).read_text()) for f in ("common.py", "clusters.py", "pii.py", "rules.py", "executors.py"))
    head = f'''#!/usr/bin/env python3
"""DataCrew recipe for {dataset_name}. Re-run: python recipe.py input.parquet clean.csv
Each approved step is listed below in order; the engine that executes them is embedded after the steps.
Requires: pip install polars rapidfuzz networkx pyarrow
"""
import re, sys, json
import datetime as dt
from collections import Counter
from typing import Any, Callable
import polars as pl
import networkx as nx
from rapidfuzz import fuzz

STEPS = json.loads(r\'\'\'{json.dumps(steps, sort_keys=True)}\'\'\')
'''
    comments = "\n".join(f"#   {s['id']} {s['type']} {s.get('columns', [])}: {s.get('rationale', '')}" for s in steps)
    main = '''

def run(input_path: str, output_path: str) -> None:
    df = pl.read_parquet(input_path) if input_path.endswith(".parquet") else pl.read_csv(input_path, infer_schema_length=0)
    if ROW_ID not in df.columns:
        df = df.with_columns(pl.Series(ROW_ID, list(range(1, df.height + 1)), dtype=pl.Int64)).select([ROW_ID, *[c for c in df.columns if c != ROW_ID]])
    for step in STEPS:
        df, _ = apply_step(df, step)          # one block per approved step, in order
    out = df.drop(ROW_ID)
    out.write_parquet(output_path) if output_path.endswith(".parquet") else out.write_csv(output_path)


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])
'''
    return head + "# Steps:\n" + comments + "\n\n" + engine + main


def recipe_sql(steps: list[dict], table: str = "input") -> str:
    """DuckDB SQL for the steps that SQL can express exactly; others are listed as comments (see REMAINING.md)."""
    lines = [f"-- DataCrew SQL recipe (DuckDB). Partial: steps SQL cannot express exactly are marked NOT EXPRESSIBLE.", f"CREATE OR REPLACE VIEW v0 AS SELECT * FROM {table};"]
    cur = "v0"
    for i, s in enumerate(steps, start=1):
        nxt = f"v{i}"
        t, cols, p = s["type"], s.get("columns", []), s.get("params", {})
        q = lambda c: '"' + c.replace('"', '""') + '"'
        sql = None
        if t == "rename_columns":
            m = p.get("mapping", {})
            sql = f"SELECT * RENAME ({', '.join(f'{q(a)} AS {q(b)}' for a, b in m.items())}) FROM {cur}"
        elif t == "drop_duplicates":
            sql = f"SELECT DISTINCT * EXCLUDE (_row_id) FROM {cur}" if not cols else f"SELECT * FROM {cur} QUALIFY ROW_NUMBER() OVER (PARTITION BY {', '.join(q(c) for c in cols)} ORDER BY _row_id) = 1"
        elif t == "normalize_values" and p.get("mapping") and not p.get("mask") and len(cols) == 1:
            c = cols[0]
            cases = " ".join(f"WHEN {q(c)} = '{k.replace(chr(39), chr(39) * 2)}' THEN '{v.replace(chr(39), chr(39) * 2)}'" for k, v in p["mapping"].items())
            sql = f"SELECT * REPLACE (CASE {cases} ELSE TRIM({q(c)}) END AS {q(c)}) FROM {cur}"
        elif t == "fill_missing" and p.get("strategy") == "constant" and len(cols) == 1:
            sql = f"SELECT * REPLACE (COALESCE({q(cols[0])}, '{p.get('value', 'Unknown')}') AS {q(cols[0])}) FROM {cur}"
        elif t == "fill_missing" and p.get("strategy") == "median" and len(cols) == 1:
            sql = f"SELECT * REPLACE (COALESCE({q(cols[0])}, (SELECT MEDIAN({q(cols[0])}) FROM {cur})) AS {q(cols[0])}) FROM {cur}"
        if sql:
            lines.append(f"-- {s['id']} {t}: {s.get('rationale', '')}")
            lines.append(f"CREATE OR REPLACE VIEW {nxt} AS {sql};")
            cur = nxt
        else:
            lines.append(f"-- {s['id']} {t}: NOT EXPRESSIBLE IN SQL exactly - use the Python recipe for this step")
            lines.append(f"CREATE OR REPLACE VIEW {nxt} AS SELECT * FROM {cur};")
            cur = nxt
    lines.append(f"SELECT * EXCLUDE (_row_id) FROM {cur};")
    return "\n".join(lines)
