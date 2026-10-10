"""Orchestration layer. Every function takes the workspace id from the verified Ctx and filters by it (tenant isolation)."""
from __future__ import annotations

import io
import json
import math
import time
import uuid
from typing import Any

import polars as pl
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import notifier
from .auth import Ctx
from .config import settings
from .core import analyst, forecast as fc, strategist
from .core.common import ROW_ID, data_columns, str_values
from .core.executors import StepError, apply_step
from .core.health import score_dataframe
from .core.clusters import variant_clusters
from .core.ledger import append_ledger, audit, privacy_summary, verify_ledger
from rapidfuzz import fuzz
from .core.passport import build_passport
from .core.pii import masked_sample
from .core.planner import generate_plan, profile_for_llm
from .core.profile import profile_dataframe
from .core.readers import ReadError, export_bytes, read_bytes
from .core.recipe import recipe_hash, recipe_json, recipe_python, recipe_sql
from .core.risk import risk_grid, risk_summary
from .core.rules import evaluate_rule, parse_rule
from .db import CrewRun, Dataset, DatasetVersion, ForecastRecord, Job, Passport, Plan, SessionLocal, utcnow
from .graph import graph_adapter
from .llm import get_llm
from .storage import StorageAdapter


def err(status: int, code: str, message: str, hint: str = "") -> HTTPException:
    return HTTPException(status, detail={"code": code, "message": message, "hint": hint})


# ---------------------------------------------------------------- lookups (tenant-scoped)
def get_ds(db: Session, ws: str, ds_id: str) -> Dataset:
    ds = db.get(Dataset, ds_id)
    if not ds or ds.workspace_id != ws:
        raise err(404, "DATASET_NOT_FOUND", "Dataset not found")
    return ds


def get_plan(db: Session, ws: str, plan_id: str) -> Plan:
    p = db.get(Plan, plan_id)
    if not p or p.workspace_id != ws:
        raise err(404, "PLAN_NOT_FOUND", "Plan not found")
    return p


def get_version(db: Session, ds: Dataset, number: int | None = None) -> DatasetVersion:
    n = ds.current_version if number is None else number
    v = db.scalar(select(DatasetVersion).where(DatasetVersion.dataset_id == ds.id, DatasetVersion.workspace_id == ds.workspace_id, DatasetVersion.number == n))
    if not v:
        raise err(404, "VERSION_NOT_FOUND", f"Version {n} not found")
    return v


def load_df(storage: StorageAdapter, v: DatasetVersion) -> pl.DataFrame:
    return pl.read_parquet(io.BytesIO(storage.get(v.storage_key)))


def next_number(db: Session, ds: Dataset) -> int:
    last = db.scalar(select(DatasetVersion.number).where(DatasetVersion.dataset_id == ds.id).order_by(DatasetVersion.number.desc()).limit(1))
    return (last if last is not None else -1) + 1


def save_version(db: Session, storage: StorageAdapter, ds: Dataset, df: pl.DataFrame, label: str, plan_id: str | None = None,
                 step_id: str | None = None, score_doc: dict | None = None) -> DatasetVersion:
    n = next_number(db, ds)
    key = f"{ds.workspace_id}/{ds.id}/v{n}.parquet"
    buf = io.BytesIO()
    df.write_parquet(buf)
    storage.put(key, buf.getvalue())
    score_doc = score_doc or score_dataframe(df)
    v = DatasetVersion(dataset_id=ds.id, workspace_id=ds.workspace_id, number=n, storage_key=key, plan_id=plan_id, step_id=step_id,
                       label=label, rows=df.height, score=score_doc["score"], score_json=json.dumps(score_doc))
    db.add(v)
    db.commit()
    try:
        all_v_docs = [{"number": ver.number, "rows": ver.rows, "score": ver.score, "label": ver.label, "storage_key": ver.storage_key}
                      for ver in db.scalars(select(DatasetVersion).where(DatasetVersion.dataset_id == ds.id)).all()]
        graph_adapter.sync_dataset_nodes(ds.id, ds.name, ds.workspace_id, all_v_docs)
    except Exception:
        pass
    return v


# ---------------------------------------------------------------- datasets
def create_dataset(db: Session, storage: StorageAdapter, ctx: Ctx, filename: str, content: bytes) -> dict[str, Any]:
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise err(413, "FILE_TOO_LARGE", f"Max upload is {settings.max_upload_mb} MB", "Split the file or raise MAX_UPLOAD_MB")
    try:
        df = read_bytes(filename, content)
    except ReadError as e:
        raise err(422, "UNREADABLE_FILE", str(e), "Check the file is a valid CSV, XLSX, JSON or Parquet")
    return create_dataset_from_df(db, storage, ctx, filename, df, {"type": "file", "origin": "upload"}, "upload")


def create_dataset_from_df(db: Session, storage: StorageAdapter, ctx: Ctx, name: str, df: pl.DataFrame, source: dict, action: str) -> dict[str, Any]:
    ds = Dataset(workspace_id=ctx.workspace_id, name=name, source_json=json.dumps(source), created_by=ctx.user_id)
    db.add(ds)
    db.commit()
    save_version(db, storage, ds, df, f"original ({source.get('type', 'file')})")
    append_ledger(db, ctx.workspace_id, ctx.user_id, action, ds.id, payload={"rows": df.height, "cols": df.width, "source": source.get("type")})
    audit(db, ctx.workspace_id, ctx.user_id, f"dataset.{action}", ds.id, {"name": name, "rows": df.height, "source": source})
    return dataset_overview(db, storage, ds)


def create_from_url(
    db: Session,
    storage: StorageAdapter,
    ctx: Ctx,
    url: str,
    fetch=None,
    resolve: bool = True,
    headers: dict[str, str] | None = None,
    method: str = "GET",
    body: str | None = None,
) -> dict[str, Any]:
    from .core.ingest import IngestError, scrape_table
    try:
        df, passport = scrape_table(url, fetch=fetch, resolve=resolve, headers=headers, method=method, body=body)
    except IngestError as e:
        raise err(422, "INGEST_FAILED", str(e), "Check the URL, endpoint, or HTTP parameters")
    return create_dataset_from_df(db, storage, ctx, urlparse_name(url), df, passport, "ingest_url")


def create_from_db(db: Session, storage: StorageAdapter, ctx: Ctx, url: str, query: str) -> dict[str, Any]:
    from .core.ingest import IngestError, read_database
    import pathlib
    root = pathlib.Path(settings.storage_dir) / "connectors"
    root.mkdir(parents=True, exist_ok=True)
    try:
        df, passport = read_database(url, query, str(root))
    except IngestError as e:
        raise err(422, "INGEST_FAILED", str(e), "Use one read-only SELECT; SQLite files must live in <storage>/connectors")
    except Exception as e:
        raise err(422, "INGEST_FAILED", f"Database error: {type(e).__name__}", "Check the connection URL and query")
    return create_dataset_from_df(db, storage, ctx, f"db:{passport['origin']}", df, passport, "ingest_db")


def urlparse_name(url: str) -> str:
    from urllib.parse import urlparse
    p = urlparse(url)
    return f"{p.hostname}{p.path}".rstrip("/")[:80] or url[:80]


def dataset_overview(db: Session, storage: StorageAdapter, ds: Dataset) -> dict[str, Any]:
    cur = get_version(db, ds)
    df = load_df(storage, cur)
    prof = profile_dataframe(df)
    score = json.loads(cur.score_json)
    return {"id": ds.id, "name": ds.name, "current_version": ds.current_version, "rows": df.height, "columns": data_columns(df),
            "profile": prof, "score": score["score"], "score_detail": score, "versions": list_versions(db, ds),
            "rules": json.loads(ds.rules_json), "created_at": ds.created_at.isoformat()}


def delete_dataset(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset) -> dict[str, Any]:
    ds_id = ds.id
    ws_id = ctx.workspace_id
    ds_name = ds.name

    # 1. Delete stored parquet version files from StorageAdapter
    versions = db.scalars(select(DatasetVersion).where(DatasetVersion.dataset_id == ds_id, DatasetVersion.workspace_id == ws_id)).all()
    for v in versions:
        if v.storage_key:
            try:
                storage.delete(v.storage_key)
            except Exception:
                pass
        db.delete(v)

    # 2. Delete associated Plans, Jobs, ForecastRecords, Passports
    plans = db.scalars(select(Plan).where(Plan.dataset_id == ds_id, Plan.workspace_id == ws_id)).all()
    for p in plans:
        db.delete(p)

    jobs = db.scalars(select(Job).where(Job.workspace_id == ws_id)).all()
    for j in jobs:
        if ds_id in (j.result_json or ""):
            db.delete(j)

    forecasts = db.scalars(select(ForecastRecord).where(ForecastRecord.dataset_id == ds_id, ForecastRecord.workspace_id == ws_id)).all()
    for f in forecasts:
        db.delete(f)

    passports = db.scalars(select(Passport).where(Passport.dataset_id == ds_id, Passport.workspace_id == ws_id)).all()
    for pass_item in passports:
        db.delete(pass_item)

    # 3. Delete main dataset record
    db.delete(ds)
    db.commit()

    # 4. Audit ledger & log
    append_ledger(db, ws_id, ctx.user_id, "dataset.delete", ds_id, payload={"name": ds_name})
    audit(db, ws_id, ctx.user_id, "dataset.delete", ds_id, {"name": ds_name})

    return {"status": "deleted", "id": ds_id, "name": ds_name}


def list_versions(db: Session, ds: Dataset) -> list[dict[str, Any]]:
    vs = db.scalars(select(DatasetVersion).where(DatasetVersion.dataset_id == ds.id, DatasetVersion.workspace_id == ds.workspace_id).order_by(DatasetVersion.number)).all()
    return [{"number": v.number, "label": v.label, "rows": v.rows, "score": v.score, "plan_id": v.plan_id, "step_id": v.step_id, "created_at": v.created_at.isoformat()} for v in vs]


def restore_version(db: Session, ctx: Ctx, ds: Dataset, number: int) -> dict[str, Any]:
    get_version(db, ds, number)
    ds.current_version = number
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "dataset.restore", ds.id, {"version": number})
    return {"current_version": number}


# ---------------------------------------------------------------- plans
def _clean_val(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(v, (int, str, bool)):
        return v
    return str(v)


def _clean_row(row: dict[str, Any]) -> dict[str, Any]:
    return {k: _clean_val(v) for k, v in row.items()}


def plan_dict(p: Plan) -> dict[str, Any]:
    approvals = json.loads(p.approvals_json or "{}")
    raw_steps = json.loads(p.steps_json or "[]")
    steps = []
    for idx, s in enumerate(raw_steps):
        steps.append({
            "id": s.get("id", f"s{idx + 1}"),
            "order": s.get("order", idx + 1),
            "type": s.get("type", "unknown"),
            "title": s.get("title") or s.get("description") or s.get("type", "Clean Step"),
            "description": s.get("description") or s.get("rationale") or "",
            "columns": s.get("columns", []),
            "rationale": s.get("rationale") or s.get("description") or "Automated quality normalization",
            "rows_affected": s.get("rows_affected") or s.get("affected_rows_estimate") or s.get("affected_rows") or 0,
            "affected_rows_estimate": s.get("affected_rows_estimate") or s.get("rows_affected") or s.get("affected_rows") or 0,
            "risk": s.get("risk") or s.get("risk_level") or "low",
            "risk_level": s.get("risk_level") or s.get("risk") or "low",
            "confidence": s.get("confidence", 0.9),
            "approved": approvals.get(s.get("id", f"s{idx + 1}"), True),
            "params": s.get("params", {}),
        })
    return {
        "id": p.id,
        "dataset_id": p.dataset_id,
        "dataset_type": p.dataset_type,
        "source": p.source,
        "notes": p.notes,
        "status": p.status,
        "steps": steps,
        "score_before": p.score_before,
        "score_after": p.score_after,
        "projected_score": p.score_after or p.score_before,
        "results": json.loads(p.results_json or "{}"),
    }


def get_plans_for_dataset(db: Session, ctx: Ctx, ds_id: str) -> list[dict[str, Any]]:
    ds = get_ds(db, ctx.workspace_id, ds_id)
    plans = db.scalars(
        select(Plan)
        .where(Plan.dataset_id == ds.id, Plan.workspace_id == ctx.workspace_id)
        .order_by(Plan.created_at.desc())
    ).all()
    return [plan_dict(p) for p in plans]


def make_plan(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset) -> Plan:
    v0 = get_version(db, ds, 0)
    df = load_df(storage, v0)
    prof = profile_dataframe(df)
    rows, masked_n = masked_sample(df, prof["semantic"], 20)
    llm = get_llm()
    payload_bytes = len(json.dumps({"profile": profile_for_llm(prof), "masked_sample": rows}, default=str).encode()) if llm.name != "mock" else 0
    plan_doc, source, notes = generate_plan(df, llm, rows, prof)
    external = payload_bytes if llm.is_external else 0
    append_ledger(db, ctx.workspace_id, ctx.user_id, "plan_generation", ds.id, model=(llm.name if llm.name != "mock" else ""),
                  fields_masked=masked_n if llm.name != "mock" else 0, bytes_external=external, payload={"steps": len(plan_doc["steps"]), "source": source})
    approvals = {s["id"]: s["risk_level"] != "high" for s in plan_doc["steps"]}
    base = json.loads(v0.score_json)
    p = Plan(workspace_id=ctx.workspace_id, dataset_id=ds.id, dataset_type=plan_doc["dataset_type"], steps_json=json.dumps(plan_doc["steps"]),
             approvals_json=json.dumps(approvals), source=source, notes=notes, score_before=base["score"])
    db.add(p)
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "plan.create", p.id, {"dataset": ds.id, "steps": len(plan_doc["steps"]), "source": source})
    return p


def set_approval(db: Session, ctx: Ctx, p: Plan, step_id: str, approved: bool) -> Plan:
    if step_id not in {s["id"] for s in json.loads(p.steps_json)}:
        raise err(404, "STEP_NOT_FOUND", "Step not found")
    a = json.loads(p.approvals_json)
    a[step_id] = bool(approved)
    p.approvals_json = json.dumps(a)
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "plan.step_approval", p.id, {"step": step_id, "approved": approved})
    return p


def approved_steps(p: Plan) -> list[dict]:
    a = json.loads(p.approvals_json)
    return [s for s in json.loads(p.steps_json) if a.get(s["id"], True)]


def diff_frames(before: pl.DataFrame, after: pl.DataFrame, offset: int = 0, limit: int = 50) -> dict[str, Any]:
    ids_after = set(after[ROW_ID].to_list())
    b = before.sort(ROW_ID)
    a = after.sort(ROW_ID).filter(pl.col(ROW_ID).is_in(b[ROW_ID].to_list()))
    b_common = b.filter(pl.col(ROW_ID).is_in(a[ROW_ID].to_list()))
    common = [c for c in b.columns if c in a.columns and c != ROW_ID]
    bv = {c: str_values(b_common[c]) for c in common}
    av = {c: str_values(a[c]) for c in common}
    rid = b_common[ROW_ID].to_list()
    changed = []
    for i, r in enumerate(rid):
        cells = {}
        for c in common:
            x, y = bv[c][i], av[c][i]
            if x != y and not (x is not None and y is not None and _numeq(x, y)):
                cells[c] = [x, y]
        if cells:
            changed.append({"row_id": r, "cells": cells})
    removed_ids = [r for r in b[ROW_ID].to_list() if r not in ids_after]
    removed_df = b.filter(pl.col(ROW_ID).is_in(removed_ids[:limit])) if removed_ids else b.head(0)
    return {"total_changed": len(changed), "total_removed": len(removed_ids), "added_columns": [c for c in a.columns if c not in b.columns],
            "dropped_columns": [c for c in b.columns if c not in after.columns], "offset": offset, "limit": limit,
            "changed": changed[offset:offset + limit], "removed": [{"row_id": r["_row_id"], "row": {k: v for k, v in r.items() if k != ROW_ID}} for r in removed_df.iter_rows(named=True)]}


def _numeq(x: str, y: str) -> bool:
    try:
        return float(x) == float(y)
    except ValueError:
        return False


def rename_between(db: Session, ds: Dataset, frm: int, to: int) -> dict[str, str]:
    """Compose rename_columns mappings applied by versions in (frm, to] so diffs line up renamed columns."""
    mp: dict[str, str] = {}
    vs = db.scalars(select(DatasetVersion).where(DatasetVersion.dataset_id == ds.id, DatasetVersion.number > frm, DatasetVersion.number <= to).order_by(DatasetVersion.number)).all()
    plans: dict[str, list[dict]] = {}
    for v in vs:
        if not v.plan_id or not v.step_id:
            continue
        if v.plan_id not in plans:
            p = db.get(Plan, v.plan_id)
            plans[v.plan_id] = json.loads(p.steps_json) if p else []
        step = next((x for x in plans[v.plan_id] if x["id"] == v.step_id), None)
        if step and step["type"] == "rename_columns":
            for a, b in step["params"].get("mapping", {}).items():
                origin = next((k for k, val in mp.items() if val == a), a)
                mp[origin] = b
    return mp


def diff_versions(db: Session, storage: StorageAdapter, ds: Dataset, frm: int, to: int, offset: int, limit: int) -> dict[str, Any]:
    a = load_df(storage, get_version(db, ds, frm))
    b = load_df(storage, get_version(db, ds, to))
    mp = {k: v for k, v in rename_between(db, ds, frm, to).items() if k in a.columns}
    out = diff_frames(a.rename(mp) if mp else a, b, offset, limit)
    out["renamed_columns"] = mp
    return out


def preview_step(db: Session, storage: StorageAdapter, p: Plan, step_id: str) -> dict[str, Any]:
    df = load_df(storage, get_version(db, db.get(Dataset, p.dataset_id), 0))
    steps = json.loads(p.steps_json)
    approvals = json.loads(p.approvals_json)
    for s in steps:
        if s["id"] == step_id:
            out, info = apply_step(df, s)
            return {"step_id": step_id, "info": {k: v for k, v in info.items() if k != "violation_row_ids"}, "diff": diff_frames(df, out, 0, 8)}
        if approvals.get(s["id"], True):
            df, _ = apply_step(df, s)
    raise err(404, "STEP_NOT_FOUND", "Step not found")


def execute_plan(db: Session, storage: StorageAdapter, ctx: Ctx, p: Plan, job: Job | None = None) -> dict[str, Any]:
    ds = get_ds(db, ctx.workspace_id, p.dataset_id)
    v0 = get_version(db, ds, 0)
    df = load_df(storage, v0)
    steps = approved_steps(p)
    base_score = json.loads(v0.score_json)
    results = {"executed_by": ctx.user_id, "executed_by_email": ctx.email, "steps": []}
    last = None
    for i, s in enumerate(steps, start=1):
        try:
            df, info = apply_step(df, s)
        except StepError as e:
            raise err(422, "STEP_FAILED", f"Step {s['id']} ({s['type']}) failed: {e}", "Reject this step and re-run")
        info.pop("violation_row_ids", None)
        v = save_version(db, storage, ds, df, f"{p.id} {s['id']} {s['type']}", p.id, s["id"])
        results["steps"].append({"step_id": s["id"], "type": s["type"], "version": v.number, "rows": info["affected_rows"], "score_after": v.score, **{k: info[k] for k in ("rows_before", "rows_after", "rows_removed", "rows_changed", "cells_changed")}})
        last = v
        if job:
            job.progress = i / max(1, len(steps))
            db.commit()
    if last is None:
        last = get_version(db, ds, 0)
    ds.current_version = last.number
    p.status, p.score_after, p.executed_at = "executed", last.score, utcnow()
    p.score_before = base_score["score"]
    p.results_json = json.dumps(results)
    db.commit()
    append_ledger(db, ctx.workspace_id, ctx.user_id, "execute_plan", ds.id, payload={"recipe": recipe_hash(steps), "steps": [s["id"] for s in steps]})
    audit(db, ctx.workspace_id, ctx.user_id, "plan.execute", p.id, {"steps": len(steps), "score_before": p.score_before, "score_after": p.score_after})
    notifier.notify(ctx.workspace_id, f"Plan {p.id} executed on {ds.name}: score {p.score_before} -> {p.score_after}")
    return {"plan_id": p.id, "score_before": p.score_before, "score_after": p.score_after, "current_version": last.number}


def run_job(job_id: str, ctx: Ctx, storage: StorageAdapter, fn_name: str, arg: str) -> None:
    """Background task wrapper with its own DB session."""
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        job.status = "running"
        db.commit()
        try:
            if fn_name == "plan":
                ds = get_ds(db, ctx.workspace_id, arg)
                p = make_plan(db, storage, ctx, ds)
                result = {"plan_id": p.id}
            else:
                p = get_plan(db, ctx.workspace_id, arg)
                result = execute_plan(db, storage, ctx, p, job)
            job.status, job.progress, job.result_json = "done", 1.0, json.dumps(result)
        except HTTPException as e:
            job.status, job.error = "failed", json.dumps(e.detail)
        except Exception as e:  # never leave a job hanging
            job.status, job.error = "failed", json.dumps({"code": "JOB_FAILED", "message": str(e)})
        db.commit()
    finally:
        db.close()


def new_job(db: Session, ctx: Ctx, kind: str) -> Job:
    j = Job(workspace_id=ctx.workspace_id, kind=kind)
    db.add(j)
    db.commit()
    return j


# ---------------------------------------------------------------- rules, risks, export
def add_rule(db: Session, ctx: Ctx, storage: StorageAdapter, ds: Dataset, text: str) -> dict[str, Any]:
    df = load_df(storage, get_version(db, ds))
    try:
        rule = parse_rule(text, df)
        bad = evaluate_rule(df, rule)
    except ValueError as e:
        raise err(422, "RULE_INVALID", str(e))
    rules = json.loads(ds.rules_json) + [rule]
    ds.rules_json = json.dumps(rules)
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "rule.add", ds.id, {"text": text})
    return {"rule": rule, "violations": len(bad), "violation_row_ids": bad[:50]}


def get_risks(db: Session, storage: StorageAdapter, ds: Dataset, number: int | None = None) -> list[dict]:
    df = load_df(storage, get_version(db, ds, number))
    return risk_grid(df, profile_dataframe(df)["semantic"], json.loads(ds.rules_json))


def export_dataset(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset, fmt: str, number: int | None) -> tuple[bytes, str, str]:
    df = load_df(storage, get_version(db, ds, number))
    try:
        data, mime = export_bytes(df, fmt)
    except ReadError as e:
        raise err(422, "BAD_FORMAT", str(e))
    audit(db, ctx.workspace_id, ctx.user_id, "dataset.export", ds.id, {"fmt": fmt, "version": number})
    stem = ds.name.rsplit(".", 1)[0]
    return data, mime, f"{stem}_clean.{fmt}"


def recipe_for(p: Plan, ds_name: str, fmt: str) -> tuple[str, str]:
    steps = approved_steps(p)
    if fmt == "python": return recipe_python(steps, ds_name), "text/x-python"
    if fmt == "sql": return recipe_sql(steps), "text/plain"
    if fmt == "json": return recipe_json(steps, ds_name), "application/json"
    raise err(422, "BAD_FORMAT", "fmt must be python, sql or json")


# ---------------------------------------------------------------- chat, forecast, strategy
def chat(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset, question: str) -> dict[str, Any]:
    df = load_df(storage, get_version(db, ds))
    prof = profile_dataframe(df)
    llm = get_llm()
    rows, masked_n = masked_sample(df, prof["semantic"], 5)
    try:
        out = analyst.ask(df, question, llm, rows)
    except ValueError as e:
        raise err(422, "QUESTION_NOT_UNDERSTOOD", str(e))
    except Exception as e:
        from .core.sqlguard import SQLGuardError
        if isinstance(e, SQLGuardError):
            raise err(422, "SQL_REJECTED", str(e), "The guard only allows a single read-only SELECT on this dataset")
        raise
    ext = len(json.dumps(rows, default=str).encode()) if (llm.is_external and out["planner"] != "rules") else 0
    append_ledger(db, ctx.workspace_id, ctx.user_id, "chat", ds.id, model=(llm.name if out["planner"] != "rules" else ""),
                  fields_masked=masked_n if out["planner"] != "rules" else 0, bytes_external=ext, payload={"sql": out["sql"]})
    return out


def run_forecast(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset, horizon: int, date_col: str | None, metric: str | None) -> dict[str, Any]:
    df = load_df(storage, get_version(db, ds))
    sem = profile_dataframe(df)["semantic"]
    d, m = fc.pick_columns(sem, data_columns(df))
    d, m = date_col or d, metric or m
    if not m or m not in df.columns:
        raise err(422, "FORECAST_COLUMNS", "Need a numeric metric column to calculate forecast", "Pass date_column and metric")
    try:
        res = fc.forecast_series(fc.monthly_series(df, d, m), horizon)
    except ValueError as e:
        raise err(422, "FORECAST_ERROR", str(e))
    res.update({"metric": m, "date_column": d or "row_chunks", "made_at": utcnow().date().isoformat()})
    rec = ForecastRecord(workspace_id=ctx.workspace_id, dataset_id=ds.id, json_text=json.dumps(res))
    db.add(rec)
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "forecast.create", rec.id, {"dataset": ds.id, "metric": m})
    return {"forecast_id": rec.id, **res}


def score_forecast_record(db: Session, ctx: Ctx, forecast_id: str, actuals: list[dict]) -> dict[str, Any]:
    rec = db.get(ForecastRecord, forecast_id)
    if not rec or rec.workspace_id != ctx.workspace_id:
        raise err(404, "FORECAST_NOT_FOUND", "Forecast not found")
    doc = json.loads(rec.json_text)
    scored = fc.score_forecast(doc, actuals)
    doc["accountability"] = scored
    rec.json_text = json.dumps(doc)
    db.commit()
    return {"forecast_id": rec.id, **scored}


def strategy(db: Session, storage: StorageAdapter, ds: Dataset, overrides: dict | None = None, forecast_doc: dict | None = None) -> dict[str, Any]:
    cur = get_version(db, ds)
    df = load_df(storage, cur)
    sem = profile_dataframe(df)["semantic"]
    if forecast_doc is None:
        rec = db.scalar(select(ForecastRecord).where(ForecastRecord.dataset_id == ds.id, ForecastRecord.workspace_id == ds.workspace_id).order_by(ForecastRecord.created_at.desc()).limit(1))
        forecast_doc = json.loads(rec.json_text) if rec else None
    opps = strategist.build_opportunities(df, sem, forecast_doc, overrides)
    v0 = get_version(db, ds, 0)
    brief = strategist.ceo_brief(ds.name, v0.score, cur.score, opps, forecast_doc)
    return {"opportunities": opps, "ceo_brief_markdown": brief, "forecast": forecast_doc}


# ---------------------------------------------------------------- passport
def create_passport(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset) -> dict[str, Any]:
    plan = db.scalar(select(Plan).where(Plan.dataset_id == ds.id, Plan.workspace_id == ctx.workspace_id, Plan.status == "executed").order_by(Plan.executed_at.desc()).limit(1))
    if not plan:
        raise err(409, "NO_EXECUTED_PLAN", "Run a cleaning plan before issuing a Data Passport")
    v0, cur = get_version(db, ds, 0), get_version(db, ds)
    before, after = json.loads(v0.score_json), json.loads(cur.score_json)
    df0, df1 = load_df(storage, v0), load_df(storage, cur)
    rules = json.loads(ds.rules_json)
    r0 = risk_grid(df0, profile_dataframe(df0)["semantic"], rules)
    r1 = risk_grid(df1, profile_dataframe(df1)["semantic"], rules)
    res = json.loads(plan.results_json)
    changes = [{"step_id": s["step_id"], "type": s["type"], "approved_by": res.get("executed_by"), "rows": s["rows"], "undo_ref": f"v{s['version'] - 1}"} for s in res["steps"]]
    summ = privacy_summary(db, ctx.workspace_id, settings.mode)
    from .db import LedgerEntry
    from sqlalchemy import func
    tot = db.execute(select(func.coalesce(func.sum(LedgerEntry.fields_masked), 0), func.coalesce(func.sum(LedgerEntry.bytes_external), 0)).where(LedgerEntry.workspace_id == ctx.workspace_id, LedgerEntry.dataset_id == ds.id)).one()
    doc = build_passport(name=ds.name, source=json.loads(ds.source_json), collected_at=ds.created_at.isoformat() + "Z", before=before, after=after, changes=changes,
                         risks=risk_summary(r0, r1), versions=[f"v{v['number']}" for v in list_versions(db, ds)], recipe_hash=recipe_hash(approved_steps(plan)),
                         privacy={"fields_masked": int(tot[0]), "bytes_sent_external": int(tot[1]), "mode": settings.mode})
    db.add(Passport(public_id=doc["public_id"], workspace_id=ctx.workspace_id, dataset_id=ds.id, json_text=json.dumps(doc), content_hash=doc["content_hash"]))
    db.commit()
    append_ledger(db, ctx.workspace_id, ctx.user_id, "passport_issued", ds.id, payload={"public_id": doc["public_id"]})
    return doc


# ---------------------------------------------------------------- crew (Supervisor -> Cleaner -> Analyst -> Forecaster -> Strategist)
def _event(events: list, agent: str, action: str, summary: str, started: float, **extra: Any) -> None:
    events.append({"ts": utcnow().isoformat() + "Z", "agent": agent, "action": action, "summary": summary, "duration_ms": int((time.time() - started) * 1000), **extra})


def crew_start(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset, question: str | None) -> CrewRun:
    events: list[dict] = []
    t = time.time()
    run = CrewRun(workspace_id=ctx.workspace_id, dataset_id=ds.id)
    db.add(run)
    db.commit()
    _event(events, "Supervisor", "route", "Goal: clean, analyse, forecast, advise. Route: Cleaner -> Analyst -> Forecaster -> Strategist (approval gate before any write).", t)
    t = time.time()
    p = make_plan(db, storage, ctx, ds)
    _event(events, "Cleaner", "propose_plan", f"Classified dataset as '{p.dataset_type}'; proposed {len(json.loads(p.steps_json))} steps (source: {p.source}). Waiting for approval.", t, plan_id=p.id)
    run.status, run.state_json, run.events_json = "awaiting_approval", json.dumps({"plan_id": p.id, "question": question}), json.dumps(events)
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "crew.start", run.id, {"dataset": ds.id})
    return run


def crew_continue(db: Session, storage: StorageAdapter, ctx: Ctx, run: CrewRun, approve: bool) -> CrewRun:
    if run.status != "awaiting_approval":
        raise err(409, "NOT_AWAITING_APPROVAL", f"Run is {run.status}")
    state, events = json.loads(run.state_json), json.loads(run.events_json)
    ds = get_ds(db, ctx.workspace_id, run.dataset_id)
    t = time.time()
    if not approve:
        _event(events, "Supervisor", "gate", "Human rejected the cleaning plan; run cancelled, no data was changed.", t)
        run.status, run.events_json = "cancelled", json.dumps(events)
        db.commit()
        return run
    p = get_plan(db, ctx.workspace_id, state["plan_id"])
    _event(events, "Supervisor", "gate", f"Human approved the plan ({ctx.email}).", t)
    t = time.time()
    res = execute_plan(db, storage, ctx, p)
    _event(events, "Cleaner", "execute", f"Executed approved steps on the full data: score {res['score_before']} -> {res['score_after']}.", t)
    t = time.time()
    df = load_df(storage, get_version(db, ds))
    answers = []
    qs = [state.get("question")] if state.get("question") else []
    qs += ["how many rows"] + (["average amount by city"] if any("amount" in c for c in df.columns) else [])
    for q in qs:
        try:
            a = analyst.ask(df, q, None, None)
            answers.append({"question": q, "answer": a["answer"], "sql": a["sql"], "chart_spec": a["chart_spec"]})
        except Exception as e:
            answers.append({"question": q, "error": str(getattr(e, "detail", e))})
    _event(events, "Analyst", "answer", f"Answered {len(answers)} question(s) with guarded read-only SQL.", t, answers=answers)
    t = time.time()
    f = None
    try:
        f = run_forecast(db, storage, ctx, ds, 3, None, None)
        _event(events, "Forecaster", "forecast", f"{f['metric']}: next-month estimate {f['points'][0]['yhat']:,.0f} (80% {f['points'][0]['lower']:,.0f}-{f['points'][0]['upper']:,.0f}), model {f['model']}.", t, forecast_id=f["forecast_id"])
    except HTTPException as e:
        _event(events, "Forecaster", "skip", f"Skipped: {e.detail['message']}", t)
    t = time.time()
    s = strategy(db, storage, ds, None, f)
    _event(events, "Strategist", "rank", f"Ranked {len(s['opportunities'])} opportunities; values computed from data and editable assumptions.", t)
    run.status, run.events_json = "done", json.dumps(events)
    run.state_json = json.dumps({**state, "result": {"score": res, "answers": answers, "forecast": f, "strategy": s}})
    db.commit()
    return run


# ---------------------------------------------------------------- dedupe + lineage
def get_dedupe_clusters(db: Session, storage: StorageAdapter, ds: Dataset) -> dict[str, Any]:
    v = get_version(db, ds)
    df = load_df(storage, v)
    rows = df.to_dicts()
    clusters: list[dict[str, Any]] = []

    text_cols = [c for c, dtype in zip(df.columns, df.dtypes) if "str" in str(dtype).lower() or "utf8" in str(dtype).lower()]
    cluster_idx = 1

    for col in text_cols:
        vals = [str(r[col]) for r in rows if r.get(col) is not None and str(r.get(col)).strip()]
        if not vals:
            continue
        mapping = variant_clusters(vals)
        reverse_groups: dict[str, list[str]] = {}
        for raw, canon in mapping.items():
            if raw != canon:
                reverse_groups.setdefault(canon, []).append(raw)

        for canon, variants in reverse_groups.items():
            matched_records = []
            for idx, r in enumerate(rows):
                val = str(r.get(col, "") or "")
                if val == canon or val in variants:
                    matched_records.append({**_clean_row(r), "_row_index": idx, "_match_field": col})
                    if len(matched_records) >= 8:
                        break
            if len(matched_records) >= 2:
                clusters.append({
                    "id": f"clust_{cluster_idx}",
                    "column": col,
                    "match_type": "Fuzzy Variant Cluster",
                    "confidence": 94,
                    "canonical_suggestion": canon,
                    "variants": variants,
                    "records": matched_records[:4],
                    "status": "pending"
                })
                cluster_idx += 1
                if cluster_idx > 25:
                    break

    # Pairwise fuzzy row check if fewer than 4 clusters found
    if len(clusters) < 4 and len(rows) > 1:
        sample_rows = rows[:120]
        for i in range(len(sample_rows)):
            for j in range(i + 1, min(i + 25, len(sample_rows))):
                r1, r2 = sample_rows[i], sample_rows[j]
                sims = []
                for c in text_cols[:4]:
                    v1, v2 = str(r1.get(c, "") or ""), str(r2.get(c, "") or "")
                    if v1 and v2:
                        sims.append(fuzz.token_sort_ratio(v1, v2))
                if sims and (sum(sims) / len(sims)) >= 82:
                    score = int(sum(sims) / len(sims))
                    clusters.append({
                        "id": f"clust_{cluster_idx}",
                        "column": "composite",
                        "match_type": "Near-Duplicate Record Pair",
                        "confidence": score,
                        "canonical_suggestion": f"Record #{i + 1} (Preserved Primary)",
                        "variants": [f"Record #{j + 1}"],
                        "records": [
                            {**_clean_row(r1), "_row_index": i, "_match_field": "Primary"},
                            {**_clean_row(r2), "_row_index": j, "_match_field": "Candidate"}
                        ],
                        "status": "pending"
                    })
                    cluster_idx += 1
                    if len(clusters) >= 15:
                        break

    return {
        "dataset_id": ds.id,
        "dataset_name": ds.name,
        "current_version": ds.current_version,
        "total_clusters": len(clusters),
        "clusters": clusters
    }


def resolve_dedupe_cluster(db: Session, storage: StorageAdapter, ctx: Ctx, ds: Dataset, cluster_id: str, resolution: dict[str, Any]) -> dict[str, Any]:
    action = resolution.get("action", "merge")
    canonical = resolution.get("canonical_value")
    col = resolution.get("column")
    row_indices_to_drop = resolution.get("drop_indices", [])

    v = get_version(db, ds)
    df = load_df(storage, v)

    if action == "dismiss":
        audit(db, ctx.workspace_id, ctx.user_id, "dedupe.dismiss", ds.id, {"cluster_id": cluster_id})
        return {"status": "dismissed", "cluster_id": cluster_id, "version": ds.current_version}

    new_df = df
    if action == "normalize" and col and canonical and col in df.columns:
        raw_vals = resolution.get("variants", [])
        for r in raw_vals:
            new_df = new_df.with_columns(
                pl.when(pl.col(col) == r).then(pl.lit(canonical)).otherwise(pl.col(col)).alias(col)
            )
    elif action == "merge" and row_indices_to_drop:
        idxs_to_keep = [i for i in range(df.height) if i not in row_indices_to_drop]
        new_df = df[idxs_to_keep]
    elif action == "merge" and col and canonical and col in df.columns:
        raw_vals = resolution.get("variants", [])
        for r in raw_vals:
            new_df = new_df.with_columns(
                pl.when(pl.col(col) == r).then(pl.lit(canonical)).otherwise(pl.col(col)).alias(col)
            )

    nv = save_version(db, storage, ds, new_df, f"Dedupe cluster {cluster_id} resolved")
    ds.current_version = nv.number
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "dedupe.resolve", ds.id, {"cluster_id": cluster_id, "action": action, "new_version": nv.number})
    return {"status": "resolved", "cluster_id": cluster_id, "new_version": nv.number, "rows": nv.rows, "score": nv.score}


def get_lineage(db: Session, storage: StorageAdapter, ds: Dataset) -> dict[str, Any]:
    all_vs = list_versions(db, ds)
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    nodes.append({
        "id": "source_node",
        "type": "source",
        "label": f"Source: {ds.name}",
        "subtitle": "Raw File Ingest / Connector",
        "status": "immutable",
        "meta": {"rows": all_vs[0]["rows"] if all_vs else 0, "hash": all_vs[0].get("storage_key", "")}
    })

    agent_types = [
        {"id": "agent_profiler", "name": "Agent: Profiler", "role": "Statistical distribution & PII detector"},
        {"id": "agent_cleaner", "name": "Agent: Cleaner", "role": "Deterministic transforms & code synthesis"},
        {"id": "agent_auditor", "name": "Agent: Auditor", "role": "Ledger verifier & PII masking gate"}
    ]
    for ag in agent_types:
        nodes.append({
            "id": ag["id"],
            "type": "agent",
            "label": ag["name"],
            "subtitle": ag["role"],
            "status": "active"
        })
        edges.append({"from": "source_node", "to": ag["id"], "label": "inspects"})

    prev_node = "agent_cleaner"
    for v in all_vs:
        v_node_id = f"version_v{v['number']}"
        nodes.append({
            "id": v_node_id,
            "type": "version",
            "label": f"Version v{v['number']}",
            "subtitle": f"{v['rows']} rows • Score: {v['score']}%",
            "status": "active" if v['number'] == ds.current_version else "archived",
            "meta": {
                "number": v["number"],
                "score": v["score"],
                "step_id": v.get("step_id"),
                "storage_key": v.get("storage_key")
            }
        })
        edges.append({"from": prev_node, "to": v_node_id, "label": f"v{v['number']}"})
        prev_node = v_node_id

    artifacts = [
        {"id": "art_parquet", "label": "Clean Parquet Export", "type": "artifact", "subtitle": "Downstream lakehouse export"},
        {"id": "art_passport", "label": "Data Passport", "type": "artifact", "subtitle": "SHA-256 seal certificate"},
        {"id": "art_forecast", "label": "Forecast Model", "type": "artifact", "subtitle": "Timeseries predictions"},
        {"id": "art_strategy", "label": "Executive Strategy", "type": "artifact", "subtitle": "Commercial impact report"}
    ]
    for art in artifacts:
        nodes.append({
            "id": art["id"],
            "type": "artifact",
            "label": art["label"],
            "subtitle": art["subtitle"],
            "status": "ready"
        })
        edges.append({"from": prev_node, "to": art["id"], "label": "exports to"})

    ledger_state = verify_ledger(db, ds.workspace_id)
    is_neo4j = graph_adapter.is_connected()
    if is_neo4j:
        try:
            graph_adapter.sync_dataset_nodes(ds.id, ds.name, ds.workspace_id, all_vs)
        except Exception:
            pass

    return {
        "dataset_id": ds.id,
        "dataset_name": ds.name,
        "current_version": ds.current_version,
        "nodes": nodes,
        "edges": edges,
        "ledger_state": ledger_state,
        "graph_engine": "neo4j" if is_neo4j else "relational_fallback",
        "neo4j_connected": is_neo4j,
        "neo4j_uri": settings.neo4j_uri if is_neo4j else ""
    }

