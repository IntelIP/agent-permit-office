from __future__ import annotations

from dataclasses import dataclass

from agent_permit.models import FindingCategory, Severity


@dataclass(frozen=True)
class RuleDefinition:
    rule_id: str
    scanner: str
    title: str
    default_severity: Severity
    category: FindingCategory


RULE_DEFINITIONS = (
    RuleDefinition(
        rule_id="ci-pr-target-head-checkout",
        scanner="ci_workflows",
        title="PR-target workflow checks out pull request head code",
        default_severity=Severity.CRITICAL,
        category=FindingCategory.RUNTIME_POLICY,
    ),
    RuleDefinition(
        rule_id="ci-pr-target-write-token",
        scanner="ci_workflows",
        title="PR-target workflow has write token permissions",
        default_severity=Severity.CRITICAL,
        category=FindingCategory.RUNTIME_POLICY,
    ),
    RuleDefinition(
        rule_id="ci-pull-request-target",
        scanner="ci_workflows",
        title="Workflow uses pull_request_target",
        default_severity=Severity.HIGH,
        category=FindingCategory.RUNTIME_POLICY,
    ),
    RuleDefinition(
        rule_id="ci-secret-reference",
        scanner="ci_workflows",
        title="Workflow references repository secrets",
        default_severity=Severity.MEDIUM,
        category=FindingCategory.CREDENTIAL_SCOPE,
    ),
    RuleDefinition(
        rule_id="ci-write-all-permissions",
        scanner="ci_workflows",
        title="Workflow grants write-all permissions",
        default_severity=Severity.HIGH,
        category=FindingCategory.RUNTIME_POLICY,
    ),
    RuleDefinition(
        rule_id="ci-write-permission",
        scanner="ci_workflows",
        title="Workflow grants write permission",
        default_severity=Severity.MEDIUM,
        category=FindingCategory.RUNTIME_POLICY,
    ),
    RuleDefinition(
        rule_id="mcp-config-invalid-json",
        scanner="mcp_config",
        title="MCP config is not valid JSON",
        default_severity=Severity.HIGH,
        category=FindingCategory.MCP_RISK,
    ),
    RuleDefinition(
        rule_id="mcp-stdio-credential-ref",
        scanner="mcp_config",
        title="Stdio MCP server receives credential references",
        default_severity=Severity.HIGH,
        category=FindingCategory.CREDENTIAL_SCOPE,
    ),
    RuleDefinition(
        rule_id="mcp-unpinned-package-command",
        scanner="mcp_config",
        title="MCP server package is not version pinned",
        default_severity=Severity.MEDIUM,
        category=FindingCategory.SUPPLY_CHAIN,
    ),
    RuleDefinition(
        rule_id="prompt-approval-bypass",
        scanner="prompt_instructions",
        title="Instruction attempts to bypass approval",
        default_severity=Severity.HIGH,
        category=FindingCategory.PROMPT_RISK,
    ),
    RuleDefinition(
        rule_id="prompt-credential-exfiltration",
        scanner="prompt_instructions",
        title="Instruction attempts credential or source-code exfiltration",
        default_severity=Severity.CRITICAL,
        category=FindingCategory.PROMPT_RISK,
    ),
    RuleDefinition(
        rule_id="prompt-hidden-instruction",
        scanner="prompt_instructions",
        title="Instruction attempts to hide itself from review",
        default_severity=Severity.HIGH,
        category=FindingCategory.PROMPT_RISK,
    ),
    RuleDefinition(
        rule_id="prompt-ignore-instructions",
        scanner="prompt_instructions",
        title="Instruction attempts to ignore higher-priority instructions",
        default_severity=Severity.HIGH,
        category=FindingCategory.PROMPT_RISK,
    ),
    RuleDefinition(
        rule_id="prompt-safety-disable",
        scanner="prompt_instructions",
        title="Instruction attempts to disable safety checks",
        default_severity=Severity.HIGH,
        category=FindingCategory.PROMPT_RISK,
    ),
)

RULES_BY_ID = {rule.rule_id: rule for rule in RULE_DEFINITIONS}
DETERMINISTIC_RULE_IDS = frozenset(RULES_BY_ID)


def is_known_rule_id(rule_id: str) -> bool:
    return rule_id in RULES_BY_ID
