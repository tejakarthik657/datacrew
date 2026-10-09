#!/usr/bin/env python3
"""End-to-end demo in-process (temp DB, no server needed): upload dirty file -> plan -> apply -> diff -> recipe -> passport."""
import os, sys, tempfile, time
from pathlib import Path

tmp = tempfile.mkdtemp(prefix="datacrew_demo_")
os.environ.update(DATABASE_URL=f"sqlite:///{tmp}/d.db", STORAGE_DIR=f"{tmp}/s", MODE="local", LLM_PROVIDER="mock")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "apps" / "api"))
from fastapi.testclient import TestClient
from app.main import app

c = TestClient(app)
tok = c.post("/auth/register", json={"email": "demo@example.com", "password": "demo-password"}).json()["token"]
H = {"Authorization": f"Bearer {tok}"}
csv = (Path(__file__).resolve().parents[1] / "data" / "demo" / "dirty_customers.csv").read_bytes()
ds = c.post("/datasets", headers=H, files={"file": ("dirty_customers.csv", csv, "text/csv")}).json()
print(f"1. uploaded: {ds['rows']} rows, health score {ds['score']}")
plan_id = c.get(f"/jobs/{c.post(f'/datasets/{ds['id']}/plan', headers=H).json()['job_id']}", headers=H).json()["plan_id"]
plan = c.get(f"/plans/{plan_id}", headers=H).json()
print(f"2. plan: {len(plan['steps'])} steps ({plan['source']})")
job = c.get(f"/jobs/{c.post(f'/plans/{plan_id}/execute', headers=H).json()['job_id']}", headers=H).json()
print(f"3. executed: score {job['score_before']} -> {job['score_after']}")
d = c.get(f"/datasets/{ds['id']}/diff?limit=1", headers=H).json()
print(f"4. diff: {d['total_changed']} changed rows, {d['total_removed']} removed")
r = c.get(f"/plans/{plan_id}/recipe?fmt=python", headers=H)
Path(tmp, "recipe.py").write_text(r.text)
print(f"5. recipe: {len(r.text.splitlines())} lines -> {tmp}/recipe.py")
print("6. chat:", c.post(f"/datasets/{ds['id']}/chat", headers=H, json={"question": "how many rows have status overdue"}).json()["answer"])
pp = c.post(f"/datasets/{ds['id']}/passport", headers=H).json()
print("7. passport verified:", c.post("/passports/verify", json=pp).json()["verified"], "| bytes sent externally:", pp["privacy"]["bytes_sent_external"])
