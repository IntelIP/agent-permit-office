from __future__ import annotations

from dataclasses import dataclass
import os


DEFAULT_PHOENIX_ENDPOINT = "http://localhost:6006"
DEFAULT_OBSERVABILITY_PROJECT = "agent-permit-office"


@dataclass(frozen=True)
class PhoenixTracingConfig:
    project_name: str
    endpoint: str
    auto_instrument: bool


def configure_phoenix_tracing(
    *,
    project_name: str = DEFAULT_OBSERVABILITY_PROJECT,
    endpoint: str | None = None,
    auto_instrument: bool = True,
) -> PhoenixTracingConfig:
    try:
        from phoenix.otel import register
    except ImportError as exc:
        raise RuntimeError(
            "Phoenix tracing requires the optional extra: "
            "uv run --extra phoenix agent-permit investigate ..."
        ) from exc

    resolved_endpoint = endpoint or os.environ.get(
        "PHOENIX_COLLECTOR_ENDPOINT",
        DEFAULT_PHOENIX_ENDPOINT,
    )
    os.environ.setdefault("PHOENIX_COLLECTOR_ENDPOINT", resolved_endpoint)
    os.environ.setdefault("PHOENIX_PROJECT_NAME", project_name)
    register(
        project_name=project_name,
        endpoint=resolved_endpoint,
        auto_instrument=auto_instrument,
    )
    return PhoenixTracingConfig(
        project_name=project_name,
        endpoint=resolved_endpoint,
        auto_instrument=auto_instrument,
    )
