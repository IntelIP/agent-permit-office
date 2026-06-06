import pytest

from agent_permit.model_provider import (
    OPENROUTER_BASE_URL,
    OPENROUTER_DEFAULT_MODEL,
    OPENROUTER_ESCALATION_MODEL,
    create_openrouter_chat_model,
    is_openrouter_model,
    resolve_openrouter_model_id,
)


def test_openrouter_model_aliases_resolve_to_current_ids() -> None:
    assert resolve_openrouter_model_id(None) == OPENROUTER_DEFAULT_MODEL
    assert resolve_openrouter_model_id("openrouter:sonnet-4.6") == (
        "anthropic/claude-sonnet-4.6"
    )
    assert resolve_openrouter_model_id("openrouter:claude-sonnet-4.6") == (
        "anthropic/claude-sonnet-4.6"
    )
    assert resolve_openrouter_model_id("openrouter:gpt-5.5") == "openai/gpt-5.5"
    assert resolve_openrouter_model_id("openrouter:openai/gpt-5.5") == (
        "openai/gpt-5.5"
    )


def test_openrouter_model_detection() -> None:
    assert is_openrouter_model("openrouter:sonnet-4.6") is True
    assert is_openrouter_model(OPENROUTER_DEFAULT_MODEL) is True
    assert is_openrouter_model(OPENROUTER_ESCALATION_MODEL) is True
    assert is_openrouter_model("openai:gpt-5.5") is False


def test_openrouter_model_requires_api_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        create_openrouter_chat_model("openrouter:sonnet-4.6")


def test_openrouter_chat_model_uses_openai_compatible_base_url() -> None:
    calls = []

    class FakeChatModel:
        def __init__(self, **kwargs):
            calls.append(kwargs)

    model = create_openrouter_chat_model(
        "openrouter:gpt-5.5",
        api_key="test-key",
        chat_model_cls=FakeChatModel,
    )

    assert isinstance(model, FakeChatModel)
    assert calls == [
        {
            "model": "openai/gpt-5.5",
            "api_key": "test-key",
            "base_url": OPENROUTER_BASE_URL,
            "temperature": 0,
            "max_retries": 2,
            "default_headers": {"X-Title": "Agent Permit Office"},
        }
    ]
