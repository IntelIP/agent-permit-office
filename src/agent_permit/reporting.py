from __future__ import annotations

from agent_permit.models import ControlReport, Finding, GraphPathReport, Permit


def build_summary_markdown(
    *,
    permit: Permit,
    findings: list[Finding],
    graph_paths: GraphPathReport,
    controls: ControlReport,
) -> str:
    lines = [
        "# Agent Permit Office Summary",
        "",
        f"Status: {permit.status}",
        f"Findings: {len(findings)}",
        f"Graph paths: {len(graph_paths.paths)}",
        f"Controls: {len(controls.controls)}",
        f"Credentials: {', '.join(permit.discovered_credentials) or 'none'}",
        "",
        "## Top Findings",
    ]
    if not findings:
        lines.append("No deterministic findings.")
    else:
        for finding in sorted(findings, key=lambda item: (item.severity, item.rule_id, item.id))[:5]:
            location = "no evidence"
            if finding.evidence:
                evidence = finding.evidence[0]
                location = evidence.path
                if evidence.line_start is not None:
                    location = f"{evidence.path}:{evidence.line_start}"
                context = _evidence_context(evidence)
                if context:
                    location = f"{location} ({context})"
            lines.append(f"- [{finding.severity}] {finding.rule_id} at {location}")

    workflow_groups = _workflow_groups(findings)
    lines.extend(["", "## CI Workflow Groups"])
    if not workflow_groups:
        lines.append("No CI workflow findings.")
    else:
        for group in workflow_groups:
            lines.append(f"- `{group['path']}` / `{group['job']}`")
            lines.append(f"  - Rules: {', '.join(group['rules'])}")
            if group["scopes"]:
                lines.append(f"  - Write scopes: {', '.join(group['scopes'])}")
            if group["secrets"]:
                lines.append(f"  - Secret refs: {', '.join(group['secrets'])}")

    lines.extend(["", "## Artifacts"])
    for artifact_name in (
        "permit.yaml",
        "risk-report.md",
        "raw-findings.json",
        "agent-bom.json",
        "codebase-map.json",
        "graph-paths.json",
        "controls.json",
        "policy-evaluation.json",
    ):
        lines.append(f"- {artifact_name}")

    return "\n".join(lines) + "\n"


def _workflow_groups(findings: list[Finding]) -> list[dict[str, list[str] | str]]:
    grouped: dict[tuple[str, str], dict[str, set[str] | str]] = {}
    for finding in findings:
        if not finding.rule_id.startswith("ci-"):
            continue
        for evidence in finding.evidence:
            path = evidence.path
            job = evidence.workflow_job or "workflow"
            group = grouped.setdefault(
                (path, job),
                {
                    "job": job,
                    "path": path,
                    "rules": set(),
                    "scopes": set(),
                    "secrets": set(),
                },
            )
            _cast_set(group["rules"]).add(finding.rule_id)
            if evidence.permission_scope:
                _cast_set(group["scopes"]).add(evidence.permission_scope)
            if evidence.secret_name:
                _cast_set(group["secrets"]).add(evidence.secret_name)

    return [
        {
            "job": str(group["job"]),
            "path": str(group["path"]),
            "rules": sorted(_cast_set(group["rules"])),
            "scopes": sorted(_cast_set(group["scopes"])),
            "secrets": sorted(_cast_set(group["secrets"])),
        }
        for _key, group in sorted(grouped.items())
    ]


def _cast_set(value: object) -> set[str]:
    return value if isinstance(value, set) else set()


def _evidence_context(evidence: object) -> str:
    parts = []
    for label, attr in (
        ("event", "workflow_event"),
        ("job", "workflow_job"),
        ("scope", "permission_scope"),
        ("secret", "secret_name"),
    ):
        value = getattr(evidence, attr, None)
        if value:
            parts.append(f"{label}={value}")
    note = getattr(evidence, "context_note", None)
    if note and "maintenance-workflow heuristic" in note:
        parts.append("maintenance")
    return ", ".join(parts)
