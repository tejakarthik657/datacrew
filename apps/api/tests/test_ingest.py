import sqlite3
from pathlib import Path

import pytest

from app.core.ingest import IngestError, check_url, extract_tables, guard_db_query, scrape_table

HTML = b"""<html><body><table><tr><th>City</th><th>Contact</th><th>Sales</th></tr>
<tr><td>Hyd</td><td>a@b.com</td><td>10</td></tr><tr><td>Pune</td><td>c@d.com</td><td>20</td></tr></table></body></html>"""


def fake(pages):
    def f(url):
        return pages.get(url, (404, b""))
    return f


def test_extract_and_source_passport():
    df, p = scrape_table("https://example.com/t", fake({"https://example.com/robots.txt": (404, b""), "https://example.com/t": (200, HTML)}), resolve=False)
    assert df.height == 2 and p["type"] == "url" and p["robots_allowed"] and len(p["content_sha256"]) == 64
    assert p["pii_columns_flagged"] == ["Contact"]


def test_robots_disallow_blocks():
    pages = {"https://example.com/robots.txt": (200, b"User-agent: *\nDisallow: /"), "https://example.com/t": (200, HTML)}
    with pytest.raises(IngestError, match="robots"):
        scrape_table("https://example.com/t", fake(pages), resolve=False)


def test_no_table_and_http_error():
    with pytest.raises(IngestError, match="No HTML table"):
        scrape_table("https://example.com/t", fake({"https://example.com/t": (200, b"<p>hi</p>")}), resolve=False)
    with pytest.raises(IngestError, match="HTTP 500"):
        scrape_table("https://example.com/t", fake({"https://example.com/t": (500, b"")}), resolve=False)


@pytest.mark.parametrize("url", ["http://127.0.0.1/x", "http://localhost/x", "http://169.254.169.254/latest", "http://10.0.0.5/x", "ftp://example.com/x", "file:///etc/passwd"])
def test_ssrf_blocked(url):
    with pytest.raises(IngestError):
        check_url(url)


def test_db_query_guard():
    assert guard_db_query("SELECT * FROM t;") == "SELECT * FROM t"
    for bad in ["DROP TABLE t", "SELECT 1; DELETE FROM t", "UPDATE t SET a=1", "INSERT INTO t VALUES (1)"]:
        with pytest.raises(IngestError):
            guard_db_query(bad)


def test_api_from_db_and_roles(client, alice, bob):
    from app.config import settings
    root = Path(settings.storage_dir) / "connectors"
    root.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(root / "shop.db")
    con.execute("create table orders(id integer, city text, amount real)")
    con.executemany("insert into orders values (?,?,?)", [(i, "Hyd" if i % 2 else "Pune", i * 10.5) for i in range(1, 21)])
    con.commit(); con.close()
    r = client.post("/datasets/from-db", headers=alice, json={"url": "sqlite:///shop.db", "query": "select * from orders"})
    assert r.status_code == 201, r.text
    assert r.json()["rows"] == 20
    ds_id = r.json()["id"]
    assert client.post(f"/datasets/{ds_id}/chat", headers=alice, json={"question": "how many rows"}).status_code == 200
    # writes and traversal refused
    assert client.post("/datasets/from-db", headers=alice, json={"url": "sqlite:///shop.db", "query": "delete from orders"}).status_code == 422
    assert client.post("/datasets/from-db", headers=alice, json={"url": "sqlite:////etc/passwd", "query": "select 1"}).status_code == 422
    # still intact (read-only)
    assert sqlite3.connect(root / "shop.db").execute("select count(*) from orders").fetchone()[0] == 20
    # other tenant cannot see it
    assert client.get(f"/datasets/{ds_id}", headers=bob).status_code == 404


def test_api_from_url_blocks_internal(client, alice):
    r = client.post("/datasets/from-url", headers=alice, json={"url": "http://127.0.0.1:8000/health"})
    assert r.status_code == 422 and r.json()["code"] == "INGEST_FAILED"


def test_service_from_url_with_fake_fetch(client, alice):
    from app import services as svc
    from app.auth import Ctx
    from app.db import SessionLocal
    from app.main import storage
    me = client.get("/auth/me", headers=alice).json()
    db = SessionLocal()
    pages = {"https://example.com/robots.txt": (404, b""), "https://example.com/t": (200, HTML)}
    out = svc.create_from_url(db, storage, Ctx(me["user_id"], me["email"], me["workspace_id"], "owner"), "https://example.com/t", fake(pages), resolve=False)
    db.close()
    assert out["rows"] == 2
