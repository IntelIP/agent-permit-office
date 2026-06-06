from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY"
OPENROUTER_DEFAULT_MODEL = "anthropic/claude-sonnet-4.6"
OPENROUTER_ESCALATION_MODEL = "openai/gpt-5.5"
OPENROUTER_MODEL_PREFIX = "openrouter:"

_OPENROUTER_ALIASES = {
    "default": OPENROUTER_DEFAULT_MODEL,
    "sonnet": OPENROUTER_DEFAULT_MODEL,
    "sonnet-4.6": OPENROUTER_DEFAULT_MODEL,
    "claude-sonnet-4.6": OPENROUTER_DEFAULT_MODEL,
    "anthropic/claude-sonnet-4.6": OPENROUTER_DEFAULT_MODEL,
    "gpt-5.5": OPENROUTER_ESCALATION_MODEL,
    "openai/gpt-5.5": OPENROUTER_ESCALATION_MODEL,
}


def is_openrouter_model(model: str) -> bool:
    normalized = model.strip()
    if normalized.startswith(OPENROUTER_MODEL_PREFIX):
        return True
    return normalized in set(_OPENROUTER_ALIASES.values())


def resolve_openrouter_model_id(model: str | None) -> str:
    normalized = (model or "default").strip()
    if normalized.startswith(OPENROUTER_MODEL_PREFIX):
        normalized = normalized.removeprefix(OPENROUTER_MODEL_PREFIX)
    return _OPENROUTER_ALIASES.get(normalized, normalized)


def create_openrouter_chat_model(
    model: str | None = None,
    *,
    api_key: str | None = None,
    chat_model_cls: Callable[..., Any] | None = None,
) -> Any:
    api_key = api_key or os.getenv(OPENROUTER_API_KEY_ENV)
    if not api_key:
        raise RuntimeError(
            f"OpenRouter live Deep Agent runs require {OPENROUTER_API_KEY_ENV}."
        )
    model_id = resolve_openrouter_model_id(model)
    headers = {"X-Title": "Agent Permit Office"}
    referer = os.getenv("OPENROUTER_HTTP_REFERER")
    if referer:
        headers["HTTP-Referer"] = referer

    if chat_model_cls is None:
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as exc:
            raise RuntimeError(
                "OpenRouter model support requires the deep-agent extra: "
                "uv sync --extra deep-agent"
            ) from exc
        chat_model_cls = ChatOpenAI

    return chat_model_cls(
        model=model_id,
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        temperature=0,
        max_retries=2,
        default_headers=headers,
    )


def resolve_deep_agent_model(model: str) -> Any:
    if model.startswith(OPENROUTER_MODEL_PREFIX) or is_openrouter_model(model):
        return create_openrouter_chat_model(model)
    return model
