"""Strategist: ranked opportunities. Value-at-stake is ALWAYS computed here from data + editable assumptions - never by an LLM."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

import polars as pl

from .common import ROW_ID, data_columns, parse_date, parse_number, str_values

BAD_STATUS = {"overdue", "unpaid", "failed", "defaulted", "late"}
DEFAULT_RECOVERY = 0.4


def _months_span(df: pl.DataFrame, date_col: str | None) -> float:
    if not date_col:
        return 1.0
    ds = [d for d in (parse_date(v) for v in str_values(df[date_col])) if d]
    if len(ds) < 2:
        return 1.0
    return max(1.0, (max(ds) - min(ds)).days / 30.4)


def value_from_assumptions(kind: str, a: dict[str, float]) -> float:
    if kind in ("receivables", "segment"):
        return round(a["at_risk_amount_total"] * a["recovery_rate"] / max(a["months"], 1.0), 2)
    if kind == "forecast_downside":
        return round(a["downside_total"] * a["probability"] / max(a["horizon_months"], 1.0), 2)
    raise ValueError(kind)


def build_opportunities(df: pl.DataFrame, semantic: dict[str, str], forecast: dict | None = None,
                        overrides: dict[str, dict[str, float]] | None = None) -> list[dict[str, Any]]:
    overrides = overrides or {}
    cols = data_columns(df)
    date_col = next((c for c in cols if semantic.get(c) == "date"), None)
    amount = next((c for c in cols if semantic.get(c) == "numeric" and any(k in c for k in ("amount", "revenue", "total", "sales"))), None)
    status = next((c for c in cols if semantic.get(c) == "category" and any(str(v).lower() in BAD_STATUS for v in set(str_values(df[c])) if v)), None)
    opps: list[dict[str, Any]] = []
    months = round(_months_span(df, date_col), 2)
    if amount and status:
        amt = [parse_number(v) for v in str_values(df[amount])]
        st = [(v or "").strip().lower() for v in str_values(df[status])]
        ids = df[ROW_ID].to_list()
        bad_idx = [i for i, s in enumerate(st) if s in BAD_STATUS and amt[i] is not None]
        total_bad = sum(amt[i] for i in bad_idx)
        a = {"at_risk_amount_total": round(total_bad, 2), "months": months, "recovery_rate": DEFAULT_RECOVERY, **overrides.get("receivables", {})}
        opps.append({"id": "receivables", "kind": "receivables", "title": f"Overdue invoices: {len(bad_idx)} rows, ₹{total_bad:,.0f} outstanding",
                     "assumptions": a, "value_at_stake_inr_per_month": value_from_assumptions("receivables", a),
                     "confidence": "high" if len(bad_idx) >= 50 else "medium", "evidence_row_keys": [ids[i] for i in bad_idx[:25]],
                     "next_step": "Start a collections run on the largest overdue invoices first"})
        # segment concentration
        for gcol in [c for c in cols if semantic.get(c) == "category" and c != status]:
            g = [(v or "").strip() for v in str_values(df[gcol])]
            tot, bad = defaultdict(int), defaultdict(int)
            bad_amt: dict[str, float] = defaultdict(float)
            for i, gv in enumerate(g):
                if not gv:
                    continue
                tot[gv] += 1
                if st[i] in BAD_STATUS and amt[i] is not None:
                    bad[gv] += 1
                    bad_amt[gv] += amt[i]
            overall = len(bad_idx) / max(1, sum(tot.values()))
            ranked = sorted(((bad[k] / tot[k], k) for k in tot if tot[k] >= 30), reverse=True)
            if ranked and overall > 0 and ranked[0][0] > 1.3 * overall:
                share, key = ranked[0]
                excess_amt = bad_amt[key] * (1 - overall / share)
                ev = [ids[i] for i, gv in enumerate(g) if gv == key and st[i] in BAD_STATUS][:25]
                sa = {"at_risk_amount_total": round(excess_amt, 2), "months": months, "recovery_rate": DEFAULT_RECOVERY, **overrides.get(f"segment:{gcol}", {})}
                opps.append({"id": f"segment:{gcol}", "kind": "segment", "title": f"{key}: overdue rate {share:.0%} vs {overall:.0%} overall ({share / overall:.1f}×)",
                             "assumptions": sa, "value_at_stake_inr_per_month": value_from_assumptions("segment", sa),
                             "confidence": "medium", "evidence_row_keys": ev, "next_step": f"Review billing/onboarding for {gcol} = {key}"})
                break
    if forecast and forecast.get("points"):
        down = sum(max(0.0, p["yhat"] - p["lower"]) for p in forecast["points"])
        fa = {"downside_total": round(down, 2), "horizon_months": float(forecast["horizon"]), "probability": 0.1, **overrides.get("forecast_downside", {})}
        opps.append({"id": "forecast_downside", "kind": "forecast_downside", "title": f"Revenue forecast low case is ₹{down:,.0f} below the central estimate over {forecast['horizon']} months",
                     "assumptions": fa, "value_at_stake_inr_per_month": value_from_assumptions("forecast_downside", fa),
                     "confidence": "low", "evidence_row_keys": [], "next_step": "Build a cash buffer for the low case; re-check after next month's actuals"})
    opps.sort(key=lambda o: o["value_at_stake_inr_per_month"], reverse=True)
    for i, o in enumerate(opps, start=1):
        o["rank"] = i
    return opps


def ceo_brief(dataset_name: str, score_before: float, score_after: float, opps: list[dict], forecast: dict | None) -> str:
    lines = [f"# CEO brief: {dataset_name}", "",
             f"**Data health:** {score_before:.0f} → {score_after:.0f} / 100 after approved cleaning.", ""]
    if forecast:
        nxt = forecast["points"][0]
        lines += [f"**Next month revenue forecast:** ₹{nxt['yhat']:,.0f} (80% range ₹{nxt['lower']:,.0f}–₹{nxt['upper']:,.0f}), model: {forecast['model']}.", ""]
    lines.append("## What will add value (ranked, ₹ per month, assumptions editable)")
    for o in opps[:3]:
        lines.append(f"{o['rank']}. **{o['title']}**: ₹{o['value_at_stake_inr_per_month']:,.0f}/month at stake (confidence: {o['confidence']}). Next: {o['next_step']}.")
    if not opps:
        lines.append("No opportunities detected for this dataset shape (needs an amount and a status/segment column).")
    lines += ["", "_Numbers are computed by the engine from your data; assumptions can be changed in the What-if simulator._"]
    return "\n".join(lines)
