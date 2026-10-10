"""Ingestion (v0.6): public-URL table scraping with a Source Passport, and a read-only SQL database connector.

Safety: http(s) only, private/loopback/link-local addresses blocked (SSRF), robots.txt honoured, size + time limits,
per-host rate limit. The fetcher is injectable so tests never touch the network.
"""
from __future__ import annotations

import hashlib
import ipaddress
import socket
import threading
import time
import urllib.robotparser
from typing import Any, Callable
from urllib.parse import urlparse

import httpx
import polars as pl
import sqlglot
from sqlglot import exp

from .common import ROW_ID
from .pii import EMAIL, PHONE

UA = "DataCrewBot/0.6 (+https://example.invalid/bot)"
MAX_BYTES = 5 * 1024 * 1024
TIMEOUT_S = 10.0
MIN_INTERVAL_S = 1.0
_last_hit: dict[str, float] = {}
_lock = threading.Lock()


class IngestError(ValueError):
    pass


Fetcher = Callable[[str], tuple[int, bytes]]


def check_url(url: str, resolve: bool = True) -> str:
    p = urlparse(url)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise IngestError("Only http(s) URLs are allowed")
    if resolve:
        try:
            infos = socket.getaddrinfo(p.hostname, p.port or (443 if p.scheme == "https" else 80))
        except socket.gaierror as e:
            raise IngestError(f"Could not resolve host: {e}") from e
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                raise IngestError("URL points to a private or internal address, which is blocked")
    return p.hostname


def _default_fetch(url: str) -> tuple[int, bytes]:
    with httpx.stream("GET", url, headers={"User-Agent": UA}, timeout=TIMEOUT_S, follow_redirects=False) as r:
        if 300 <= r.status_code < 400:
            raise IngestError("Redirects are not followed; paste the final URL")
        buf = bytearray()
        for chunk in r.iter_bytes():
            buf += chunk
            if len(buf) > MAX_BYTES:
                raise IngestError("Page is larger than 5 MB")
        return r.status_code, bytes(buf)


def _rate_limit(host: str) -> None:
    with _lock:
        wait = MIN_INTERVAL_S - (time.time() - _last_hit.get(host, 0.0))
        _last_hit[host] = time.time() + max(0.0, wait)
    if wait > 0:
        time.sleep(wait)


def robots_allows(url: str, fetch: Fetcher) -> bool:
    p = urlparse(url)
    rp = urllib.robotparser.RobotFileParser()
    try:
        status, body = fetch(f"{p.scheme}://{p.netloc}/robots.txt")
    except Exception:
        return True
    if status in (401, 403):
        return False
    if status >= 400:
        return True
    rp.parse(body.decode("utf-8", "replace").splitlines())
    return rp.can_fetch(UA, url)


def extract_tables(html: bytes) -> list[pl.DataFrame]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    out: list[pl.DataFrame] = []
    for t in soup.find_all("table"):
        rows = [[c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])] for tr in t.find_all("tr")]
        rows = [r for r in rows if any(r)]
        if len(rows) < 2:
            continue
        width = max(len(r) for r in rows)
        head = [h or f"column_{i + 1}" for i, h in enumerate(rows[0] + [""] * (width - len(rows[0])))]
        seen: dict[str, int] = {}
        cols = []
        for h in head:
            seen[h] = seen.get(h, -1) + 1
            cols.append(h if seen[h] == 0 else f"{h}_{seen[h]}")
        body = [r + [None] * (width - len(r)) for r in rows[1:]]
        out.append(pl.DataFrame({c: [r[i] if r[i] != "" else None for r in body] for i, c in enumerate(cols)}, schema={c: pl.Utf8 for c in cols}))
    return out


def pii_flags(df: pl.DataFrame) -> list[str]:
    flags = []
    for c in df.columns:
        vals = [v for v in df[c].head(500).to_list() if isinstance(v, str)]
        if any(EMAIL.search(v) for v in vals) or sum(1 for v in vals if PHONE.search(v)) > len(vals) * 0.3:
            flags.append(c)
    return flags


def scrape_table(url: str, fetch: Fetcher | None = None, resolve: bool = True) -> tuple[pl.DataFrame, dict[str, Any]]:
    host = check_url(url, resolve)
    fetch = fetch or _default_fetch
    if not robots_allows(url, fetch):
        raise IngestError("robots.txt disallows fetching this page")
    if fetch is _default_fetch:
        _rate_limit(host)
    status, body = fetch(url)
    if status >= 400:
        raise IngestError(f"Server answered HTTP {status}")
    tables = extract_tables(body)
    if not tables:
        raise IngestError("No HTML table with at least 2 rows was found on that page")
    best = max(tables, key=lambda d: d.height * d.width)
    df = best.with_columns(pl.Series(ROW_ID, list(range(1, best.height + 1)), dtype=pl.Int64)).select([ROW_ID, *best.columns])
    passport = {"type": "url", "origin": url, "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "robots_allowed": True,
                "content_sha256": hashlib.sha256(body).hexdigest(), "bytes": len(body), "tables_found": len(tables),
                "pii_columns_flagged": pii_flags(best), "terms_note": "You are responsible for having the right to use this data."}
    return df, passport


# ---------------------------------------------------------------- database connector
ALLOWED_SCHEMES = {"sqlite", "postgresql", "mysql"}
MAX_DB_ROWS = 100_000


def guard_db_query(query: str) -> str:
    try:
        stmts = [s for s in sqlglot.parse(query) if s is not None]
    except sqlglot.errors.ParseError as e:
        raise IngestError(f"Could not parse query: {e}") from e
    if len(stmts) != 1 or not isinstance(stmts[0], exp.Select):
        raise IngestError("Exactly one SELECT statement is allowed")
    for bad in (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create, exp.Alter, exp.Command, exp.Copy):
        if stmts[0].find(bad):
            raise IngestError("Write or DDL statements are not allowed")
    return query.strip().rstrip(";")


def read_database(url: str, query: str, sqlite_root: str | None = None) -> tuple[pl.DataFrame, dict[str, Any]]:
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url
    try:
        u = make_url(url)
    except Exception as e:
        raise IngestError(f"Bad database URL: {e}") from e
    scheme = u.get_backend_name()
    if scheme not in ALLOWED_SCHEMES:
        raise IngestError(f"Only {sorted(ALLOWED_SCHEMES)} databases are supported")
    q = guard_db_query(query)
    if scheme == "sqlite":
        import pathlib
        if not sqlite_root or not u.database:
            raise IngestError("SQLite connections must point to a file inside the connector directory")
        root = pathlib.Path(sqlite_root).resolve()
        path = (root / u.database).resolve() if not pathlib.Path(u.database).is_absolute() else pathlib.Path(u.database).resolve()
        if root not in path.parents or not path.exists():
            raise IngestError("SQLite file must exist inside the connector directory")
        eng = create_engine(f"sqlite:///file:{path}?mode=ro&uri=true")
    else:
        host = u.host or ""
        check_url(f"http://{host}", True) if host else None
        eng = create_engine(u)
    with eng.connect() as conn:
        res = conn.execute(text(q))
        cols = list(res.keys())
        rows = res.fetchmany(MAX_DB_ROWS + 1)
    if len(rows) > MAX_DB_ROWS:
        raise IngestError(f"Result exceeds {MAX_DB_ROWS} rows; add a LIMIT or filter")
    if not rows:
        raise IngestError("Query returned no rows")
    data = {c: [None if r[i] is None else str(r[i]) for r in rows] for i, c in enumerate(cols)}
    df = pl.DataFrame(data, schema={c: pl.Utf8 for c in cols})
    df = df.with_columns(pl.Series(ROW_ID, list(range(1, df.height + 1)), dtype=pl.Int64)).select([ROW_ID, *cols])
    passport = {"type": "database", "origin": f"{scheme}://{u.host or 'file'}/{u.database or ''}", "query_sha256": hashlib.sha256(q.encode()).hexdigest(),
                "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "pii_columns_flagged": pii_flags(df)}
    return df, passport
