"""Text-to-SQL guard: real parser, exactly one SELECT, allowlisted table/columns, injected LIMIT, timeout, no file access."""
from __future__ import annotations

import re
import threading
from typing import Any

import duckdb
import polars as pl
import sqlglot
from sqlglot import exp

from .common import ROW_ID

TABLE = "data"
DEFAULT_LIMIT = 1000
TIMEOUT_S = 5.0
DENY = re.compile(r"(?i)\b(read_\w+|pragma|copy|attach|detach|install|load|export|glob|pg_|duckdb_|sniff_csv|getenv|current_setting)\b")


class SQLGuardError(ValueError):
    pass


def guard_sql(sql: str, columns: list[str]) -> str:
    """Validate and return the safe SQL (with LIMIT injected). Raises SQLGuardError."""
    if DENY.search(sql):
        raise SQLGuardError("statement uses a disallowed keyword or function")
    try:
        stmts = [s for s in sqlglot.parse(sql, read="duckdb") if s is not None]
    except sqlglot.errors.ParseError as e:
        raise SQLGuardError(f"could not parse SQL: {e}") from e
    if len(stmts) != 1:
        raise SQLGuardError("exactly one statement is allowed")
    tree = stmts[0]
    if not isinstance(tree, exp.Select):
        raise SQLGuardError("only SELECT statements are allowed")
    for bad in (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create, exp.Alter, exp.Command, exp.Pragma, exp.Copy):
        if tree.find(bad):
            raise SQLGuardError("statement contains a write/DDL operation")
    for t in tree.find_all(exp.Table):
        if t.name.lower() != TABLE or t.args.get("db") or t.args.get("catalog"):
            raise SQLGuardError(f"table '{t.name}' is not allowed; use '{TABLE}'")
    if any(isinstance(f, exp.Anonymous) and f.name.lower().startswith(("read", "glob")) for f in tree.find_all(exp.Func)):
        raise SQLGuardError("table functions are not allowed")
    allowed = {c.lower() for c in columns} | {ROW_ID}
    aliases = {a.alias.lower() for a in tree.find_all(exp.Alias) if a.alias}
    for col in tree.find_all(exp.Column):
        n = col.name.lower()
        if n not in allowed and n not in aliases and n != "*":
            raise SQLGuardError(f"column '{col.name}' is not in this dataset")
    if not tree.args.get("limit"):
        tree = tree.limit(DEFAULT_LIMIT)
    return tree.sql(dialect="duckdb")


def run_sql(df: pl.DataFrame, sql: str, columns: list[str]) -> dict[str, Any]:
    safe = guard_sql(sql, columns)
    con = duckdb.connect(":memory:")
    try:
        con.register("data", df.to_arrow())
        con.execute("SET enable_external_access=false")
        timer = threading.Timer(TIMEOUT_S, con.interrupt)
        timer.start()
        try:
            cur = con.execute(safe)
            names = [d[0] for d in cur.description]
            rows = cur.fetchall()
        except duckdb.InterruptException as e:
            raise SQLGuardError("query timed out") from e
        except duckdb.Error as e:
            raise SQLGuardError(f"query failed: {e}") from e
        finally:
            timer.cancel()
        source = source_rows(con, safe)
    finally:
        con.close()
    return {"sql": safe, "columns": names, "rows": [list(r) for r in rows], "source_row_keys": source}


def source_rows(con: duckdb.DuckDBPyConnection, safe_sql: str, cap: int = 100) -> list[int]:
    """Row ids of the rows that match the query's WHERE clause (single-table queries)."""
    try:
        tree = sqlglot.parse_one(safe_sql, read="duckdb")
        where = tree.args.get("where")
        q = f"SELECT {ROW_ID} FROM {TABLE}" + (f" {where.sql(dialect='duckdb')}" if where else "") + f" LIMIT {cap}"
        return [r[0] for r in con.execute(q).fetchall()]
    except Exception:
        return []
