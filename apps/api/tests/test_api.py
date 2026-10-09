import io
import json
import time

import polars as pl
import pytest

from app.core.common import ROW_ID


def wait_job(client, headers, job_id):
    for _ in range(100):
        j = client.get(f"/jobs/{job_id}", headers=headers).json()
        if j["status"] in ("done", "failed"):
            return j
        time.sleep(0.05)
    raise AssertionError("job timeout")


@pytest.fixture(scope="module")
def ds(client, alice, demo_bytes):
    r = client.post("/datasets", headers=alice, files={"file": ("dirty_customers.csv", demo_bytes, "text/csv")})
    assert r.status_code == 201, r.text
    return r.json()


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_auth_required(client):
    r = client.get("/datasets")
    assert r.status_code == 401 and r.json()["code"] == "AUTH_REQUIRED" and "request_id" in r.json()


def test_upload_score_and_profile(ds):
    assert 38 <= ds["score"] <= 50 and ds["rows"] > 2000 and "email" in ds["profile"]["semantic"].values()


def test_bad_upload(client, alice):
    r = client.post("/datasets", headers=alice, files={"file": ("x.csv", b"", "text/csv")})
    assert r.status_code == 422 and r.json()["code"] == "UNREADABLE_FILE"
    r = client.post("/datasets", headers=alice, files={"file": ("x.exe", b"abc", "application/octet-stream")})
    assert r.status_code == 422


@pytest.fixture(scope="module")
def plan(client, alice, ds):
    r = client.post(f"/datasets/{ds['id']}/plan", headers=alice)
    assert r.status_code == 202
    j = wait_job(client, alice, r.json()["job_id"])
    assert j["status"] == "done", j
    return client.get(f"/plans/{j['plan_id']}", headers=alice).json()


def test_plan_has_steps_with_estimates(plan):
    assert len(plan["steps"]) >= 10 and plan["source"] == "rule_based"
    assert all(s["approved"] in (True, False) for s in plan["steps"])
    assert any(s["affected_rows_estimate"] > 0 for s in plan["steps"])


def test_preview_step(client, alice, plan):
    sid = next(s["id"] for s in plan["steps"] if s["type"] == "standardize_dates")
    r = client.get(f"/plans/{plan['id']}/steps/{sid}/preview", headers=alice)
    assert r.status_code == 200 and r.json()["diff"]["changed"]


def test_toggle_execute_diff_export_recipe_passport(client, alice, ds, plan):
    pid, dsid = plan["id"], ds["id"]
    off = next(s["id"] for s in plan["steps"] if s["type"] == "flag_outliers")
    assert client.patch(f"/plans/{pid}/steps/{off}", headers=alice, json={"approved": False}).json()["steps"]
    r = client.post(f"/plans/{pid}/execute", headers=alice)
    assert r.status_code == 202
    j = wait_job(client, alice, r.json()["job_id"])
    assert j["status"] == "done", j
    assert j["score_before"] < 50 < 90 < j["score_after"] < 98
    full = client.get(f"/datasets/{dsid}", headers=alice).json()
    assert full["current_version"] == len(full["versions"]) - 1 and full["score"] == j["score_after"]
    # outlier step was skipped
    assert off not in [v["step_id"] for v in full["versions"]]
    # diff
    d = client.get(f"/datasets/{dsid}/diff", headers=alice).json()
    assert d["total_changed"] > 1000 and d["total_removed"] > 100
    sid = next(s["id"] for s in plan["steps"] if s["type"] == "normalize_phone")
    assert client.get(f"/datasets/{dsid}/diff?step={sid}", headers=alice).json()["total_changed"] > 0
    # exports
    csv = client.get(f"/datasets/{dsid}/export?fmt=csv", headers=alice)
    assert csv.status_code == 200 and b"_row_id" not in csv.content.split(b"\n")[0]
    pq = client.get(f"/datasets/{dsid}/export?fmt=parquet", headers=alice)
    assert pl.read_parquet(io.BytesIO(pq.content)).height == j.get("rows", pl.read_parquet(io.BytesIO(pq.content)).height)
    assert client.get(f"/datasets/{dsid}/export?fmt=xlsx", headers=alice).status_code == 200
    assert client.get(f"/datasets/{dsid}/export?fmt=bad", headers=alice).status_code == 422
    # recipes
    for fmt in ("python", "sql", "json"):
        assert client.get(f"/plans/{pid}/recipe?fmt={fmt}", headers=alice).status_code == 200
    # undo / restore
    cur = full["current_version"]
    assert client.post(f"/datasets/{dsid}/undo", headers=alice).json()["current_version"] == cur - 1
    assert client.post(f"/datasets/{dsid}/versions/{cur}/restore", headers=alice).json()["current_version"] == cur
    # passport
    p = client.post(f"/datasets/{dsid}/passport", headers=alice)
    assert p.status_code == 201
    doc = p.json()
    assert doc["score"]["before"] < 50 and doc["score"]["after"] > 90 and doc["privacy"]["bytes_sent_external"] == 0 and doc["privacy"]["mode"] == "local"
    assert client.get(f"/passports/{doc['public_id']}").json()["content_hash"] == doc["content_hash"]
    assert client.post("/passports/verify", json=doc).json()["verified"]
    doc["changes"] = []
    assert not client.post("/passports/verify", json=doc).json()["verified"]


def test_privacy_dashboard_and_ledger(client, alice):
    p = client.get("/privacy/dashboard", headers=alice).json()
    assert p["bytes_sent_external"] == 0 and p["mode"] == "local" and p["ledger"]["ok"]
    assert client.get("/ledger/verify", headers=alice).json()["ok"]


def test_risks_and_rules(client, alice, ds):
    assert client.get(f"/datasets/{ds['id']}/risks?version=0", headers=alice).json()["risks"]
    r = client.post(f"/datasets/{ds['id']}/rules", headers=alice, json={"text": "salary must be between 20000 and 90000"})
    assert r.status_code == 201 and r.json()["violations"] >= 0
    assert client.post(f"/datasets/{ds['id']}/rules", headers=alice, json={"text": "make it nice"}).status_code == 422


def test_chat_guarded_sql(client, alice, ds):
    r = client.post(f"/datasets/{ds['id']}/chat", headers=alice, json={"question": "average amount_inr by city"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["sql"].upper().startswith("SELECT") and j["chart_spec"]["type"] == "bar" and "LIMIT" in j["sql"]
    r = client.post(f"/datasets/{ds['id']}/chat", headers=alice, json={"question": "how many rows have status overdue"})
    assert r.status_code == 200 and j["source_row_keys"] is not None and r.json()["source_row_keys"]
    assert client.post(f"/datasets/{ds['id']}/chat", headers=alice, json={"question": "tell me a joke"}).status_code == 422


def test_forecast_and_accountability(client, alice, ds):
    r = client.post(f"/datasets/{ds['id']}/forecast", headers=alice, json={"horizon": 3})
    assert r.status_code == 201, r.text
    f = r.json()
    assert len(f["points"]) == 3 and all(p["lower"] <= p["yhat"] <= p["upper"] for p in f["points"])
    first = f["points"][0]
    s = client.post(f"/forecasts/{f['forecast_id']}/score", headers=alice, json={"actuals": [{"ts": first["ts"], "actual": first["yhat"] * 1.05}]}).json()
    assert s["n"] == 1 and s["mape"] is not None


def test_strategy_and_simulator(client, alice, ds):
    s = client.get(f"/datasets/{ds['id']}/strategy", headers=alice).json()
    assert s["opportunities"] and s["opportunities"][0]["rank"] == 1 and "CEO brief" in s["ceo_brief_markdown"]
    top = s["opportunities"][0]
    sim = client.post(f"/datasets/{ds['id']}/strategy/simulate", headers=alice, json={"assumptions": {top["id"]: {"recovery_rate": 0.8}}}).json()
    new = next(o for o in sim["opportunities"] if o["id"] == top["id"])
    assert new["value_at_stake_inr_per_month"] > top["value_at_stake_inr_per_month"]


def test_crew_end_to_end_with_gate(client, alice, ds):
    r = client.post("/crew/run", headers=alice, json={"dataset_id": ds["id"], "question": "top 3 by amount_inr"})
    assert r.status_code == 201 and r.json()["status"] == "awaiting_approval"
    run = r.json()
    assert [e["agent"] for e in run["events"]] == ["Supervisor", "Cleaner"]
    done = client.post(f"/crew/runs/{run['id']}/approve", headers=alice, json={"approve": True}).json()
    assert done["status"] == "done"
    assert [e["agent"] for e in done["events"]][-3:] == ["Analyst", "Forecaster", "Strategist"]
    rej = client.post("/crew/run", headers=alice, json={"dataset_id": ds["id"]}).json()
    assert client.post(f"/crew/runs/{rej['id']}/approve", headers=alice, json={"approve": False}).json()["status"] == "cancelled"


def test_tenant_isolation(client, alice, bob, ds):
    dsid = ds["id"]
    for method, path in [("get", f"/datasets/{dsid}"), ("get", f"/datasets/{dsid}/rows"), ("get", f"/datasets/{dsid}/export"), ("get", f"/datasets/{dsid}/versions"),
                         ("get", f"/datasets/{dsid}/diff"), ("get", f"/datasets/{dsid}/risks"), ("get", f"/datasets/{dsid}/strategy"),
                         ("post", f"/datasets/{dsid}/plan"), ("post", f"/datasets/{dsid}/undo"), ("post", f"/datasets/{dsid}/passport"),
                         ("post", f"/datasets/{dsid}/chat"), ("post", f"/datasets/{dsid}/forecast")]:
        r = getattr(client, method)(path, headers=bob, **({"json": {"question": "how many rows"}} if path.endswith("chat") else {"json": {}} if method == "post" and "forecast" in path else {}))
        assert r.status_code == 404, (path, r.status_code, r.text)
    assert client.get("/datasets", headers=bob).json() == []
    pid = client.post(f"/datasets/{dsid}/plan", headers=alice).json()["job_id"]
    plan_id = wait_job(client, alice, pid)["plan_id"]
    assert client.get(f"/plans/{plan_id}", headers=bob).status_code == 404
    assert client.post(f"/plans/{plan_id}/execute", headers=bob).status_code == 404
    assert client.get(f"/jobs/{pid}", headers=bob).status_code == 404
    assert client.post("/crew/run", headers=bob, json={"dataset_id": dsid}).status_code == 404
    assert client.post("/workspaces/members", headers=bob, json={"email": "nobody@example.com"}).status_code == 404
    bob_audit = client.get("/audit", headers=bob).json()
    assert all(a["target"] != dsid for a in bob_audit)


def test_roles(client, alice, bob):
    a_ws = client.get("/auth/me", headers=alice).json()["workspace_id"]
    r = client.post("/auth/register", json={"email": "viewer@example.com", "password": "password123"})
    assert client.post("/workspaces/members", headers=alice, json={"email": "viewer@example.com", "role": "viewer"}).status_code == 201
    tok = client.post("/auth/switch", headers={"Authorization": f"Bearer {r.json()['token']}"}, json={"workspace_id": a_ws}).json()["token"]
    v = {"Authorization": f"Bearer {tok}"}
    assert client.get("/datasets", headers=v).status_code == 200
    up = client.post("/datasets", headers=v, files={"file": ("a.csv", b"a,b\n1,2\n", "text/csv")})
    assert up.status_code == 403 and up.json()["code"] == "FORBIDDEN"
    assert client.get("/audit", headers=v).status_code == 403
    assert client.post("/workspaces/members", headers=bob, json={"email": "viewer@example.com"}).status_code == 201


def test_audit_log_records_actions(client, alice):
    acts = {a["action"] for a in client.get("/audit", headers=alice).json()}
    assert {"dataset.upload", "plan.create", "plan.execute", "plan.step_approval"} <= acts
