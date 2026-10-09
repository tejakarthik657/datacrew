"""Analyst: question -> SQL. A configured LLM may propose SQL (always guarded); the rule-based fallback works offline."""
from __future__ import annotations

import re
from typing import Any

import polars as pl

from .common import ROW_ID, data_columns, snake
from .profile import profile_dataframe
from .sqlguard import SQLGuardError, run_sql

AGG_WORDS = {"average": "AVG", "avg": "AVG", "mean": "AVG", "total": "SUM", "sum": "SUM", "max": "MAX", "highest": "MAX",
             "maximum": "MAX", "min": "MIN", "lowest": "MIN", "minimum": "MIN"}
STOP = {"the", "a", "an", "of", "by", "per", "in", "for", "with", "is", "are", "what", "which", "show", "me", "how", "many", "much",
        "has", "have", "most", "least", "each", "every", "customers", "rows", "records", "number", "count", "and", "to", "top"}


def _match_col(words: list[str], cols: list[str], types: dict[str, str], want: set[str] | None = None) -> str | None:
    best, score = None, 0
    for c in cols:
        if want and types.get(c) not in want:
            continue
        toks = set(snake(c).split("_"))
        s = sum(1 for w in words if w in toks or (len(w) > 3 and w in snake(c)))
        if s > score:
            best, score = c, s
    return best


def question_to_sql(question: str, df: pl.DataFrame) -> tuple[str, str]:
    """Return (sql, explanation). Deterministic heuristics; raises ValueError when it cannot understand."""
    prof = profile_dataframe(df)
    cols = data_columns(df)
    types = prof["semantic"]
    q = question.lower()
    words = [w for w in re.findall(r"[a-z0-9_]+", q) if w not in STOP]
    agg = next((AGG_WORDS[w] for w in words if w in AGG_WORDS), None)
    measure = _match_col(words, cols, types, {"numeric"})
    # group-by: text after 'by'/'per'/'each' or 'which <col>'
    gm = re.search(r"(?:by|per|each|which|every)\s+([a-z0-9_ ]+?)(?:\s+(?:has|have|is|are|with|had)|\?|$)", q)
    group = _match_col(re.findall(r"[a-z0-9_]+", gm.group(1)), cols, types, {"category", "name", "id", "date"}) if gm else None
    where = []
    for c in cols:
        if types.get(c) == "category":
            for v, _ in prof["columns"][c]["top_values"]:
                if re.search(rf"\b{re.escape(str(v).lower())}\b", q):
                    where.append(f"\"{c}\" = '{str(v).replace(chr(39), chr(39) * 2)}'")
    for c in cols:  # 'overdue' style words that match status-like values
        if types.get(c) == "category" and not any(w.startswith(f'"{c}"') for w in where):
            for v, _ in prof["columns"][c]["top_values"]:
                if str(v).lower().rstrip("s") in [w.rstrip("s") for w in words] and f"\"{c}\" = '{v}'" not in where:
                    where.append(f"\"{c}\" = '{v}'")
    wsql = (" WHERE " + " AND ".join(dict.fromkeys(where))) if where else ""
    if re.search(r"how many|count|number of", q) or (not agg and group and ("most" in q or "least" in q)):
        if group:
            order = "ASC" if "least" in q else "DESC"
            return (f'SELECT "{group}", COUNT(*) AS n FROM data{wsql} GROUP BY "{group}" ORDER BY n {order}', f"Counts rows per {group}" + (" with filter" if where else ""))
        return (f"SELECT COUNT(*) AS n FROM data{wsql}", "Counts matching rows")
    if agg and measure:
        if group:
            return (f'SELECT "{group}", {agg}("{measure}") AS {agg.lower()}_{snake(measure)} FROM data{wsql} GROUP BY "{group}" ORDER BY 2 DESC', f"{agg} of {measure} per {group}")
        return (f'SELECT {agg}("{measure}") AS {agg.lower()}_{snake(measure)} FROM data{wsql}', f"{agg} of {measure}")
    m = re.search(r"top (\d+)", q)
    if m and measure:
        return (f'SELECT * EXCLUDE ({ROW_ID}) FROM data{wsql} ORDER BY "{measure}" DESC LIMIT {int(m.group(1))}', f"Top {m.group(1)} rows by {measure}")
    if group and measure:
        return (f'SELECT "{group}", SUM("{measure}") AS sum_{snake(measure)} FROM data{wsql} GROUP BY "{group}" ORDER BY 2 DESC', f"Total {measure} per {group}")
    raise ValueError("I could not turn that into a query. Try e.g. 'average amount by city', 'how many rows have status overdue', 'top 5 by amount'.")


def chart_spec(result: dict[str, Any]) -> dict[str, Any] | None:
    cols, rows = result["columns"], result["rows"]
    if len(cols) == 2 and 1 < len(rows) <= 40 and isinstance(rows[0][1], (int, float)):
        return {"type": "bar", "x": cols[0], "y": cols[1], "data": [{"x": str(r[0]), "y": r[1]} for r in rows]}
    return None


def ask(df: pl.DataFrame, question: str, llm: Any = None, masked_rows: list[dict] | None = None) -> dict[str, Any]:
    cols = data_columns(df)
    sql, why, used = None, "", "rules"
    if llm is not None and getattr(llm, "name", "mock") != "mock":
        try:
            cand = llm.text_to_sql(question, {c: str(df[c].dtype) for c in cols}, masked_rows or [])
            if cand:
                run_sql(df.head(5), cand, cols)  # guard + dry run on 5 rows
                sql, why, used = cand, "SQL proposed by the model, validated by the guard", llm.name
        except Exception:
            sql = None
    if sql is None:
        sql, why = question_to_sql(question, df)
    res = run_sql(df, sql, cols)
    return {"answer": _answer_text(question, res), "explanation": why, "planner": used, **res, "chart_spec": chart_spec(res)}


def _answer_text(question: str, res: dict[str, Any]) -> str:
    rows = res["rows"]
    if not rows:
        return "No rows matched."
    if len(rows) == 1 and len(rows[0]) == 1:
        v = rows[0][0]
        return f"{v:,.2f}" if isinstance(v, float) else str(v)
    top = rows[0]
    return f"Top result: {top[0]} ({top[1]:,.2f})" if isinstance(top[-1], float) else f"Top result: {top[0]} ({top[-1]}). {len(rows)} rows returned."
