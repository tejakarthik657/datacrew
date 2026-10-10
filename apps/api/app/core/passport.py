"""Data Passport: canonical JSON + SHA-256 content hash. Verify recomputes the hash (and the score from stored inputs)."""
from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

from .health import recompute_from_inputs


def _norm(o: Any) -> Any:
    """Integral floats become ints so the hash survives a JavaScript JSON round trip (100.0 -> 100)."""
    if isinstance(o, float) and o.is_integer():
        return int(o)
    if isinstance(o, dict):
        return {k: _norm(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_norm(v) for v in o]
    return o


def canonical(doc: dict[str, Any]) -> str:
    d = _norm({k: v for k, v in doc.items() if k != "content_hash"})
    return json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def content_hash(doc: dict[str, Any]) -> str:
    return "sha256:" + hashlib.sha256(canonical(doc).encode()).hexdigest()


def build_passport(*, name: str, source: dict, collected_at: str, before: dict, after: dict, changes: list[dict],
                   risks: dict, versions: list[str], recipe_hash: str, privacy: dict) -> dict[str, Any]:
    per_col = {c: [before["per_column"].get(c, {}).get("score"), v["score"]] for c, v in after["per_column"].items()}
    doc = {
        "public_id": f"psp_{uuid.uuid4().hex[:16]}",
        "dataset": {"name": name, "source": {**source, "collected_at": collected_at}},
        "score": {"before": before["score"], "after": after["score"], "per_column": per_col,
                  "after_inputs": {"per_column": {c: {"inputs": v["inputs"], "weight": v["weight"]} for c, v in after["per_column"].items()}}},
        "changes": changes, "risks": risks,
        "lineage": {"versions": versions, "recipe_hash": recipe_hash},
        "privacy": privacy,
    }
    doc["content_hash"] = content_hash(doc)
    return doc


def verify_passport(doc: dict[str, Any]) -> dict[str, Any]:
    claimed = doc.get("content_hash", "")
    actual = content_hash(doc)
    result = {"hash_ok": claimed == actual, "claimed": claimed, "recomputed": actual}
    try:
        stored = doc["score"]["after_inputs"]
        result["score_recomputed"] = recompute_from_inputs(stored)
        result["score_ok"] = abs(result["score_recomputed"] - doc["score"]["after"]) < 0.11
    except Exception:
        result["score_ok"] = False
    result["verified"] = result["hash_ok"] and result["score_ok"]
    return result
