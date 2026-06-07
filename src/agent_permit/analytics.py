from __future__ import annotations

import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import Field

from agent_permit.evidence_context import EvidenceContext
from agent_permit.models import (
    AgentBom,
    CodebaseMap,
    ControlReport,
    FileInventory,
    Finding,
    GraphPathReport,
    Permit,
    ScanRun,
    StrictModel,
)


RUN_METRICS_FILE = "run-metrics.json"
ANALYTICS_EVENTS_FILE = "analytics-events.jsonl"
EVAL_TRENDS_DIR = "eval-trends"
EVAL_TRENDS_JSON_FILE = "eval-trends.json"
EVAL_TRENDS_MARKDOWN_FILE = "eval-trends.md"
FIXTURE_EVAL_RESULTS_FILE = "eval-results.json"
SEVERITIES = ("critical", "high", "medium", "low", "info")


class AnalyticsEvent(StrictModel):
    version: int = 1
    event_name: str
    occurred_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    run_id: str | None = None
    run_type: str | None = None
    target_hash: str | None = None
    status: str | None = None
    permit_status: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class RunMetrics(StrictModel):
    version: int = 1
    run_id: str
    run_type: Literal["scan", "live_validation"]
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    target_hash: str
    status: str
    permit_status: str
    files_indexed: int | None = None
    high_signal_files: int | None = None
    skipped_files: int | None = None
    findings: int
    finding_severity_counts: dict[str, int]
    rule_counts: dict[str, int]
    graph_nodes: int | None = None
    graph_edges: int | None = None
    graph_paths: int
    controls: int
    credentials: int
    mcp_servers: int
    citation_check_status: str = "not_applicable"
    citation_supported: bool | None = None
    unsupported_citations: int = 0
    unsupported_rule_ids: int = 0
    missing_citation_rule_ids: int = 0
    aggregate_mismatches: int = 0
    model: str | None = None
    model_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cached_tokens: int = 0
    cache_write_tokens: int = 0
    cache_hit_ratio: float | None = None
    duration_ms: int | None = None
    scan_exit_code: int | None = None
    investigation_exit_code: int | None = None
    phoenix: bool | None = None
    langsmith: bool | None = None
    available_artifacts: list[str] = Field(default_factory=list)


def build_analytics_event(
    event_name: str,
    *,
    run_id: str | None = None,
    run_type: str | None = None,
    target_hash: str | None = None,
    status: str | None = None,
    permit_status: str | None = None,
    payload: dict[str, Any] | None = None,
) -> AnalyticsEvent:
    return AnalyticsEvent(
        event_name=event_name,
        run_id=run_id,
        run_type=run_type,
        target_hash=target_hash,
        status=status,
        permit_status=permit_status,
        payload=_json_safe_payload(payload or {}),
    )


def event_from_metrics(
    event_name: str,
    metrics: RunMetrics,
    *,
    status: str | None = None,
    payload: dict[str, Any] | None = None,
) -> AnalyticsEvent:
    return build_analytics_event(
        event_name,
        run_id=metrics.run_id,
        run_type=metrics.run_type,
        target_hash=metrics.target_hash,
        status=status or metrics.status,
        permit_status=metrics.permit_status,
        payload=payload,
    )


def analytics_events_path(root_path: Path) -> Path:
    return root_path.resolve() / ".agent-permit" / ANALYTICS_EVENTS_FILE


def analytics_events_path_for_output(output_dir: Path) -> Path:
    artifact_root = nearest_artifact_root(output_dir)
    if artifact_root is not None:
        return artifact_root / ANALYTICS_EVENTS_FILE
    return output_dir.resolve() / ANALYTICS_EVENTS_FILE


def append_analytics_event(path: Path, event: AnalyticsEvent) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event.model_dump(mode="json"), sort_keys=True) + "\n")


def read_analytics_events(path: Path) -> list[AnalyticsEvent]:
    if not path.is_file():
        return []
    events: list[AnalyticsEvent] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            events.append(AnalyticsEvent.model_validate(json.loads(line)))
    return events


def build_analytics_summary(path: Path) -> dict[str, Any]:
    event_path = path if path.is_file() else analytics_events_path(path)
    events = read_analytics_events(event_path)
    counts = Counter(event.event_name for event in events)
    status_counts = Counter(
        event.status for event in events if event.status is not None
    )
    latest_event = events[-1] if events else None
    return {
        "events_path": str(event_path),
        "total_events": len(events),
        "event_counts": dict(sorted(counts.items())),
        "status_counts": dict(sorted(status_counts.items())),
        "latest_event": (
            latest_event.model_dump(mode="json") if latest_event is not None else None
        ),
    }


def build_scan_run_metrics(
    *,
    scan_run: ScanRun,
    target_path: Path,
    inventory: FileInventory,
    agent_bom: AgentBom,
    codebase_map: CodebaseMap,
    findings: list[Finding],
    graph_paths: GraphPathReport,
    controls: ControlReport,
    permit: Permit,
) -> RunMetrics:
    return RunMetrics(
        run_id=scan_run.id,
        run_type="scan",
        target_hash=target_fingerprint(target_path, inventory=inventory),
        status=_enum_value(scan_run.status),
        permit_status=_enum_value(permit.status),
        files_indexed=len(inventory.files),
        high_signal_files=sum(1 for entry in inventory.files if entry.high_signal),
        skipped_files=sum(inventory.skipped.values()),
        findings=len(findings),
        finding_severity_counts=finding_severity_counts(findings),
        rule_counts=finding_rule_counts(findings),
        graph_nodes=len(codebase_map.nodes),
        graph_edges=len(codebase_map.edges),
        graph_paths=len(graph_paths.paths),
        controls=len(controls.controls),
        credentials=len(agent_bom.credential_refs),
        mcp_servers=len(agent_bom.mcp_servers),
        duration_ms=duration_ms(scan_run.started_at, scan_run.completed_at),
        available_artifacts=_available_artifacts(scan_run.artifact_dir),
    )


def build_live_validation_metrics(
    *,
    context: EvidenceContext,
    target_path: Path,
    status: str,
    started_at: datetime,
    completed_at: datetime,
    model: str,
    citation_check: dict[str, Any],
    usage_summary: dict[str, Any] | None,
    scan_exit_code: int,
    investigation_exit_code: int,
    phoenix: bool,
    langsmith: bool,
) -> RunMetrics:
    artifact_counts = _read_artifact_counts(context.artifact_dir)
    citation_metrics = _citation_metrics(citation_check)
    usage_metrics = _usage_metrics(usage_summary)
    return RunMetrics(
        run_id=context.scan_run_id,
        run_type="live_validation",
        target_hash=target_fingerprint(
            target_path,
            inventory=artifact_counts.get("inventory"),
        ),
        status=status,
        permit_status=context.permit_status,
        files_indexed=artifact_counts.get("files_indexed"),
        high_signal_files=artifact_counts.get("high_signal_files"),
        skipped_files=artifact_counts.get("skipped_files"),
        findings=len(context.findings),
        finding_severity_counts=context.finding_severity_counts(),
        rule_counts=finding_rule_counts(list(context.findings)),
        graph_nodes=artifact_counts.get("graph_nodes"),
        graph_edges=artifact_counts.get("graph_edges"),
        graph_paths=len(context.graph_paths.paths),
        controls=len(context.controls.controls),
        credentials=len(context.agent_bom.credential_refs),
        mcp_servers=len(context.agent_bom.mcp_servers),
        model=model,
        duration_ms=duration_ms(started_at, completed_at),
        scan_exit_code=scan_exit_code,
        investigation_exit_code=investigation_exit_code,
        phoenix=phoenix,
        langsmith=langsmith,
        available_artifacts=list(context.summary().available_artifacts),
        **citation_metrics,
        **usage_metrics,
    )


def write_run_metrics(path: Path, metrics: RunMetrics) -> None:
    path.write_text(
        json.dumps(metrics.model_dump(mode="json"), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def eval_trends_dir_for_output(output_dir: Path, eval_run_id: str) -> Path:
    artifact_root = nearest_artifact_root(output_dir)
    if artifact_root is not None:
        return artifact_root / EVAL_TRENDS_DIR / eval_run_id
    return output_dir.resolve() / EVAL_TRENDS_DIR / eval_run_id


def write_eval_trends(output_dir: Path, eval_run_id: str) -> tuple[Path, Path]:
    trend_dir = eval_trends_dir_for_output(output_dir, eval_run_id)
    trend_dir.mkdir(parents=True, exist_ok=True)
    payload = build_eval_trends(output_dir=output_dir, trend_run_id=eval_run_id)
    json_path = trend_dir / EVAL_TRENDS_JSON_FILE
    markdown_path = trend_dir / EVAL_TRENDS_MARKDOWN_FILE
    json_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    markdown_path.write_text(
        build_eval_trends_markdown(payload),
        encoding="utf-8",
    )
    return json_path, markdown_path


def build_eval_trends(
    *,
    output_dir: Path,
    trend_run_id: str,
) -> dict[str, Any]:
    run_summaries = [
        _eval_result_summary(path)
        for path in _discover_fixture_eval_result_paths(output_dir)
    ]
    run_summaries = [summary for summary in run_summaries if summary is not None]
    latest = run_summaries[-1] if run_summaries else None
    total_cases = sum(int(run["total_cases"]) for run in run_summaries)
    failed_cases = sum(int(run["failed_cases"]) for run in run_summaries)
    citation_failures = sum(int(run["citation_failures"]) for run in run_summaries)
    aggregate_mismatches = sum(int(run["aggregate_mismatches"]) for run in run_summaries)
    pass_rates = [float(run["pass_rate"]) for run in run_summaries]
    return {
        "version": 1,
        "trend_run_id": trend_run_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "runs": len(run_summaries),
            "latest_run_id": latest["eval_run_id"] if latest else None,
            "latest_passed": latest["passed"] if latest else None,
            "latest_pass_rate": latest["pass_rate"] if latest else None,
            "best_pass_rate": max(pass_rates) if pass_rates else None,
            "worst_pass_rate": min(pass_rates) if pass_rates else None,
            "total_cases": total_cases,
            "failed_cases": failed_cases,
            "citation_failures": citation_failures,
            "aggregate_mismatches": aggregate_mismatches,
        },
        "runs": run_summaries,
    }


def build_eval_trends_markdown(payload: dict[str, Any]) -> str:
    summary = payload["summary"]
    lines = [
        "# Agent Permit Office Eval Trends",
        "",
        f"Trend run: `{payload['trend_run_id']}`",
        f"Runs: `{summary['runs']}`",
        f"Latest run: `{summary['latest_run_id'] or 'none'}`",
        f"Latest pass rate: `{_format_rate(summary['latest_pass_rate'])}`",
        f"Failed cases: `{summary['failed_cases']}`",
        f"Citation failures: `{summary['citation_failures']}`",
        f"Aggregate mismatches: `{summary['aggregate_mismatches']}`",
        "",
        "## Runs",
        "",
        "| Run | Status | Cases | Pass Rate | Quality | Citation Failures | Aggregate Mismatches |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for run in payload["runs"]:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(run["eval_run_id"]),
                    "pass" if run["passed"] else "fail",
                    f"{run['passed_cases']}/{run['total_cases']}",
                    _format_rate(run["pass_rate"]),
                    f"{float(run['average_quality_score']):.2f}",
                    str(run["citation_failures"]),
                    str(run["aggregate_mismatches"]),
                ]
            )
            + " |"
        )
    return "\n".join(lines).rstrip() + "\n"


def nearest_artifact_root(path: Path) -> Path | None:
    resolved = path.resolve()
    candidates = [resolved, *resolved.parents]
    for candidate in candidates:
        if candidate.name == ".agent-permit":
            return candidate
    return None


def target_fingerprint(
    target_path: Path,
    *,
    inventory: FileInventory | None = None,
) -> str:
    if inventory is None:
        digest_input = f"path:{target_path.resolve()}".encode()
    else:
        entries = [
            f"{entry.path}:{entry.sha256}"
            for entry in sorted(inventory.files, key=lambda item: item.path)
        ]
        digest_input = "\n".join(entries).encode()
    return "sha256:" + hashlib.sha256(digest_input).hexdigest()


def finding_severity_counts(findings: list[Finding]) -> dict[str, int]:
    counts: Counter[str] = Counter(_enum_value(finding.severity) for finding in findings)
    return {severity: counts.get(severity, 0) for severity in SEVERITIES}


def finding_rule_counts(findings: list[Finding]) -> dict[str, int]:
    counts: Counter[str] = Counter(finding.rule_id for finding in findings)
    return dict(sorted(counts.items()))


def duration_ms(
    started_at: datetime | None,
    completed_at: datetime | None,
) -> int | None:
    if started_at is None or completed_at is None:
        return None
    return max(0, int((completed_at - started_at).total_seconds() * 1000))


def _citation_metrics(citation_check: dict[str, Any]) -> dict[str, Any]:
    return {
        "citation_check_status": str(citation_check.get("status", "not_run")),
        "citation_supported": citation_check.get("supported"),
        "unsupported_citations": len(citation_check.get("unsupported_citations") or []),
        "unsupported_rule_ids": len(citation_check.get("unsupported_rule_ids") or []),
        "missing_citation_rule_ids": len(
            citation_check.get("missing_citation_rule_ids") or []
        ),
        "aggregate_mismatches": len(citation_check.get("aggregate_mismatches") or []),
    }


def _usage_metrics(usage_summary: dict[str, Any] | None) -> dict[str, Any]:
    usage_summary = usage_summary or {}
    return {
        "model_calls": int(usage_summary.get("model_calls") or 0),
        "input_tokens": int(usage_summary.get("input_tokens") or 0),
        "output_tokens": int(usage_summary.get("output_tokens") or 0),
        "total_tokens": int(usage_summary.get("total_tokens") or 0),
        "cached_tokens": int(usage_summary.get("cached_tokens") or 0),
        "cache_write_tokens": int(usage_summary.get("cache_write_tokens") or 0),
        "cache_hit_ratio": usage_summary.get("cache_hit_ratio"),
    }


def _read_artifact_counts(artifact_dir: Path) -> dict[str, Any]:
    counts: dict[str, Any] = {}
    inventory_path = artifact_dir / "file-inventory.json"
    if inventory_path.is_file():
        inventory = FileInventory.model_validate(_read_json(inventory_path))
        counts["inventory"] = inventory
        counts["files_indexed"] = len(inventory.files)
        counts["high_signal_files"] = sum(
            1 for entry in inventory.files if entry.high_signal
        )
        counts["skipped_files"] = sum(inventory.skipped.values())
    codebase_map_path = artifact_dir / "codebase-map.json"
    if codebase_map_path.is_file():
        codebase_map = CodebaseMap.model_validate(_read_json(codebase_map_path))
        counts["graph_nodes"] = len(codebase_map.nodes)
        counts["graph_edges"] = len(codebase_map.edges)
    return counts


def _available_artifacts(artifact_dir: Path) -> list[str]:
    return sorted(path.name for path in artifact_dir.iterdir() if path.is_file())


def _read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"artifact must contain a JSON object: {path.name}")
    return payload


def _enum_value(value: object) -> str:
    raw_value = getattr(value, "value", value)
    return str(raw_value)


def _json_safe_payload(payload: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, (str, int, float, bool)) or value is None:
            safe[key] = value
        elif isinstance(value, (list, tuple)):
            safe[key] = [
                item
                for item in value
                if isinstance(item, (str, int, float, bool)) or item is None
            ]
        else:
            safe[key] = str(value)
    return safe


def _discover_fixture_eval_result_paths(output_dir: Path) -> list[Path]:
    output_dir = output_dir.resolve()
    artifact_root = nearest_artifact_root(output_dir)
    if artifact_root is None:
        path = output_dir / FIXTURE_EVAL_RESULTS_FILE
        return [path] if path.is_file() else []
    evals_dir = artifact_root / "evals"
    return sorted(evals_dir.glob(f"*/{FIXTURE_EVAL_RESULTS_FILE}"))


def _eval_result_summary(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    payload = _read_json(path)
    results = payload.get("results") or []
    if not isinstance(results, list):
        results = []
    total_cases = len(results)
    passed_cases = sum(1 for result in results if _result_bool(result, "passed"))
    failed_cases = total_cases - passed_cases
    quality_scores = [
        float(result.get("quality_score") or 0.0)
        for result in results
        if isinstance(result, dict)
    ]
    return {
        "eval_run_id": str(payload.get("eval_run_id", path.parent.name)),
        "passed": bool(payload.get("passed", False)),
        "total_cases": total_cases,
        "passed_cases": passed_cases,
        "failed_cases": failed_cases,
        "pass_rate": round(passed_cases / total_cases, 4) if total_cases else 0.0,
        "average_quality_score": (
            round(sum(quality_scores) / len(quality_scores), 4)
            if quality_scores
            else 0.0
        ),
        "status_failures": _failure_count(results, "status_check_passed"),
        "rule_failures": _failure_count(results, "rule_id_check_passed"),
        "citation_failures": _failure_count(results, "citation_check_passed"),
        "secret_leak_failures": _failure_count(results, "secret_leak_check_passed"),
        "aggregate_mismatches": sum(
            int(result.get("aggregate_mismatches") or 0)
            for result in results
            if isinstance(result, dict)
        ),
        "started_at": payload.get("started_at"),
        "completed_at": payload.get("completed_at"),
    }


def _failure_count(results: list[Any], key: str) -> int:
    return sum(1 for result in results if not _result_bool(result, key))


def _result_bool(result: Any, key: str) -> bool:
    return isinstance(result, dict) and result.get(key) is True


def _format_rate(value: Any) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.2%}"
