"""Ingestion: Universal URL scraping & REST API / data stream ingestion with a Source Passport,
and a read-only SQL database connector.

Safety: http(s) only, private/loopback/link-local addresses blocked (SSRF) across all redirect hops,
robots.txt honoured, size + time limits, per-host rate limit. The fetcher is injectable for testing.
"""
from __future__ import annotations

import hashlib
import io
import ipaddress
import json
import socket
import threading
import time
import urllib.robotparser
from typing import Any, Callable
from urllib.parse import urljoin, urlparse

import httpx
import polars as pl
import sqlglot
from sqlglot import exp

from .common import ROW_ID
from .pii import EMAIL, PHONE

UA = "DataCrewBot/1.0 (+https://datacrew.ai/bot)"
MAX_BYTES = 5 * 1024 * 1024
TIMEOUT_S = 12.0
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


def _default_fetch(
    url: str,
    custom_headers: dict[str, str] | None = None,
    method: str = "GET",
    request_body: bytes | None = None,
) -> tuple[int, bytes]:
    curr_url = url
    headers = {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/csv,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
    }
    if custom_headers:
        headers.update(custom_headers)

    method_to_use = (method or "GET").upper()
    data_to_send = request_body

    for hop in range(6):
        # Enforce SSRF protection on each redirect target
        check_url(curr_url, resolve=True)
        with httpx.stream(
            method_to_use,
            curr_url,
            headers=headers,
            content=data_to_send,
            timeout=TIMEOUT_S,
            follow_redirects=False,
        ) as r:
            if 300 <= r.status_code < 400:
                loc = r.headers.get("location")
                if not loc:
                    raise IngestError(f"HTTP {r.status_code} redirect without Location header")
                curr_url = urljoin(curr_url, loc)
                if r.status_code in (301, 302, 303):
                    method_to_use = "GET"
                    data_to_send = None
                continue
            buf = bytearray()
            for chunk in r.iter_bytes():
                buf += chunk
                if len(buf) > MAX_BYTES:
                    raise IngestError("Page or data stream is larger than 5 MB")
            return r.status_code, bytes(buf)
    raise IngestError("Too many redirects (exceeded 5 hops)")


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


def _flatten_dict(d: dict, prefix: str = "") -> dict[str, Any]:
    """Flattens nested JSON structures with dot-notation keys for tabular representation."""
    items: dict[str, Any] = {}
    for k, v in d.items():
        key_str = f"{prefix}.{k}" if prefix else str(k)
        if isinstance(v, dict):
            items.update(_flatten_dict(v, key_str))
        elif isinstance(v, list) and all(isinstance(x, (str, int, float, bool)) for x in v):
            items[key_str] = ", ".join(str(x) for x in v)
        elif isinstance(v, (dict, list)):
            items[key_str] = json.dumps(v, ensure_ascii=False)
        elif v is None:
            items[key_str] = None
        else:
            items[key_str] = str(v)
    return items


def _json_to_dataframe(data: Any, depth: int = 0) -> pl.DataFrame | None:
    """Recursively converts JSON lists, nested API responses, columnar arrays, or single objects into a tabular DataFrame."""
    if depth > 8:
        return None
    if isinstance(data, list):
        if not data:
            return None
        if all(isinstance(row, dict) for row in data):
            clean_rows = [_flatten_dict(row) for row in data[:10000]]
            if not clean_rows:
                return None
            return pl.DataFrame(clean_rows)
        elif all(isinstance(row, (str, int, float, bool)) for row in data):
            return pl.DataFrame({"value": [str(x) for x in data]})
    elif isinstance(data, dict):
        # 1. Check for standard columnar JSON (e.g., Open-Meteo or scientific time-series where keys are lists)
        list_vals = [v for v in data.values() if isinstance(v, list)]
        if len(list_vals) >= 2 and all(len(v) == len(list_vals[0]) and len(v) >= 2 for v in list_vals):
            try:
                col_data = {str(k): [str(x) if x is not None else None for x in v] for k, v in data.items() if isinstance(v, list)}
                if col_data:
                    return pl.DataFrame(col_data)
            except Exception:
                pass

        # 2. Look for standard API data wrapper fields
        for candidate in ("data", "results", "items", "records", "rows", "elements", "products", "users", "entries", "articles", "posts", "list", "content", "features", "values", "response", "hourly", "daily", "nodes", "pageProps", "props"):
            if candidate in data:
                sub = data[candidate]
                if isinstance(sub, (list, dict)):
                    sub_df = _json_to_dataframe(sub, depth + 1)
                    if sub_df is not None and sub_df.height >= 2:
                        return sub_df

        # 3. Recursive search across all nested structures
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                sub_df = _json_to_dataframe(v, depth + 1)
                if sub_df is not None and sub_df.height >= 2:
                    return sub_df

        # 4. Single flat or nested object (convert to 1-row dataset)
        if depth == 0:
            flat = _flatten_dict(data)
            if len(flat) >= 2:
                return pl.DataFrame([flat])

    return None


def extract_embedded_json(html: bytes) -> pl.DataFrame | None:
    """Scrapes structured JSON-LD, Next.js (__NEXT_DATA__), or Nuxt state islands embedded in HTML pages."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # 1. Next.js hydration payload
        next_script = soup.find("script", id="__NEXT_DATA__")
        if next_script and (next_script.string or next_script.get_text()):
            try:
                parsed = json.loads(next_script.string or next_script.get_text())
                df = _json_to_dataframe(parsed)
                if df is not None and df.height >= 2:
                    return df
            except Exception:
                pass

        # 2. General application/ld+json and application/json scripts
        for tag in soup.find_all("script", type=lambda t: t and ("json" in t.lower())):
            try:
                content = tag.get_text().strip()
                if not content:
                    continue
                parsed = json.loads(content)
                df = _json_to_dataframe(parsed)
                if df is not None and df.height >= 2:
                    return df
            except Exception:
                continue
    except Exception:
        pass
    return None


def extract_semantic_cards(html: bytes) -> pl.DataFrame | None:
    """Extracts repeating semantic items (cards, articles, product listings, search results) when no HTML <table> is present."""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")

        # Look for repeating candidate containers
        containers = soup.find_all("article")
        if len(containers) < 2:
            containers = soup.find_all("li")
        if len(containers) < 2:
            containers = [
                el for el in soup.find_all(["div", "section"])
                if any(term in " ".join(el.get("class", [])).lower() for term in ("card", "item", "product", "post", "listing", "result", "entry", "row"))
            ]

        if len(containers) >= 2:
            items: list[dict[str, str]] = []
            for c in containers[:500]:
                row: dict[str, str] = {}
                # Title
                heading = c.find(["h1", "h2", "h3", "h4", "h5", "h6"]) or c.find(class_=lambda x: x and "title" in x.lower())
                if heading:
                    row["title"] = heading.get_text(" ", strip=True)
                # Link
                link = c.find("a", href=True)
                if link:
                    row["url"] = str(link["href"])
                    if not row.get("title") and link.get_text(strip=True):
                        row["title"] = link.get_text(" ", strip=True)
                # Description
                p = c.find("p") or c.find(class_=lambda x: x and any(t in x.lower() for t in ("desc", "summary", "text")))
                if p:
                    row["description"] = p.get_text(" ", strip=True)
                # Price or badge / meta
                meta = c.find(class_=lambda x: x and any(t in x.lower() for t in ("price", "badge", "date", "tag", "meta"))) or c.find("time")
                if meta:
                    row["meta"] = meta.get_text(" ", strip=True)

                if len(row) >= 2 and (row.get("title") or row.get("description")):
                    items.append(row)

            if len(items) >= 2:
                all_keys = list(dict.fromkeys(k for it in items for k in it.keys()))
                normalized = [{k: it.get(k) for k in all_keys} for it in items]
                return pl.DataFrame(normalized)
    except Exception:
        pass
    return None


def extract_tables(html: bytes) -> list[pl.DataFrame]:
    """Extracts traditional HTML <table> elements from web pages."""
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


def scrape_table(
    url: str,
    fetch: Fetcher | None = None,
    resolve: bool = True,
    headers: dict[str, str] | None = None,
    method: str = "GET",
    body: str | None = None,
) -> tuple[pl.DataFrame, dict[str, Any]]:
    """Universal web & API ingest: extracts from HTML tables, REST API JSON endpoints, streaming CSVs, Next.js hydration, and semantic cards."""
    host = check_url(url, resolve)
    fetch_robot = fetch or _default_fetch
    if not robots_allows(url, fetch_robot):
        raise IngestError("robots.txt disallows fetching this page")
    if fetch is None:
        _rate_limit(host)
        raw_body = body.encode("utf-8") if isinstance(body, str) else None
        status, content_bytes = _default_fetch(url, custom_headers=headers, method=method, request_body=raw_body)
    else:
        # Custom or mock fetcher
        try:
            import inspect
            sig = inspect.signature(fetch)
            if len(sig.parameters) > 1:
                raw_body = body.encode("utf-8") if isinstance(body, str) else None
                status, content_bytes = fetch(url, custom_headers=headers, method=method, request_body=raw_body)
            else:
                status, content_bytes = fetch(url)
        except Exception:
            status, content_bytes = fetch(url)

    if status >= 400:
        raise IngestError(f"Server answered HTTP {status}")

    best_df: pl.DataFrame | None = None
    data_format = "html_table"
    tables_count = 0

    trimmed = content_bytes.strip()

    # 1. Try parsing JSON (REST API endpoints, JSON feeds, or NDJSON)
    if trimmed.startswith(b"{") or trimmed.startswith(b"["):
        try:
            parsed = json.loads(content_bytes.decode("utf-8", errors="replace"))
            df_json = _json_to_dataframe(parsed)
            if df_json is not None and df_json.height >= 1:
                best_df = df_json
                data_format = "rest_api_json"
                tables_count = 1
        except Exception:
            pass

    # 1b. Try parsing Newline-Delimited JSON (NDJSON / JSON Lines)
    if best_df is None and b"\n{" in trimmed[:1000]:
        try:
            lines = [json.loads(line) for line in content_bytes.decode("utf-8", errors="replace").splitlines() if line.strip().startswith("{")]
            if len(lines) >= 2:
                df_ndjson = _json_to_dataframe(lines)
                if df_ndjson is not None:
                    best_df = df_ndjson
                    data_format = "ndjson_stream"
                    tables_count = 1
        except Exception:
            pass

    # 2. Try parsing direct CSV/TSV/delimited data streams
    if best_df is None and (any(url.lower().endswith(ext) for ext in (".csv", ".tsv", ".txt")) or (b"," in trimmed[:500] and b"\n" in trimmed[:500]) or (b"\t" in trimmed[:500] and b"\n" in trimmed[:500])):
        try:
            separator = "\t" if (b"\t" in trimmed[:500] and url.lower().endswith(".tsv")) else ","
            csv_df = pl.read_csv(io.BytesIO(content_bytes), separator=separator, infer_schema_length=500, ignore_errors=True)
            if csv_df.height >= 2 and len(csv_df.columns) >= 2:
                best_df = csv_df.select([pl.col(c).cast(pl.Utf8) for c in csv_df.columns])
                data_format = "csv_stream"
                tables_count = 1
        except Exception:
            pass

    # 3. Try parsing HTML tables
    if best_df is None:
        tables = extract_tables(content_bytes)
        if tables:
            best_df = max(tables, key=lambda d: d.height * d.width)
            data_format = "html_table"
            tables_count = len(tables)

    # 4. Try parsing HTML embedded JSON-LD / Next.js / Nuxt hydration data
    if best_df is None:
        embedded_df = extract_embedded_json(content_bytes)
        if embedded_df is not None and embedded_df.height >= 2:
            best_df = embedded_df
            data_format = "hydration_data_island"
            tables_count = 1

    # 5. Try parsing repeating semantic cards/lists (e-commerce, blogs, directories)
    if best_df is None:
        cards_df = extract_semantic_cards(content_bytes)
        if cards_df is not None and cards_df.height >= 2:
            best_df = cards_df
            data_format = "semantic_cards"
            tables_count = 1

    if best_df is None or best_df.height == 0:
        raise IngestError("No HTML table or structured dataset with at least 2 rows was found on that page")

    df = best_df.with_columns(pl.Series(ROW_ID, list(range(1, best_df.height + 1)), dtype=pl.Int64)).select([ROW_ID, *best_df.columns])
    passport = {
        "type": "url",
        "origin": url,
        "format": data_format,
        "http_method": (method or "GET").upper(),
        "custom_headers_used": bool(headers),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "robots_allowed": True,
        "content_sha256": hashlib.sha256(content_bytes).hexdigest(),
        "bytes": len(content_bytes),
        "tables_found": tables_count,
        "pii_columns_flagged": pii_flags(best_df),
        "terms_note": "You are responsible for having the right to use this data.",
    }
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
