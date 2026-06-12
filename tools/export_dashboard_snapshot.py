from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_ROOT = REPO_ROOT / ".agent-permit"
OUTPUT_PATH = REPO_ROOT / "dashboard" / "src" / "data" / "generated" / "dashboardSnapshot.json"


def main() -> None:
    validation_path = latest_file(
        ARTIFACT_ROOT / "live-repo-validations",
        "live-repo-validation-results.json",
    )
    demo_path = latest_file(
        ARTIFACT_ROOT / "open-source-demos",
        "open-source-demo-results.json",
    )
    eval_trends_path = latest_file(
        ARTIFACT_ROOT / "eval-trends",
        "eval-trends.json",
    )
    latest_scan_metrics_path = latest_file(ARTIFACT_ROOT / "runs", "run-metrics.json")

    validation = read_json(validation_path)
    demo = read_json(demo_path) if demo_path else {}
    eval_trends = read_json(eval_trends_path) if eval_trends_path else {}
    latest_scan_metrics = read_json(latest_scan_metrics_path) if latest_scan_metrics_path else {}
    repo_prep = {entry["repo_id"]: entry for entry in demo.get("repo_prep", [])}
    rows = build_rows(validation, repo_prep, validation_path)
    summary = build_summary(validation, rows, eval_trends, latest_scan_metrics)

    snapshot = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "validationRunId": validation.get("validation_run_id"),
            "validationPath": relative_path(validation_path),
            "demoRunId": demo.get("demo_run_id"),
            "demoPath": relative_path(demo_path) if demo_path else None,
            "evalRunId": eval_trends.get("trend_run_id"),
            "evalPath": relative_path(eval_trends_path) if eval_trends_path else None,
            "latestScanRunId": latest_scan_metrics.get("run_id"),
            "latestScanPath": relative_path(latest_scan_metrics_path)
            if latest_scan_metrics_path
            else None,
        },
        "runMeta": {
            "title": "Permit Review Queue",
            "repo": "open-source validation suite",
            "branch": "recent commits",
            "runId": validation.get("validation_run_id", "unknown-run"),
            "completedAt": validation.get("completed_at"),
        },
        "summary": summary,
        "savedViews": [
            {"id": "all", "label": "All Repos", "count": len(rows)},
            {"id": "blocked", "label": "Blocked", "count": summary["blockedRepos"]},
            {
                "id": "needs-review",
                "label": "Needs Review",
                "count": summary["needsReviewRepos"],
            },
            {"id": "approved", "label": "Approved", "count": summary["approvedRepos"]},
        ],
        "findings": rows,
        "traceSteps": build_trace_steps(summary),
        "policyControls": build_policy_controls(summary),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Wrote {relative_path(OUTPUT_PATH)}")


def latest_file(root: Path, filename: str) -> Path | None:
    if not root.exists():
        return None
    matches = sorted(root.glob(f"*/{filename}"), key=lambda path: path.stat().st_mtime)
    return matches[-1] if matches else None


def read_json(path: Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def build_rows(
    validation: dict[str, Any],
    repo_prep: dict[str, dict[str, Any]],
    validation_path: Path | None,
) -> list[dict[str, Any]]:
    rows = []
    for index, result in enumerate(validation.get("results", []), start=1):
        repo_id = result.get("repo_id", "unknown-repo")
        prep = repo_prep.get(repo_id, {})
        status = normalize_status(result.get("actual_permit_status"))
        rules = result.get("actual_rule_ids", [])
        findings_count = result.get("findings_count", 0)
        graph_paths = result.get("graph_paths_count", 0)
        controls = result.get("controls_count", 0)
        citation_passed = bool(result.get("citation_check_passed"))
        expectation_passed = bool(result.get("expectation_check_passed"))
        source = result.get("source", prep.get("source", repo_id))
        primary_rule = rules[0] if rules else "clean-run"
        severity = severity_for(status, rules, findings_count)
        capability = capability_for(rules, status)

        rows.append(
            {
                "id": f"APO-LIVE-{index:04d}",
                "repo": repo_id,
                "source": source,
                "branch": "recent commit",
                "runId": result.get("run_id", validation.get("validation_run_id")),
                "status": status,
                "severity": severity,
                "rule": primary_rule,
                "title": title_for(repo_id, status, findings_count, rules),
                "path": relative_path(validation_path) if validation_path else "live-validation-results.json",
                "line": 0,
                "capability": capability,
                "confidence": confidence_for(citation_passed, expectation_passed),
                "owner": owner_for(status, capability),
                "age": age_label(prep.get("commit_date")),
                "summary": summary_for(result, repo_id, status),
                "evidence": evidence_for(rules, findings_count, graph_paths, controls),
                "scanner": "live-validation + bounded deep agent",
                "remediation": remediation_for(status, rules),
                "artifacts": artifacts_for(result, validation_path),
                "traceIds": trace_ids_for(result),
                "commit": {
                    "hash": prep.get("commit"),
                    "date": prep.get("commit_date"),
                    "message": prep.get("commit_message"),
                },
                "metrics": {
                    "cacheHitRatio": result.get("cache_hit_ratio"),
                    "cachedTokens": result.get("cached_tokens", 0),
                    "citationCheckPassed": citation_passed,
                    "controls": controls,
                    "durationSeconds": result.get("duration_seconds"),
                    "expectationCheckPassed": expectation_passed,
                    "findings": findings_count,
                    "graphPaths": graph_paths,
                    "modelCalls": result.get("model_calls", 0),
                    "totalTokens": result.get("total_tokens", 0),
                },
            }
        )
    return rows


def build_summary(
    validation: dict[str, Any],
    rows: list[dict[str, Any]],
    eval_trends: dict[str, Any],
    latest_scan_metrics: dict[str, Any],
) -> dict[str, Any]:
    statuses = Counter(row["status"] for row in rows)
    validation_summary = validation.get("summary", {})
    citation_passes = sum(1 for row in rows if row["metrics"]["citationCheckPassed"])
    return {
        "repos": len(rows),
        "passedRepos": validation_summary.get("passed", 0),
        "blockedRepos": statuses.get("blocked", 0),
        "needsReviewRepos": statuses.get("needs-review", 0),
        "approvedRepos": statuses.get("approved", 0),
        "findings": sum(row["metrics"]["findings"] for row in rows),
        "graphPaths": sum(row["metrics"]["graphPaths"] for row in rows),
        "controls": sum(row["metrics"]["controls"] for row in rows),
        "citationCoverage": citation_passes / len(rows) if rows else 0,
        "cacheHitRatio": validation_summary.get("cache_hit_ratio"),
        "cachedTokens": validation_summary.get("cached_tokens", 0),
        "inputTokens": validation_summary.get("input_tokens", 0),
        "totalTokens": validation_summary.get("total_tokens", 0),
        "modelCalls": sum(row["metrics"]["modelCalls"] for row in rows),
        "evalPassRate": eval_trends.get("summary", {}).get("latest_pass_rate"),
        "latestScanStatus": latest_scan_metrics.get("permit_status"),
        "latestScanFindings": latest_scan_metrics.get("findings"),
        "latestScanFilesIndexed": latest_scan_metrics.get("files_indexed"),
    }


def build_trace_steps(summary: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "id": "trace-artifacts",
            "label": "Load validation artifacts",
            "state": "passed",
            "duration": "static",
            "tool": "artifact.read",
            "output": f"{summary['repos']} repo validation rows loaded from durable .agent-permit output.",
        },
        {
            "id": "trace-citations",
            "label": "Check citation coverage",
            "state": "passed" if summary["citationCoverage"] >= 1 else "review",
            "duration": "aggregate",
            "tool": "citation_critic.verify",
            "output": f"{summary['citationCoverage']:.0%} of live repo validations passed citation checks.",
        },
        {
            "id": "trace-paths",
            "label": "Trace capability paths",
            "state": "blocked" if summary["blockedRepos"] else "passed",
            "duration": "aggregate",
            "tool": "graph.paths",
            "output": f"{summary['graphPaths']} graph paths and {summary['controls']} controls found across live repos.",
        },
        {
            "id": "trace-cost",
            "label": "Measure model cost controls",
            "state": "passed" if (summary.get("cacheHitRatio") or 0) > 0.5 else "review",
            "duration": "aggregate",
            "tool": "openrouter.usage",
            "output": f"{summary['cachedTokens']} cached tokens across {summary['modelCalls']} model calls.",
        },
    ]


def build_policy_controls(summary: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "id": "CTRL-CITATION",
            "label": "Deep Agent claims cite scanner evidence",
            "state": "passed" if summary["citationCoverage"] >= 1 else "review",
            "note": f"Citation coverage is {summary['citationCoverage']:.0%} across the validation set.",
        },
        {
            "id": "CTRL-CI",
            "label": "Privileged CI paths block permit approval",
            "state": "blocked" if summary["blockedRepos"] else "passed",
            "note": f"{summary['blockedRepos']} repositories have blocked permit decisions.",
        },
        {
            "id": "CTRL-CACHE",
            "label": "Prompt caching lowers repeated-run cost",
            "state": "passed" if (summary.get("cacheHitRatio") or 0) > 0.5 else "review",
            "note": f"Cache hit ratio is {percent(summary.get('cacheHitRatio'))}.",
        },
        {
            "id": "CTRL-EVAL",
            "label": "Fixture eval suite protects scanner regressions",
            "state": "passed" if summary.get("evalPassRate") == 1 else "review",
            "note": f"Latest eval pass rate is {percent(summary.get('evalPassRate'))}.",
        },
    ]


def normalize_status(status: str | None) -> str:
    if status == "needs_review":
        return "needs-review"
    if status in {"approved", "blocked"}:
        return status
    return "needs-review"


def severity_for(status: str, rules: list[str], findings_count: int) -> str:
    if status == "blocked":
        return "critical" if "ci-pr-target-write-token" in rules else "high"
    if findings_count == 0:
        return "low"
    if "ci-write-permission" in rules or "ci-secret-reference" in rules:
        return "high"
    return "medium"


def capability_for(rules: list[str], status: str) -> str:
    joined = " ".join(rules)
    if "ci-" in joined:
        return "ci trust boundary"
    if "mcp-" in joined:
        return "mcp tool boundary"
    if "prompt-" in joined:
        return "instruction boundary"
    if status == "approved":
        return "clean permit"
    return "policy review"


def title_for(repo_id: str, status: str, findings_count: int, rules: list[str]) -> str:
    if findings_count == 0:
        return f"{repo_id} passed without deterministic findings"
    primary_rules = ", ".join(rules[:2])
    return f"{repo_id} {status.replace('-', ' ')}: {primary_rules}"


def confidence_for(citation_passed: bool, expectation_passed: bool) -> int:
    if citation_passed and expectation_passed:
        return 96
    if citation_passed or expectation_passed:
        return 84
    return 70


def owner_for(status: str, capability: str) -> str:
    if status == "blocked":
        return "AppSec"
    if capability == "ci trust boundary":
        return "DevEx"
    if status == "approved":
        return "Platform"
    return "AI Platform"


def age_label(commit_date: str | None) -> str:
    if not commit_date:
        return "unknown"
    try:
        parsed = datetime.fromisoformat(commit_date.replace("Z", "+00:00"))
    except ValueError:
        return commit_date[:10]
    return f"{parsed:%b} {parsed.day}"


def summary_for(result: dict[str, Any], repo_id: str, status: str) -> str:
    return (
        f"{repo_id} finished with permit status {status.replace('-', ' ')}. "
        f"{result.get('findings_count', 0)} findings, {result.get('graph_paths_count', 0)} graph paths, "
        f"and {result.get('controls_count', 0)} controls were checked."
    )


def evidence_for(
    rules: list[str],
    findings_count: int,
    graph_paths: int,
    controls: int,
) -> str:
    if rules:
        return f"Rules present: {', '.join(rules)}. Findings={findings_count}, paths={graph_paths}, controls={controls}."
    return f"No expected risk rules present. Findings={findings_count}, paths={graph_paths}, controls={controls}."


def remediation_for(status: str, rules: list[str]) -> str:
    joined = " ".join(rules)
    if "ci-pr-target-write-token" in joined:
        return "Split trusted CI from untrusted pull request handling and downgrade token permissions before agent execution."
    if "ci-write-permission" in joined or "ci-secret-reference" in joined:
        return "Review workflow secrets and use least-privilege permissions before allowing agent automation."
    if status == "approved":
        return "Keep scanner and Deep Agent citation checks in CI to preserve this approval state."
    return "Review the cited scanner rules and require owner approval before granting the permit."


def artifacts_for(result: dict[str, Any], validation_path: Path | None) -> list[str]:
    artifacts = [
        relative_path(validation_path) if validation_path else "live-repo-validation-results.json",
    ]
    if validation_path is not None:
        report_path = validation_path.with_name("live-repo-validation-report.md")
        if report_path.exists():
            artifacts.append(relative_path(report_path))
    if result.get("source"):
        artifacts.append(result["source"])
    return artifacts


def trace_ids_for(result: dict[str, Any]) -> list[str]:
    trace_ids = ["trace-artifacts", "trace-citations"]
    if result.get("graph_paths_count", 0):
        trace_ids.append("trace-paths")
    if result.get("model_calls", 0):
        trace_ids.append("trace-cost")
    return trace_ids


def percent(value: float | None) -> str:
    if value is None:
        return "not available"
    return f"{value:.0%}"


def relative_path(path: Path | None) -> str:
    if path is None:
        return ""
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


if __name__ == "__main__":
    main()
