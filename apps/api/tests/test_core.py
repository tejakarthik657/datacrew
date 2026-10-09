import io
import json
import subprocess
import sys

import polars as pl
import pytest

from app.core.common import ROW_ID
from app.core.executors import StepError, apply_step, apply_steps, REGISTRY, STEP_TYPES
from app.core.health import recompute_from_inputs, score_dataframe
from app.core.ledger import GENESIS, append_ledger, verify_ledger
from app.core.passport import build_passport, verify_passport
from app.core.pii import mask_text, masked_sample
from app.core.planner import rule_based_plan, validate_plan
from app.core.profile import profile_dataframe
from app.core.readers import csv_safe, read_bytes
from app.core.recipe import recipe_python
from app.core.sqlguard import SQLGuardError, guard_sql, run_sql


@pytest.fixture(scope="module")
def df(demo_bytes):
    return read_bytes("dirty.csv", demo_bytes)


def test_all_step_types_registered():
    assert set(STEP_TYPES) == set(REGISTRY)


def test_health_score_is_deterministic(df):
    a, b = score_dataframe(df), score_dataframe(df)
    assert a == b


def test_demo_before_score_band(df):
    assert 38 <= score_dataframe(df)["score"] <= 50


def test_plan_validates_and_lifts_score(df):
    plan = rule_based_plan(df)
    assert validate_plan(plan) == []
    out, _ = apply_steps(df, plan["steps"])
    after = score_dataframe(out)["score"]
    assert 90 <= after <= 97


def test_plan_schema_rejects_bad_plans():
    bad = {"dataset_type": "x", "steps": [{"id": "s1", "type": "run_shell", "columns": [], "params": {}, "rationale": "", "confidence": 2,
                                           "risk_level": "low", "affected_rows_estimate": 0, "reversible": True}]}
    errs = validate_plan(bad)
    assert errs and any("run_shell" in e or "confidence" in e or "enum" in e.lower() or "valid" in e.lower() for e in errs)


def test_score_recompute_from_inputs(df):
    s = score_dataframe(df)
    assert recompute_from_inputs(s) == s["score"]


def _mini():
    return pl.DataFrame({ROW_ID: [1, 2, 3, 4], "name": ["Ravi Kumar", "ravi kumar ", "Kumar, Ravi", "Sita"], "age": ["20", "abc", "35", None],
                         "d": ["01/02/2024", "2024-02-01", "1 Feb 2024", "x"], "ph": ["+91 98765 43210", "9876543210", "12345", None]})


def test_each_executor_basic():
    d = _mini()
    o, _ = apply_step(d, {"id": "s1", "type": "standardize_dates", "columns": ["d"], "params": {}})
    assert o["d"].to_list()[:3] == ["2024-02-01"] * 3 and o["d"][3] is None
    o, _ = apply_step(d, {"id": "s", "type": "normalize_phone", "columns": ["ph"], "params": {}})
    assert o["ph"].to_list() == ["9876543210", "9876543210", None, None]
    o, _ = apply_step(d, {"id": "s", "type": "normalize_values", "columns": ["name"], "params": {"case": "title", "reorder_comma_names": True}})
    assert o["name"].to_list()[:3] == ["Ravi Kumar"] * 3
    o, _ = apply_step(d, {"id": "s", "type": "cast_type", "columns": ["age"], "params": {"to": "float"}})
    assert o["age"].to_list() == [20.0, None, 35.0, None]
    o, _ = apply_step(d, {"id": "s", "type": "rename_columns", "columns": [], "params": {"mapping": {"ph": "phone"}}})
    assert "phone" in o.columns
    o, _ = apply_step(d, {"id": "s", "type": "split_column", "columns": ["name"], "params": {"into": ["first", "last"]}})
    assert o["first"][0] == "Ravi" and "name" not in o.columns
    o, _ = apply_step(d, {"id": "s", "type": "merge_columns", "columns": ["name", "age"], "params": {"into": "na"}})
    assert o["na"][0] == "Ravi Kumar 20"
    o, _ = apply_step(d, {"id": "s", "type": "remove_rows", "columns": [], "params": {"where": {"column": "name", "op": "contains", "value": "sita"}}})
    assert o.height == 3
    o, _ = apply_step(d, {"id": "s", "type": "fill_missing", "columns": ["age"], "params": {"strategy": "constant", "value": "0"}})
    assert o["age"][3] == "0"
    o, _ = apply_step(d, {"id": "s", "type": "restructure_to_schema", "columns": [], "params": {"target_columns": {"Full Name": "name", "Mobile": "ph"}}})
    assert o.columns == [ROW_ID, "Full Name", "Mobile"]
    o, info = apply_step(d, {"id": "s", "type": "validate_rule", "columns": ["age"], "params": {"rule": {"column": "age", "kind": "between", "min": 18, "max": 30}}})
    assert info["violations"] == 2 and o.equals(d)
    o, _ = apply_step(d, {"id": "s", "type": "drop_duplicates", "columns": ["name"], "params": {}})
    assert o.height == 4


def test_fuzzy_dedupe_merges_reordered_names():
    d = pl.DataFrame({ROW_ID: [1, 2, 3], "name": ["Ravi Kumar", "Kumar, Ravi", "Sita Rao"], "email": ["r@x.com", "r@x.com", "s@x.com"]})
    o, _ = apply_step(d, {"id": "s", "type": "fill_missing", "columns": [], "params": {}})
    o, info = apply_step(d, {"id": "s", "type": "fuzzy_dedupe", "columns": ["name", "email"], "params": {"threshold": 90}})
    assert o.height == 2 and info["rows_removed"] == 1


def test_unknown_step_and_missing_column_raise():
    d = _mini()
    with pytest.raises(StepError):
        apply_step(d, {"id": "s", "type": "drop_database", "columns": [], "params": {}})
    with pytest.raises(StepError):
        apply_step(d, {"id": "s", "type": "normalize_phone", "columns": ["nope"], "params": {}})


def test_remove_rows_grammar_rejects_bad_op():
    with pytest.raises(StepError):
        apply_step(_mini(), {"id": "s", "type": "remove_rows", "columns": [], "params": {"where": {"column": "name", "op": "__import__('os')", "value": "x"}}})


def test_sql_guard():
    cols = ["city", "amount"]
    assert "LIMIT" in guard_sql("SELECT city, SUM(amount) FROM data GROUP BY city", cols)
    for bad in ["DROP TABLE data", "SELECT * FROM data; DELETE FROM data", "SELECT * FROM other", "SELECT secret FROM data",
                "SELECT * FROM read_csv('/etc/passwd')", "INSERT INTO data VALUES (1)", "SELECT * FROM data; SELECT 1", "COPY data TO '/tmp/x'",
                "SELECT * FROM data d JOIN data e ON 1=1 UNION SELECT * FROM pg_catalog.pg_tables"]:
        with pytest.raises(SQLGuardError):
            guard_sql(bad, cols)


def test_sql_runs_readonly_and_returns_source_rows():
    d = pl.DataFrame({ROW_ID: [1, 2, 3], "city": ["a", "b", "a"], "amount": [1.0, 2.0, 3.0]})
    r = run_sql(d, "SELECT city, SUM(amount) AS s FROM data WHERE city = 'a' GROUP BY city", ["city", "amount"])
    assert r["rows"] == [["a", 4.0]] and r["source_row_keys"] == [1, 3]


def test_pii_masking():
    m, n = mask_text("mail ravi@x.com phone 98765 43210 aadhaar 1234 5678 9012 pan ABCDE1234F")
    assert "ravi@x.com" not in m and "9876" not in m and "1234 5678" not in m and "ABCDE1234F" not in m and n == 4
    d = pl.DataFrame({ROW_ID: [1], "email": ["ravi@x.com"], "note": ["call 98765 43210"], "n": [5]})
    rows, k = masked_sample(d, {"email": "email", "note": "text", "n": "numeric"})
    assert rows[0]["email"] == "<EMAIL>" and "98765" not in rows[0]["note"] and k >= 2


def test_csv_injection_safe():
    assert csv_safe("=cmd|' /C calc'!A0").startswith("'") and csv_safe("@SUM(1)").startswith("'")
    assert csv_safe("-5") == "-5" and csv_safe("+91 98") .startswith("'")


def test_ledger_hash_chain_and_tamper(client, alice):
    from app.db import LedgerEntry, SessionLocal
    ws = client.get("/auth/me", headers=alice).json()["workspace_id"]
    db = SessionLocal()
    for i in range(3):
        append_ledger(db, ws, "u", f"act{i}", payload={"i": i})
    assert verify_ledger(db, ws)["ok"]
    e = db.query(LedgerEntry).filter_by(workspace_id=ws, seq=2).one()
    e.bytes_external = 999
    db.commit()
    res = verify_ledger(db, ws)
    assert not res["ok"] and res["broken_at_seq"] == 2
    e.bytes_external = 0
    db.commit()
    assert verify_ledger(db, ws)["ok"]
    db.close()


def test_passport_hash_verify(df):
    b, a = score_dataframe(df), score_dataframe(df)
    doc = build_passport(name="x", source={"type": "file"}, collected_at="t", before=b, after=a, changes=[], risks={"found": 1, "resolved": 1, "open": 0},
                         versions=["v0"], recipe_hash="sha256:1", privacy={"fields_masked": 0, "bytes_sent_external": 0, "mode": "local"})
    assert verify_passport(doc)["verified"]
    doc["score"]["after"] = 99.9
    assert not verify_passport(doc)["verified"]


def test_recipe_python_reruns_to_same_output(df, tmp_path):
    plan = rule_based_plan(df)
    out, _ = apply_steps(df, plan["steps"])
    (tmp_path / "input.parquet").write_bytes(b"")
    df.write_parquet(tmp_path / "input.parquet")
    (tmp_path / "recipe.py").write_text(recipe_python(plan["steps"], "dirty.csv"))
    r = subprocess.run([sys.executable, "recipe.py", "input.parquet", "clean.parquet"], cwd=tmp_path, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    again = pl.read_parquet(tmp_path / "clean.parquet")
    assert again.equals(out.drop(ROW_ID))
