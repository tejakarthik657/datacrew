"""LLMRouter. Default is a mock/rule-based planner so the app runs with no keys.

The LLM only ever receives a MASKED sample + a type/count profile (no raw values), and returns JSON that is
validated against the plan schema. All execution is deterministic code.
"""
from __future__ import annotations

import json
from typing import Any

import httpx

from .config import settings

PLAN_PROMPT = (
    "You are a data-cleaning planner. Given a column profile and a MASKED sample, return ONLY a JSON object "
    '{"dataset_type": str, "steps": [{"id":"s1","type":<one of drop_duplicates,fuzzy_dedupe,fill_missing,standardize_dates,'
    "normalize_values,normalize_phone,rename_columns,split_column,merge_columns,cast_type,remove_rows,flag_outliers,"
    'restructure_to_schema,validate_rule>,"columns":[...],"params":{...},"rationale":str,"confidence":0-1,'
    '"risk_level":"low|medium|high","affected_rows_estimate":int,"reversible":bool}]}. No prose, no markdown.'
)


class LLMRouter:
    name = "mock"
    is_external = False

    def plan(self, profile: dict, masked_rows: list[dict], feedback: str = "") -> dict[str, Any]:
        raise NotImplementedError

    def text_to_sql(self, question: str, schema: dict[str, str], masked_rows: list[dict]) -> str | None:
        return None

    def explain(self, prompt: str) -> str | None:
        return None


class MockLLM(LLMRouter):
    """Rule-based: the orchestration falls back to planner.rule_based_plan, so this never needs to answer."""
    name = "mock"


class _JSONChat(LLMRouter):
    def _chat(self, system: str, user: str) -> str:
        raise NotImplementedError

    def plan(self, profile: dict, masked_rows: list[dict], feedback: str = "") -> dict[str, Any]:
        user = json.dumps({"profile": profile, "masked_sample": masked_rows}, default=str)
        if feedback:
            user += f"\nYour previous answer failed validation: {feedback}. Fix it and return only JSON."
        return _loads(self._chat(PLAN_PROMPT, user))

    def text_to_sql(self, question: str, schema: dict[str, str], masked_rows: list[dict]) -> str | None:
        sys = ("Write ONE DuckDB SELECT statement over table `data`. Use only these columns: "
               f"{json.dumps(schema)}. Return only SQL, no prose.")
        out = self._chat(sys, json.dumps({"question": question, "masked_sample": masked_rows[:5]}, default=str))
        return out.strip().strip("`").replace("sql\n", "", 1).strip()


def _loads(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{"):]
    return json.loads(text)


class OllamaLLM(_JSONChat):
    name = "ollama"
    is_external = False  # localhost

    def _chat(self, system: str, user: str) -> str:
        r = httpx.post(f"{settings.ollama_url}/api/chat", timeout=120, json={
            "model": settings.ollama_model, "stream": False, "format": "json",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        r.raise_for_status()
        return r.json()["message"]["content"]


class OpenAICompatLLM(_JSONChat):
    """Groq / OpenRouter / Gemini-OpenAI-compat. Implemented but NOT exercised against a live provider in this repo."""
    name = "openai_compat"
    is_external = True

    def _chat(self, system: str, user: str) -> str:
        r = httpx.post(f"{settings.llm_base_url.rstrip('/')}/chat/completions", timeout=60,
                       headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                       json={"model": settings.llm_model, "temperature": 0,
                             "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def get_llm() -> LLMRouter:
    p = settings.llm_provider
    if p == "ollama":
        return OllamaLLM()
    if p == "openai_compat" and settings.llm_base_url and settings.external_llm_allowed:
        return OpenAICompatLLM()  # only in byo/cloud mode; local mode never sends data out
    return MockLLM()
