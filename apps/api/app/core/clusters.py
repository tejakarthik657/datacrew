"""Value-variant clustering ("Hyd", "hyderabad ", "Hydrabad" -> "Hyderabad"). Deterministic."""
from __future__ import annotations

import re
from collections import Counter

from rapidfuzz import fuzz

FUZZ_THRESHOLD = 86


def norm_key(v: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", "", v.strip().lower())).strip()


def _pretty(v: str) -> str:
    v = re.sub(r"\s+", " ", v.strip())
    if v.islower() or v.isupper():
        return v.title()
    return v


def variant_clusters(values: list[str], max_distinct: int = 250) -> dict[str, str]:
    """Return {raw_value: canonical_value} for every distinct raw value using fast prefix-bucketed fuzzy matching."""
    if not values:
        return {}

    counts = Counter(v for v in values if v is not None and str(v).strip())
    if not counts:
        return {}

    ordered = sorted(counts, key=lambda v: (-counts[v], str(v)))
    top_candidates = ordered[:max_distinct]

    canon_keys: list[str] = []
    buckets: dict[str, list[str]] = {}
    members: dict[str, list[str]] = {}

    for raw in top_candidates:
        k = norm_key(raw)
        if not k:
            continue
        target = None
        if k in members:
            target = k
        else:
            prefix = k[:2]
            candidates = buckets.get(prefix, [])
            for head in candidates:
                if len(k) >= 3 and head.startswith(k):
                    target = head
                    break
                if fuzz.ratio(k, head) >= FUZZ_THRESHOLD:
                    target = head
                    break
            if target is None and len(k) >= 3:
                # Secondary check across all canon keys only if no bucket match
                for head in canon_keys[:50]:
                    if fuzz.ratio(k, head) >= FUZZ_THRESHOLD:
                        target = head
                        break

        if target is None:
            canon_keys.append(k)
            prefix = k[:2]
            buckets.setdefault(prefix, []).append(k)
            members[k] = [raw]
        else:
            members[target].append(raw)

    mapping: dict[str, str] = {}
    for head, raws in members.items():
        stripped = Counter()
        for r in raws:
            stripped[re.sub(r"\s+", " ", r.strip())] += counts[r]
        proper = [s for s in stripped if not (s.islower() or s.isupper())]
        pool = proper or list(stripped)
        best = max(pool, key=lambda s: (stripped[s], s))
        canonical = best if proper else _pretty(best)
        for r in raws:
            mapping[r] = canonical
    for raw in counts:
        mapping.setdefault(raw, raw)
    return mapping


def name_canonical(v: str) -> str:
    """'  kumar,  RAVI ' -> 'Ravi Kumar'."""
    s = re.sub(r"\s+", " ", v.strip())
    if "," in s:
        parts = [p.strip() for p in s.split(",") if p.strip()]
        if len(parts) == 2:
            s = f"{parts[1]} {parts[0]}"
    return s.title()
