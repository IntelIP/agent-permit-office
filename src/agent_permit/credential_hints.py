from __future__ import annotations


_CREDENTIAL_NAME_MARKERS = (
    "ACCESS_KEY",
    "API_KEY",
    "AUTH_TOKEN",
    "BEARER_TOKEN",
    "CLIENT_SECRET",
    "CONNECTION_STRING",
    "CREDENTIAL",
    "DATABASE_URL",
    "DB_URL",
    "DSN",
    "PRIVATE_KEY",
    "SECRET",
    "TOKEN",
    "WEBHOOK_URL",
)


def is_credential_name(name: str) -> bool:
    normalized = name.upper()
    return any(marker in normalized for marker in _CREDENTIAL_NAME_MARKERS)


def provider_hint(name: str) -> str | None:
    normalized = name.upper()
    if normalized.startswith("AWS_"):
        return "aws"
    if normalized.startswith("GITHUB_") or normalized in {"GH_TOKEN", "GITHUB_TOKEN"}:
        return "github"
    if normalized.startswith("OPENAI_"):
        return "openai"
    if normalized.startswith("ANTHROPIC_"):
        return "anthropic"
    if normalized.startswith("LANGSMITH_"):
        return "langsmith"
    if normalized.startswith("SLACK_"):
        return "slack"
    if normalized.startswith(("DATABASE_", "POSTGRES_", "SUPABASE_")):
        return "database"
    return None


def scope_hint(name: str) -> str | None:
    normalized = name.upper()
    if "TOKEN" in normalized:
        return "token"
    if "API_KEY" in normalized or "ACCESS_KEY" in normalized:
        return "api_key"
    if "SECRET" in normalized:
        return "secret"
    if "PRIVATE_KEY" in normalized:
        return "private_key"
    if normalized.endswith("_URL") or "CONNECTION_STRING" in normalized or "DSN" in normalized:
        return "connection_string"
    return None
