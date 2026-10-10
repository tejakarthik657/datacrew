"""Forecaster. Statistical models only (the LLM never produces numbers). Holt-Winters/ETS via statsmodels when
there is enough history, otherwise seasonal-naive / mean. NOTE: statsforecast/Prophet are not installed; see REMAINING.md."""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Any

import polars as pl

from .common import data_columns, parse_date, parse_number, str_values

Z80 = 1.2816


def monthly_series(df: pl.DataFrame, date_col: str | None, value_col: str) -> list[tuple[str, float]]:
    agg: dict[str, float] = defaultdict(float)
    if date_col and date_col in df.columns:
        for d, v in zip(str_values(df[date_col]), str_values(df[value_col])):
            dd, x = parse_date(d), parse_number(v)
            if dd is not None and x is not None:
                agg[dd.strftime("%Y-%m")] += x
    
    res = sorted(agg.items())
    if not res and value_col in df.columns:
        # Fallback to chunking numeric values into sequential periods
        nums = [parse_number(v) for v in str_values(df[value_col])]
        valid_nums = [x for x in nums if x is not None]
        if valid_nums:
            chunk_size = max(1, len(valid_nums) // 6)
            res = []
            for i in range(0, len(valid_nums), chunk_size):
                chunk = valid_nums[i:i+chunk_size]
                if chunk:
                    idx = len(res) + 1
                    res.append((f"2026-{idx:02d}", sum(chunk)))
    return res


def _next_months(last: str, h: int) -> list[str]:
    try:
        y, m = int(last[:4]), int(last[5:7])
    except (ValueError, IndexError):
        y, m = 2026, 1
    out = []
    for _ in range(h):
        m += 1
        if m > 12:
            y, m = y + 1, 1
        out.append(f"{y:04d}-{m:02d}")
    return out


def forecast_series(series: list[tuple[str, float]], horizon: int = 3) -> dict[str, Any]:
    if not series:
        raise ValueError("Need numeric series data to calculate forecast")
    
    ys = [v for _, v in series]
    hist = series
    if len(series) >= 6 and ys[-1] < 0.5 * sorted(ys[-4:-1])[1]:
        hist = series[:-1]
        ys = ys[:-1]
    
    n = len(ys)
    model = "mean"
    fitted: list[float] = [sum(ys) / n] * n
    fc: list[float] = [sum(ys) / n] * horizon
    
    if n >= 4:
        try:
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
            seasonal = "add" if n >= 24 else None
            fit = ExponentialSmoothing(ys, trend="add", damped_trend=True, seasonal=seasonal, seasonal_periods=12 if seasonal else None,
                                       initialization_method="estimated").fit()
            fc = [float(x) for x in fit.forecast(horizon)]
            fitted = [float(x) for x in fit.fittedvalues]
            model = "holt_winters_damped" + ("_seasonal" if seasonal else "")
        except Exception:
            if n >= 12:
                fc = [ys[-12 + (i % 12)] for i in range(horizon)]
                fitted = [ys[i - 12] if i >= 12 else ys[i] for i in range(n)]
                model = "seasonal_naive"
    elif n >= 2:
        slope = (ys[-1] - ys[0]) / (n - 1)
        fc = [ys[-1] + slope * (i + 1) for i in range(horizon)]
        model = "linear_trend"

    resid = [a - b for a, b in zip(ys, fitted)]
    sigma = math.sqrt(sum(r * r for r in resid) / max(1, len(resid) - 1)) if resid else (abs(sum(ys)/n) * 0.1 if ys else 1.0)
    last_ts = hist[-1][0] if hist else "2026-01"
    months = _next_months(last_ts, horizon)
    pts = [
        {
            "ts": ts,
            "date": ts,
            "yhat": round(y, 2),
            "forecast": round(y, 2),
            "lower": round(y - Z80 * sigma * math.sqrt(i + 1), 2),
            "upper": round(y + Z80 * sigma * math.sqrt(i + 1), 2),
        }
        for i, (ts, y) in enumerate(zip(months, fc))
    ]
    return {
        "model": model,
        "interval": "80%",
        "horizon": horizon,
        "history": [{"ts": t, "date": t, "value": round(v, 2), "actual": round(v, 2)} for t, v in hist],
        "points": pts,
    }


def pick_columns(semantic: dict[str, str], cols: list[str]) -> tuple[str | None, str | None]:
    date = next((c for c in cols if semantic.get(c) == "date"), None)
    if not date:
        date = next((c for c in cols if any(k in c.lower() for k in ("date", "time", "created", "timestamp", "month", "year"))), None)
    
    nums = [c for c in cols if semantic.get(c) == "numeric"]
    if not nums:
        nums = [c for c in cols if c.lower() not in ("id", "uuid")]
    
    metric = next((c for c in nums if any(k in c.lower() for k in ("amount", "revenue", "sales", "total", "price", "cost", "value", "quantity"))), nums[0] if nums else None)
    return date, metric



def score_forecast(record: dict[str, Any], actuals: list[dict[str, Any]]) -> dict[str, Any]:
    by_ts = {p["ts"]: p for p in record["points"]}
    scored, apes, sapes, inside = [], [], [], 0
    for a in actuals:
        p = by_ts.get(a["ts"])
        if not p:
            continue
        act = float(a["actual"])
        ape = abs(act - p["yhat"]) / abs(act) if act else 0.0
        sape = 2 * abs(act - p["yhat"]) / (abs(act) + abs(p["yhat"])) if (act or p["yhat"]) else 0.0
        ins = p["lower"] <= act <= p["upper"]
        inside += ins
        apes.append(ape); sapes.append(sape)
        scored.append({"ts": a["ts"], "actual": act, "abs_pct_error": round(ape, 4), "inside_interval": ins})
    n = len(scored)
    return {"actuals": scored, "n": n, "mape": round(sum(apes) / n, 4) if n else None, "smape": round(sum(sapes) / n, 4) if n else None,
            "coverage": f"actuals fell inside our range {inside} of {n} times" if n else "no matching actuals",
            "misses": [s for s in scored if not s["inside_interval"]]}
