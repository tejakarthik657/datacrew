"""Local JWT auth (email+password), workspaces and roles. Tenant id always comes from the verified token."""
from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import Membership, User, get_db

ROLE_RANK = {"viewer": 1, "editor": 2, "admin": 3, "owner": 4}


@dataclass
class Ctx:
    user_id: str
    email: str
    workspace_id: str
    role: str


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode()[:72], hashed.encode())
    except ValueError:
        return False


def make_token(user_id: str, workspace_id: str) -> str:
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=settings.jwt_ttl_hours)
    return jwt.encode({"sub": user_id, "ws": workspace_id, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def current_ctx(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> Ctx:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail={"code": "AUTH_REQUIRED", "message": "Missing bearer token"})
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, detail={"code": "AUTH_INVALID", "message": "Invalid or expired token"})
    user = db.get(User, payload["sub"])
    mem = db.scalar(select(Membership).where(Membership.user_id == payload["sub"], Membership.workspace_id == payload["ws"]))
    if not user or not mem:
        raise HTTPException(403, detail={"code": "NO_MEMBERSHIP", "message": "Not a member of this workspace"})
    return Ctx(user.id, user.email, mem.workspace_id, mem.role)


def require(role: str):
    def dep(ctx: Ctx = Depends(current_ctx)) -> Ctx:
        if ROLE_RANK[ctx.role] < ROLE_RANK[role]:
            raise HTTPException(403, detail={"code": "FORBIDDEN", "message": f"Requires role '{role}' (you are '{ctx.role}')"})
        return ctx
    return dep
