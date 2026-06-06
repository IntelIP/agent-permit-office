from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from pydantic import ValidationError

from agent_permit.models import (
    Finding,
    FindingBaseline,
    FindingBaselineEntry,
    FindingDiffReport,
)


BASELINE_FILE = "finding-baseline.json"
DIFF_JSON_FILE = "finding-diff.json"
DIFF_MARKDOWN_FILE = "finding-diff.md"
BASELINE_VERSION = 1


def build_finding_baseline(
    findings: Sequence[Finding],
    *,
    scan_run_id: str,
    generated_at: datetime | None = None,
) -> FindingBaseline:
    return FindingBaseline(
        version=BASELINE_VERSION,
        scan_run_id=scan_run_id,
        generated_at=(generated_at or datetime.now(timezone.utc)).astimezone(timezone.utc),
        findings=sorted(
            (_entry_from_finding(finding) for finding in findings),
            key=lambda entry: entry.key,
        ),
    )


def write_finding_baseline(
    baseline: FindingBaseline,
    output_path: Path,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _write_json(output_path, baseline.model_dump(mode="json"))
    return output_path


def load_finding_baseline(path: Path) -> FindingBaseline:
    if not path.is_file():
        raise FileNotFoundError(f"baseline file not found: {path}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return FindingBaseline.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        raise ValueError(f"invalid finding baseline: {path}: {exc}") from exc


def diff_findings(
    *,
    baseline: FindingBaseline,
    current_findings: Sequence[Finding],
    scan_run_id: str,
    baseline_path: Path,
) -> FindingDiffReport:
    baseline_by_key = {entry.key: entry for entry in baseline.findings}
    current_by_key = {
        entry.key: entry
        for entry in (
            _entry_from_finding(finding)
            for finding in current_findings
        )
    }
    baseline_keys = set(baseline_by_key)
    current_keys = set(current_by_key)
    return FindingDiffReport(
        scan_run_id=scan_run_id,
        baseline_path=str(baseline_path),
        baseline_count=len(baseline.findings),
        current_count=len(current_findings),
        new_findings=[
            current_by_key[key] for key in sorted(current_keys - baseline_keys)
        ],
        resolved_findings=[
            baseline_by_key[key] for key in sorted(baseline_keys - current_keys)
        ],
        unchanged_findings=[
            current_by_key[key] for key in sorted(current_keys & baseline_keys)
        ],
    )


def write_finding_diff_artifacts(
    diff_report: FindingDiffReport,
    output_dir: Path,
) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / DIFF_JSON_FILE
    markdown_path = output_dir / DIFF_MARKDOWN_FILE
    _write_json(json_path, diff_report.model_dump(mode="json"))
    markdown_path.write_text(
        build_finding_diff_markdown(diff_report),
        encoding="utf-8",
    )
    return json_path, markdown_path


def build_finding_diff_markdown(
    diff_report: FindingDiffReport,
    *,
    heading_level: int = 1,
) -> str:
    heading = "#" * heading_level
    lines = [
        f"{heading} Finding Diff",
        "",
        f"Baseline: {diff_report.baseline_path}",
        f"Baseline findings: {diff_report.baseline_count}",
        f"Current findings: {diff_report.current_count}",
        f"New findings: {len(diff_report.new_findings)}",
        f"Resolved findings: {len(diff_report.resolved_findings)}",
        f"Unchanged findings: {len(diff_report.unchanged_findings)}",
        "",
    ]
    _append_findings(
        lines,
        "New Findings",
        diff_report.new_findings,
        heading_level=heading_level + 1,
    )
    _append_findings(
        lines,
        "Resolved Findings",
        diff_report.resolved_findings,
        heading_level=heading_level + 1,
    )
    _append_findings(
        lines,
        "Unchanged Findings",
        diff_report.unchanged_findings,
        heading_level=heading_level + 1,
    )
    return "\n".join(lines) + "\n"


def _entry_from_finding(finding: Finding) -> FindingBaselineEntry:
    evidence = finding.evidence[0] if finding.evidence else None
    path = evidence.path if evidence is not None else ""
    line_start = evidence.line_start if evidence is not None else None
    line_end = evidence.line_end if evidence is not None else None
    return FindingBaselineEntry(
        key=_finding_key(finding),
        finding_id=finding.id,
        rule_id=finding.rule_id,
        title=finding.title,
        severity=finding.severity,
        category=finding.category,
        path=path,
        line_start=line_start,
        line_end=line_end,
    )


def _finding_key(finding: Finding) -> str:
    evidence = finding.evidence[0] if finding.evidence else None
    path = evidence.path if evidence is not None else ""
    line = evidence.line_start if evidence is not None else ""
    digest_input = "|".join(
        [
            finding.rule_id,
            path,
            str(line),
            finding.title,
        ]
    ).encode("utf-8")
    return hashlib.sha256(digest_input).hexdigest()


def _append_findings(
    lines: list[str],
    heading: str,
    findings: Sequence[FindingBaselineEntry],
    *,
    heading_level: int,
) -> None:
    heading_prefix = "#" * heading_level
    lines.extend([f"{heading_prefix} {heading}", ""])
    if not findings:
        lines.extend(["none", ""])
        return
    for finding in findings:
        location = finding.path
        if finding.line_start is not None:
            location = f"{location}:{finding.line_start}"
        lines.append(
            f"- [{finding.severity}] {finding.rule_id} at {location}: "
            f"{finding.title}"
        )
    lines.append("")


def _write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
