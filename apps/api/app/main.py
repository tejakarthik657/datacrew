"""DataCrew API (FastAPI). Run: uvicorn app.main:app --reload (from apps/api)."""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import services as svc
from .auth import Ctx, current_ctx, hash_password, make_token, require, verify_password
from .config import settings
from .core.ledger import audit, privacy_summary, verify_ledger
from .core.passport import verify_passport
from .db import AuditLog, CrewRun, Job, Membership, Passport, User, Workspace, get_db, init_db
from .storage import get_storage

app = FastAPI(title="DataCrew API", version="0.6.0")
init_db()
storage = get_storage()


# ---------------------------------------------------------------- error envelope
@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException) -> JSONResponse:
    d = exc.detail if isinstance(exc.detail, dict) else {"code": "ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"code": d.get("code", "ERROR"), "message": d.get("message", ""), "hint": d.get("hint", ""), "request_id": f"r_{uuid.uuid4().hex[:8]}"})


@app.exception_handler(RequestValidationError)
async def val_exc(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"code": "VALIDATION", "message": "Request validation failed", "hint": str(exc.errors()[:3]), "request_id": f"r_{uuid.uuid4().hex[:8]}"})


# ---------------------------------------------------------------- models
class Register(BaseModel):
    email: str = Field(min_length=5)
    password: str = Field(min_length=8)
    workspace_name: str | None = None


class Login(BaseModel):
    email: str
    password: str


class MemberIn(BaseModel):
    email: str
    role: str = "editor"


class ApprovalIn(BaseModel):
    approved: bool


class RuleIn(BaseModel):
    text: str


class ChatIn(BaseModel):
    question: str = Field(min_length=3)


class ForecastIn(BaseModel):
    horizon: int = Field(default=3, ge=1, le=12)
    date_column: str | None = None
    metric: str | None = None


class ActualsIn(BaseModel):
    actuals: list[dict[str, Any]]


class SimIn(BaseModel):
    assumptions: dict[str, dict[str, float]] = {}


class CrewIn(BaseModel):
    dataset_id: str
    question: str | None = None


class ApproveIn(BaseModel):
    approve: bool = True


# ---------------------------------------------------------------- health + auth
@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "version": app.version, "mode": settings.mode, "llm": settings.llm_provider}


@app.post("/auth/register", status_code=201)
def register(body: Register, db: Session = Depends(get_db)) -> dict[str, Any]:
    email = body.email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, detail={"code": "EMAIL_TAKEN", "message": "Email already registered"})
    u = User(email=email, password_hash=hash_password(body.password))
    ws = Workspace(name=body.workspace_name or f"{email}'s workspace")
    db.add_all([u, ws])
    db.commit()
    db.add(Membership(user_id=u.id, workspace_id=ws.id, role="owner"))
    db.commit()
    return {"token": make_token(u.id, ws.id), "user": {"id": u.id, "email": u.email}, "workspace": {"id": ws.id, "name": ws.name}, "role": "owner"}


@app.post("/auth/login")
def login(body: Login, db: Session = Depends(get_db)) -> dict[str, Any]:
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, detail={"code": "BAD_CREDENTIALS", "message": "Wrong email or password"})
    m = db.scalar(select(Membership).where(Membership.user_id == u.id).order_by(Membership.id))
    return {"token": make_token(u.id, m.workspace_id), "user": {"id": u.id, "email": u.email}, "workspace": {"id": m.workspace_id}, "role": m.role}


@app.get("/auth/me")
def me(ctx: Ctx = Depends(current_ctx)) -> dict[str, Any]:
    return {"user_id": ctx.user_id, "email": ctx.email, "workspace_id": ctx.workspace_id, "role": ctx.role}


@app.get("/workspaces/members")
def members(ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.execute(select(User.email, Membership.role).join(Membership, Membership.user_id == User.id).where(Membership.workspace_id == ctx.workspace_id)).all()
    return [{"email": e, "role": r} for e, r in rows]


@app.post("/workspaces/members", status_code=201)
def add_member(body: MemberIn, ctx: Ctx = Depends(require("admin")), db: Session = Depends(get_db)) -> dict[str, Any]:
    if body.role not in ("viewer", "editor", "admin"):
        raise HTTPException(422, detail={"code": "BAD_ROLE", "message": "role must be viewer, editor or admin"})
    u = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not u:
        raise HTTPException(404, detail={"code": "USER_NOT_FOUND", "message": "That user must register first"})
    if db.scalar(select(Membership).where(Membership.user_id == u.id, Membership.workspace_id == ctx.workspace_id)):
        raise HTTPException(409, detail={"code": "ALREADY_MEMBER", "message": "Already a member"})
    db.add(Membership(user_id=u.id, workspace_id=ctx.workspace_id, role=body.role))
    db.commit()
    audit(db, ctx.workspace_id, ctx.user_id, "member.add", u.email, {"role": body.role})
    return {"email": u.email, "role": body.role}


@app.post("/auth/switch")
def switch_workspace(body: dict, ctx: Ctx = Depends(current_ctx), db: Session = Depends(get_db)) -> dict[str, Any]:
    ws = body.get("workspace_id", "")
    if not db.scalar(select(Membership).where(Membership.user_id == ctx.user_id, Membership.workspace_id == ws)):
        raise HTTPException(403, detail={"code": "NO_MEMBERSHIP", "message": "Not a member of that workspace"})
    return {"token": make_token(ctx.user_id, ws)}


# ---------------------------------------------------------------- datasets
@app.post("/datasets", status_code=201)
async def upload(file: UploadFile = File(...), ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    content = await file.read()
    return svc.create_dataset(db, storage, ctx, file.filename or "upload.csv", content)


class UrlIn(BaseModel):
    url: str


class DbIn(BaseModel):
    url: str
    query: str


@app.post("/datasets/from-url", status_code=201)
def from_url(body: UrlIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.create_from_url(db, storage, ctx, body.url)


@app.post("/datasets/from-db", status_code=201)
def from_db(body: DbIn, ctx: Ctx = Depends(require("admin")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.create_from_db(db, storage, ctx, body.url, body.query)


@app.get("/datasets")
def list_datasets(ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> list[dict]:
    from .db import Dataset
    rows = db.scalars(select(Dataset).where(Dataset.workspace_id == ctx.workspace_id).order_by(Dataset.created_at.desc())).all()
    out = []
    for d in rows:
        v = svc.get_version(db, d)
        out.append({"id": d.id, "name": d.name, "current_version": d.current_version, "score": v.score, "rows": v.rows, "created_at": d.created_at.isoformat()})
    return out


@app.get("/datasets/{ds_id}")
def get_dataset(ds_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.dataset_overview(db, storage, svc.get_ds(db, ctx.workspace_id, ds_id))


@app.get("/datasets/{ds_id}/rows")
def rows(ds_id: str, offset: int = 0, limit: int = 50, version: int | None = None, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    ds = svc.get_ds(db, ctx.workspace_id, ds_id)
    df = svc.load_df(storage, svc.get_version(db, ds, version))
    limit = max(1, min(limit, 500))
    page = df.slice(max(0, offset), limit)
    return {"total": df.height, "columns": list(df.columns), "rows": page.to_dicts()}


@app.get("/datasets/{ds_id}/versions")
def versions(ds_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    ds = svc.get_ds(db, ctx.workspace_id, ds_id)
    return {"current_version": ds.current_version, "versions": svc.list_versions(db, ds)}


@app.post("/datasets/{ds_id}/versions/{n}/restore")
def restore(ds_id: str, n: int, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.restore_version(db, ctx, svc.get_ds(db, ctx.workspace_id, ds_id), n)


@app.post("/datasets/{ds_id}/undo")
def undo(ds_id: str, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    ds = svc.get_ds(db, ctx.workspace_id, ds_id)
    if ds.current_version <= 0:
        raise HTTPException(409, detail={"code": "NOTHING_TO_UNDO", "message": "Already at the original version"})
    return svc.restore_version(db, ctx, ds, ds.current_version - 1)


@app.get("/datasets/{ds_id}/diff")
def diff(ds_id: str, step: str | None = None, frm: int | None = None, to: int | None = None, offset: int = 0, limit: int = 50,
         ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    ds = svc.get_ds(db, ctx.workspace_id, ds_id)
    if step:
        vs = [v for v in svc.list_versions(db, ds) if v["step_id"] == step]
        if not vs:
            raise HTTPException(404, detail={"code": "STEP_NOT_APPLIED", "message": "No version was produced by that step"})
        v = vs[-1]
        frm, to = v["number"] - 1, v["number"]
    frm = 0 if frm is None else frm
    to = ds.current_version if to is None else to
    return {"from": frm, "to": to, **svc.diff_versions(db, storage, ds, frm, to, offset, max(1, min(limit, 500)))}


@app.get("/datasets/{ds_id}/export")
def export(ds_id: str, fmt: str = "csv", version: int | None = None, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> Response:
    data, mime, name = svc.export_dataset(db, storage, ctx, svc.get_ds(db, ctx.workspace_id, ds_id), fmt, version)
    return Response(content=data, media_type=mime, headers={"Content-Disposition": f'attachment; filename="{name}"'})


@app.post("/datasets/{ds_id}/rules", status_code=201)
def add_rule(ds_id: str, body: RuleIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.add_rule(db, ctx, storage, svc.get_ds(db, ctx.workspace_id, ds_id), body.text)


@app.get("/datasets/{ds_id}/risks")
def risks(ds_id: str, version: int | None = None, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return {"risks": svc.get_risks(db, storage, svc.get_ds(db, ctx.workspace_id, ds_id), version)}


# ---------------------------------------------------------------- plans + jobs
@app.post("/datasets/{ds_id}/plan", status_code=202)
def create_plan(ds_id: str, bg: BackgroundTasks, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    svc.get_ds(db, ctx.workspace_id, ds_id)
    job = svc.new_job(db, ctx, "plan")
    bg.add_task(svc.run_job, job.id, ctx, storage, "plan", ds_id)
    return {"job_id": job.id}


@app.get("/jobs/{job_id}")
def get_job(job_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    j = db.get(Job, job_id)
    if not j or j.workspace_id != ctx.workspace_id:
        raise HTTPException(404, detail={"code": "JOB_NOT_FOUND", "message": "Job not found"})
    return {"id": j.id, "kind": j.kind, "status": j.status, "progress": j.progress, **json.loads(j.result_json), "error": json.loads(j.error) if j.error else None}


@app.get("/plans/{plan_id}")
def get_plan(plan_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.plan_dict(svc.get_plan(db, ctx.workspace_id, plan_id))


@app.patch("/plans/{plan_id}/steps/{step_id}")
def patch_step(plan_id: str, step_id: str, body: ApprovalIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.plan_dict(svc.set_approval(db, ctx, svc.get_plan(db, ctx.workspace_id, plan_id), step_id, body.approved))


@app.get("/plans/{plan_id}/steps/{step_id}/preview")
def preview(plan_id: str, step_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.preview_step(db, storage, svc.get_plan(db, ctx.workspace_id, plan_id), step_id)


@app.post("/plans/{plan_id}/execute", status_code=202)
def execute(plan_id: str, bg: BackgroundTasks, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    svc.get_plan(db, ctx.workspace_id, plan_id)
    job = svc.new_job(db, ctx, "execute")
    bg.add_task(svc.run_job, job.id, ctx, storage, "execute", plan_id)
    return {"job_id": job.id}


@app.get("/plans/{plan_id}/recipe")
def recipe(plan_id: str, fmt: str = "python", ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> Response:
    p = svc.get_plan(db, ctx.workspace_id, plan_id)
    ds = svc.get_ds(db, ctx.workspace_id, p.dataset_id)
    text, mime = svc.recipe_for(p, ds.name, fmt)
    ext = {"python": "py", "sql": "sql", "json": "json"}[fmt]
    return Response(content=text, media_type=mime, headers={"Content-Disposition": f'attachment; filename="recipe.{ext}"'})


# ---------------------------------------------------------------- analyst / forecast / strategy
@app.post("/datasets/{ds_id}/chat")
def chat(ds_id: str, body: ChatIn, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.chat(db, storage, ctx, svc.get_ds(db, ctx.workspace_id, ds_id), body.question)


@app.post("/datasets/{ds_id}/forecast", status_code=201)
def forecast(ds_id: str, body: ForecastIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.run_forecast(db, storage, ctx, svc.get_ds(db, ctx.workspace_id, ds_id), body.horizon, body.date_column, body.metric)


@app.post("/forecasts/{fid}/score")
def score_forecast(fid: str, body: ActualsIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.score_forecast_record(db, ctx, fid, body.actuals)


@app.get("/datasets/{ds_id}/strategy")
def get_strategy(ds_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.strategy(db, storage, svc.get_ds(db, ctx.workspace_id, ds_id))


@app.post("/datasets/{ds_id}/strategy/simulate")
def simulate(ds_id: str, body: SimIn, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.strategy(db, storage, svc.get_ds(db, ctx.workspace_id, ds_id), body.assumptions)


# ---------------------------------------------------------------- trust + privacy
@app.get("/ledger/verify")
def ledger_verify(ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return verify_ledger(db, ctx.workspace_id)


@app.get("/privacy/dashboard")
def privacy(ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return privacy_summary(db, ctx.workspace_id, settings.mode)


@app.get("/audit")
def audit_log(limit: int = 100, ctx: Ctx = Depends(require("admin")), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(AuditLog).where(AuditLog.workspace_id == ctx.workspace_id).order_by(AuditLog.id.desc()).limit(min(limit, 500))).all()
    return [{"ts": r.ts.isoformat(), "actor": r.actor, "action": r.action, "target": r.target, "detail": json.loads(r.detail_json)} for r in rows]


@app.post("/datasets/{ds_id}/passport", status_code=201)
def issue_passport(ds_id: str, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    return svc.create_passport(db, storage, ctx, svc.get_ds(db, ctx.workspace_id, ds_id))


@app.get("/passports/{public_id}")
def get_passport(public_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    p = db.get(Passport, public_id)  # public by unguessable id (read-only, no raw data inside)
    if not p:
        raise HTTPException(404, detail={"code": "PASSPORT_NOT_FOUND", "message": "Passport not found"})
    return json.loads(p.json_text)


@app.post("/passports/verify")
def verify(doc: dict[str, Any]) -> dict[str, Any]:
    return verify_passport(doc)


# ---------------------------------------------------------------- crew
@app.post("/crew/run", status_code=201)
def crew_run(body: CrewIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    run = svc.crew_start(db, storage, ctx, svc.get_ds(db, ctx.workspace_id, body.dataset_id), body.question)
    return crew_dict(run)


def crew_dict(run: CrewRun) -> dict[str, Any]:
    return {"id": run.id, "dataset_id": run.dataset_id, "status": run.status, "events": json.loads(run.events_json), "state": json.loads(run.state_json)}


@app.post("/crew/runs/{run_id}/approve")
def crew_approve(run_id: str, body: ApproveIn, ctx: Ctx = Depends(require("editor")), db: Session = Depends(get_db)) -> dict[str, Any]:
    run = db.get(CrewRun, run_id)
    if not run or run.workspace_id != ctx.workspace_id:
        raise HTTPException(404, detail={"code": "RUN_NOT_FOUND", "message": "Run not found"})
    return crew_dict(svc.crew_continue(db, storage, ctx, run, body.approve))


@app.get("/crew/runs/{run_id}")
def crew_get(run_id: str, ctx: Ctx = Depends(require("viewer")), db: Session = Depends(get_db)) -> dict[str, Any]:
    run = db.get(CrewRun, run_id)
    if not run or run.workspace_id != ctx.workspace_id:
        raise HTTPException(404, detail={"code": "RUN_NOT_FOUND", "message": "Run not found"})
    return crew_dict(run)


# ---------------------------------------------------------------- web UI (single-page, no build step)
WEB = Path(settings.web_dir)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB / "index.html")


@app.get("/demo/dirty_customers.csv")
def demo_file() -> FileResponse:
    p = Path(settings.web_dir).parents[1] / "data" / "demo" / "dirty_customers.csv"
    if not p.exists():
        raise HTTPException(404, detail={"code": "NO_DEMO", "message": "Demo file missing", "hint": "run: make demo-data"})
    return FileResponse(p, media_type="text/csv")


@app.get("/passport/{public_id}")
def passport_page(public_id: str) -> FileResponse:
    return FileResponse(WEB / "passport.html")
