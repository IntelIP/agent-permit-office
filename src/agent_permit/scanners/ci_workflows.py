from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from agent_permit.models import (
    Confidence,
    EvidenceLocation,
    FileInventory,
    FileKind,
    Finding,
    FindingCategory,
    Severity,
)
from agent_permit.redaction import redact_secret_text


WRITE_PERMISSION_RE = re.compile(
    r"^\s*(?P<scope>[A-Za-z0-9_-]+)\s*:\s*write\s*(?:#.*)?$",
    re.IGNORECASE,
)
SECRETS_REF_RE = re.compile(r"\$\{\{\s*secrets\.[A-Za-z0-9_]+\s*\}\}")
CHECKOUT_RE = re.compile(r"uses\s*:\s*actions/checkout@", re.IGNORECASE)
HEAD_REF_RE = re.compile(r"github\.event\.pull_request\.head", re.IGNORECASE)


@dataclass(frozen=True)
class WorkflowSignals:
    pull_request_target_line: int | None = None
    write_all_line: int | None = None
    write_permission_lines: tuple[tuple[int, str], ...] = ()
    secret_ref_lines: tuple[int, ...] = ()
    checkout_lines: tuple[int, ...] = ()
    head_ref_lines: tuple[int, ...] = ()

    @property
    def has_write_permission(self) -> bool:
        return self.write_all_line is not None or bool(self.write_permission_lines)


class CiWorkflowScanner:
    def scan(
        self,
        root_path: Path,
        *,
        scan_run_id: str,
        inventory: FileInventory,
    ) -> list[Finding]:
        root_path = root_path.resolve()
        findings: list[Finding] = []

        for entry in inventory.files:
            if entry.kind != FileKind.CI_WORKFLOW:
                continue
            workflow_path = root_path / entry.path
            text = workflow_path.read_text(encoding="utf-8", errors="replace")
            findings.extend(_scan_workflow_text(entry.path, text))

        return findings


def _scan_workflow_text(rel_path: str, text: str) -> list[Finding]:
    lines = text.splitlines()
    signals = _workflow_signals(lines)
    findings: list[Finding] = []

    if signals.pull_request_target_line is not None:
        findings.append(_pull_request_target_finding(rel_path, signals, lines))
    if signals.write_all_line is not None:
        findings.append(_write_all_finding(rel_path, signals, lines))
    for line_number, scope in signals.write_permission_lines:
        findings.append(_write_permission_finding(rel_path, line_number, scope, lines))
    for line_number in signals.secret_ref_lines:
        findings.append(_secret_ref_finding(rel_path, line_number, lines))
    if (
        signals.pull_request_target_line is not None
        and signals.has_write_permission
    ):
        findings.append(_pr_target_write_token_finding(rel_path, signals, lines))
    if (
        signals.pull_request_target_line is not None
        and signals.checkout_lines
        and signals.head_ref_lines
    ):
        findings.append(_untrusted_checkout_finding(rel_path, signals, lines))

    return findings


def _workflow_signals(lines: list[str]) -> WorkflowSignals:
    pull_request_target_line: int | None = None
    write_all_line: int | None = None
    write_permission_lines: list[tuple[int, str]] = []
    secret_ref_lines: list[int] = []
    checkout_lines: list[int] = []
    head_ref_lines: list[int] = []

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if re.match(r"^pull_request_target\s*:", stripped):
            pull_request_target_line = pull_request_target_line or line_number
        if re.match(r"^permissions\s*:\s*write-all\s*(?:#.*)?$", stripped):
            write_all_line = write_all_line or line_number

        write_permission_match = WRITE_PERMISSION_RE.match(line)
        if write_permission_match is not None:
            scope = write_permission_match.group("scope")
            if scope != "permissions":
                write_permission_lines.append((line_number, scope))

        if SECRETS_REF_RE.search(line):
            secret_ref_lines.append(line_number)
        if CHECKOUT_RE.search(line):
            checkout_lines.append(line_number)
        if HEAD_REF_RE.search(line):
            head_ref_lines.append(line_number)

    return WorkflowSignals(
        pull_request_target_line=pull_request_target_line,
        write_all_line=write_all_line,
        write_permission_lines=tuple(write_permission_lines),
        secret_ref_lines=tuple(secret_ref_lines),
        checkout_lines=tuple(checkout_lines),
        head_ref_lines=tuple(head_ref_lines),
    )


def _pull_request_target_finding(
    rel_path: str,
    signals: WorkflowSignals,
    lines: list[str],
) -> Finding:
    line_number = signals.pull_request_target_line or 1
    return Finding(
        id=f"finding:ci-pull-request-target:{rel_path}:{line_number}",
        rule_id="ci-pull-request-target",
        title="Workflow uses pull_request_target",
        severity=Severity.HIGH,
        category=FindingCategory.RUNTIME_POLICY,
        evidence=[_evidence(rel_path, line_number, lines)],
        risk=(
            "pull_request_target runs in the base repository context and can "
            "expose privileged tokens or secrets to automation that handles PRs."
        ),
        recommendation=(
            "Use pull_request for untrusted code, or tightly gate all jobs that "
            "run under pull_request_target."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _write_all_finding(
    rel_path: str,
    signals: WorkflowSignals,
    lines: list[str],
) -> Finding:
    line_number = signals.write_all_line or 1
    return Finding(
        id=f"finding:ci-write-all-permissions:{rel_path}:{line_number}",
        rule_id="ci-write-all-permissions",
        title="Workflow grants write-all permissions",
        severity=Severity.HIGH,
        category=FindingCategory.RUNTIME_POLICY,
        evidence=[_evidence(rel_path, line_number, lines)],
        risk="write-all grants broad repository mutation capability to workflow jobs.",
        recommendation=(
            "Replace write-all with least-privilege permissions scoped to the "
            "job that needs them."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _write_permission_finding(
    rel_path: str,
    line_number: int,
    scope: str,
    lines: list[str],
) -> Finding:
    return Finding(
        id=f"finding:ci-write-permission:{rel_path}:{line_number}:{scope}",
        rule_id="ci-write-permission",
        title="Workflow grants write permission",
        severity=Severity.MEDIUM,
        category=FindingCategory.RUNTIME_POLICY,
        evidence=[_evidence(rel_path, line_number, lines)],
        risk=f"The workflow grants {scope}: write, enabling repository mutation.",
        recommendation=(
            "Confirm this permission is required and restrict it to the "
            "smallest job scope."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _secret_ref_finding(
    rel_path: str,
    line_number: int,
    lines: list[str],
) -> Finding:
    return Finding(
        id=f"finding:ci-secret-reference:{rel_path}:{line_number}",
        rule_id="ci-secret-reference",
        title="Workflow references repository secrets",
        severity=Severity.MEDIUM,
        category=FindingCategory.CREDENTIAL_SCOPE,
        evidence=[_evidence(rel_path, line_number, lines)],
        risk=(
            "Workflow steps reference repository secrets, so job trigger and "
            "permission controls determine whether automation can use them."
        ),
        recommendation=(
            "Verify the workflow only exposes secrets to trusted events and "
            "least-privilege jobs."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _pr_target_write_token_finding(
    rel_path: str,
    signals: WorkflowSignals,
    lines: list[str],
) -> Finding:
    line_number = signals.write_all_line or signals.write_permission_lines[0][0]
    return Finding(
        id=f"finding:ci-pr-target-write-token:{rel_path}:{line_number}",
        rule_id="ci-pr-target-write-token",
        title="PR-target workflow has write token permissions",
        severity=Severity.CRITICAL,
        category=FindingCategory.RUNTIME_POLICY,
        evidence=[
            _evidence(rel_path, signals.pull_request_target_line or 1, lines),
            _evidence(rel_path, line_number, lines),
        ],
        risk=(
            "A pull_request_target workflow with write permissions can run "
            "automation in a privileged repository context while processing PRs."
        ),
        recommendation=(
            "Block agent execution until the workflow uses least-privilege "
            "permissions and trusted-code checkout semantics."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _untrusted_checkout_finding(
    rel_path: str,
    signals: WorkflowSignals,
    lines: list[str],
) -> Finding:
    line_number = signals.head_ref_lines[0]
    return Finding(
        id=f"finding:ci-pr-target-head-checkout:{rel_path}:{line_number}",
        rule_id="ci-pr-target-head-checkout",
        title="PR-target workflow checks out pull request head code",
        severity=Severity.CRITICAL,
        category=FindingCategory.RUNTIME_POLICY,
        evidence=[
            _evidence(rel_path, signals.pull_request_target_line or 1, lines),
            _evidence(rel_path, signals.checkout_lines[0], lines),
            _evidence(rel_path, line_number, lines),
        ],
        risk=(
            "Checking out PR head code inside pull_request_target can execute "
            "untrusted code with privileged workflow context."
        ),
        recommendation=(
            "Do not check out untrusted PR head code in pull_request_target jobs "
            "that have secrets or write permissions."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _evidence(rel_path: str, line_number: int, lines: list[str]) -> EvidenceLocation:
    line = lines[line_number - 1] if 0 <= line_number - 1 < len(lines) else ""
    return EvidenceLocation(
        path=rel_path,
        line_start=line_number,
        line_end=line_number,
        redacted_snippet=redact_secret_text(line.strip()),
    )
