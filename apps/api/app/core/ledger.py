"""Append-only privacy ledger with a SHA-256 hash chain, plus audit log helper."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import AuditLog, LedgerEntry

GENESIS = "0" * 64


def entry_hash(prev: str, tenant: str, seq: int, actor: str, action: str, dataset_id: str, model: str,
               fields_masked: int, bytes_external: int, payload_hash: str, ts: str) -> str:
    raw = "|".join([prev, tenant, str(seq), actor, action, dataset_id, model, str(fields_masked), str(bytes_external), payload_hash, ts])
    return hashlib.sha256(raw.encode()).hexdigest()


def append_ledger(db: Session, workspace_id: str, actor: str, action: str, dataset_id: str = "", model: str = "",
                  fields_masked: int = 0, bytes_external: int = 0, payload: Any = None) -> LedgerEntry:
    last = db.scalar(select(LedgerEntry).where(LedgerEntry.workspace_id == workspace_id).order_by(LedgerEntry.seq.desc()).limit(1))
    seq = (last.seq + 1) if last else 1
    prev = last.entry_hash if last else GENESIS
    ts = dt.datetime.now(dt.timezone.utc).isoformat()
    ph = hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest() if payload is not None else ""
    h = entry_hash(prev, workspace_id, seq, actor, action, dataset_id, model, fields_masked, bytes_external, ph, ts)
    e = LedgerEntry(workspace_id=workspace_id, seq=seq, prev_hash=prev, entry_hash=h, actor=actor, action=action,
                    dataset_id=dataset_id, model=model, fields_masked=fields_masked, bytes_external=bytes_external,
                    payload_hash=ph, ts=ts)
    db.add(e)
    db.commit()
    return e


def verify_ledger(db: Session, workspace_id: str) -> dict[str, Any]:
    rows = db.scalars(select(LedgerEntry).where(LedgerEntry.workspace_id == workspace_id).order_by(LedgerEntry.seq)).all()
    prev = GENESIS
    for i, e in enumerate(rows, start=1):
        expect = entry_hash(prev, workspace_id, e.seq, e.actor, e.action, e.dataset_id, e.model, e.fields_masked,
                            e.bytes_external, e.payload_hash, e.ts)
        if e.seq != i or e.prev_hash != prev or e.entry_hash != expect:
            return {"ok": False, "entries": len(rows), "broken_at_seq": e.seq}
        prev = e.entry_hash
    return {"ok": True, "entries": len(rows), "head": prev}


def audit(db: Session, workspace_id: str, actor: str, action: str, target: str = "", detail: dict | None = None) -> None:
    db.add(AuditLog(workspace_id=workspace_id, actor=actor, action=action, target=target, detail_json=json.dumps(detail or {}, default=str)))
    db.commit()


def privacy_summary(db: Session, workspace_id: str, mode: str) -> dict[str, Any]:
    tot = db.execute(select(func.coalesce(func.sum(LedgerEntry.bytes_external), 0), func.coalesce(func.sum(LedgerEntry.fields_masked), 0),
                            func.count(LedgerEntry.id)).where(LedgerEntry.workspace_id == workspace_id)).one()
    models = db.execute(select(LedgerEntry.model, func.count(LedgerEntry.id)).where(LedgerEntry.workspace_id == workspace_id, LedgerEntry.model != "")
                        .group_by(LedgerEntry.model)).all()
    return {"mode": mode, "bytes_sent_external": int(tot[0]), "fields_masked": int(tot[1]), "ledger_entries": int(tot[2]),
            "models_used": {m: n for m, n in models}, "ledger": verify_ledger(db, workspace_id)}
