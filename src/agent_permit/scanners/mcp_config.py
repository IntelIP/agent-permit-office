from __future__ import annotations

from dataclasses import dataclass
import json
from json import JSONDecodeError
from pathlib import Path
from typing import Any

from agent_permit.models import (
    AgentBom,
    Confidence,
    CredentialRef,
    EvidenceLocation,
    FileInventory,
    FileKind,
    Finding,
    FindingCategory,
    McpServerSummary,
    Severity,
)


MCP_CONFIG_KEYS = ("mcpServers", "servers")
PACKAGE_RUNNER_COMMANDS = frozenset({"bunx", "npx", "pipx", "uvx"})


@dataclass(frozen=True)
class McpConfigScanResult:
    agent_bom: AgentBom
    findings: list[Finding]


class McpConfigScanner:
    def scan(
        self,
        root_path: Path,
        *,
        scan_run_id: str,
        inventory: FileInventory,
    ) -> McpConfigScanResult:
        root_path = root_path.resolve()
        agent_bom = AgentBom(scan_run_id=scan_run_id)
        findings: list[Finding] = []

        for entry in inventory.files:
            if entry.kind != FileKind.MCP_CONFIG:
                continue
            config_path = root_path / entry.path
            self._scan_config_file(
                config_path,
                entry.path,
                agent_bom,
                findings,
            )

        return McpConfigScanResult(agent_bom=agent_bom, findings=findings)

    def _scan_config_file(
        self,
        config_path: Path,
        rel_path: str,
        agent_bom: AgentBom,
        findings: list[Finding],
    ) -> None:
        raw_text = config_path.read_text(encoding="utf-8")
        try:
            payload = json.loads(raw_text)
        except JSONDecodeError as exc:
            findings.append(_invalid_json_finding(rel_path, exc.lineno))
            return

        server_map = _extract_server_map(payload)
        if not server_map:
            return

        lines = raw_text.splitlines()
        for server_name, server_config in sorted(server_map.items()):
            if not isinstance(server_config, dict):
                continue

            command = _string_or_none(server_config.get("command"))
            url = _string_or_none(
                server_config.get("url")
                or server_config.get("endpoint")
                or server_config.get("serverUrl")
            )
            args = _string_list(server_config.get("args"))
            env_names = _env_ref_names(server_config.get("env"))
            transport = _transport_for(server_config, command, url)
            line_number = _first_line_for_server(lines, server_name, command, url)
            source_fact_id = f"mcp-server:{rel_path}:{server_name}"

            agent_bom.mcp_servers.append(
                McpServerSummary(
                    id=source_fact_id,
                    name=server_name,
                    transport=transport,
                    command=command,
                    url=url,
                    source_fact_ids=[source_fact_id],
                )
            )

            for env_name in env_names:
                credential_fact_id = f"credential-ref:{rel_path}:{server_name}:{env_name}"
                agent_bom.credential_refs.append(
                    CredentialRef(
                        name=env_name,
                        provider=_provider_hint(env_name),
                        scope_hint=_scope_hint(env_name),
                        attached_to=source_fact_id,
                        source=EvidenceLocation(
                            path=rel_path,
                            line_start=line_number,
                            config_key=f"mcpServers.{server_name}.env.{env_name}",
                            redacted_snippet=_server_snippet(
                                server_name,
                                command,
                                url,
                                env_names,
                            ),
                        ),
                    )
                )

            if transport == "stdio" and env_names:
                findings.append(
                    _stdio_credential_finding(
                        rel_path,
                        server_name,
                        command,
                        url,
                        env_names,
                        line_number,
                        source_fact_id,
                    )
                )

            if transport == "stdio" and _uses_unpinned_package_runner(command, args):
                findings.append(
                    _unpinned_package_runner_finding(
                        rel_path,
                        server_name,
                        command,
                        url,
                        env_names,
                        args,
                        line_number,
                        source_fact_id,
                    )
                )


def _extract_server_map(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}

    for key in MCP_CONFIG_KEYS:
        value = payload.get(key)
        if isinstance(value, dict):
            return value

    return {}


def _transport_for(
    server_config: dict[str, Any],
    command: str | None,
    url: str | None,
) -> str:
    explicit_transport = _string_or_none(server_config.get("transport"))
    if command:
        return "stdio"
    if explicit_transport in {"http", "sse", "streamable-http"} or url:
        return "remote_http"
    if explicit_transport:
        return explicit_transport
    return "unknown"


def _env_ref_names(value: Any) -> list[str]:
    if isinstance(value, dict):
        return sorted(str(key) for key in value if isinstance(key, str))
    if isinstance(value, list):
        return sorted(str(item) for item in value if isinstance(item, str))
    return []


def _uses_unpinned_package_runner(command: str | None, args: list[str]) -> bool:
    if command not in PACKAGE_RUNNER_COMMANDS:
        return False

    package_args = [
        arg
        for arg in args
        if not arg.startswith("-") and not arg.startswith("$") and "=" not in arg
    ]
    if not package_args:
        return False

    return not any(_is_pinned_package_spec(arg) for arg in package_args)


def _is_pinned_package_spec(value: str) -> bool:
    if "==" in value:
        return True
    if value.startswith("@"):
        return value.count("@") >= 2
    return "@" in value


def _invalid_json_finding(rel_path: str, line_number: int) -> Finding:
    return Finding(
        id=f"finding:mcp-config-invalid-json:{rel_path}",
        rule_id="mcp-config-invalid-json",
        title="MCP config is not valid JSON",
        severity=Severity.HIGH,
        category=FindingCategory.MCP_RISK,
        evidence=[
            EvidenceLocation(
                path=rel_path,
                line_start=line_number,
                redacted_snippet="MCP config could not be parsed as JSON.",
            )
        ],
        risk="Agent tool exposure cannot be reviewed when MCP config parsing fails.",
        recommendation="Fix the MCP config JSON before approving this agent.",
        confidence=Confidence.HIGH,
        requires_human_review=True,
    )


def _stdio_credential_finding(
    rel_path: str,
    server_name: str,
    command: str | None,
    url: str | None,
    env_names: list[str],
    line_number: int,
    source_fact_id: str,
) -> Finding:
    return Finding(
        id=f"finding:mcp-stdio-credential-ref:{rel_path}:{server_name}",
        rule_id="mcp-stdio-credential-ref",
        title="Stdio MCP server receives credential references",
        severity=Severity.HIGH,
        category=FindingCategory.CREDENTIAL_SCOPE,
        evidence=[
            EvidenceLocation(
                path=rel_path,
                line_start=line_number,
                config_key=f"mcpServers.{server_name}.env",
                redacted_snippet=_server_snippet(
                    server_name,
                    command,
                    url,
                    env_names,
                ),
            )
        ],
        risk=(
            "A locally launched MCP server can receive credential-bearing "
            "environment variables before its package, command, and permissions "
            "are reviewed."
        ),
        recommendation=(
            "Use least-privilege credentials, pin the MCP server package, and "
            "require human approval before enabling this server."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
        source_fact_ids=[source_fact_id],
    )


def _unpinned_package_runner_finding(
    rel_path: str,
    server_name: str,
    command: str | None,
    url: str | None,
    env_names: list[str],
    args: list[str],
    line_number: int,
    source_fact_id: str,
) -> Finding:
    package_name = _first_package_arg(args) or "<unknown>"
    return Finding(
        id=f"finding:mcp-unpinned-package-command:{rel_path}:{server_name}",
        rule_id="mcp-unpinned-package-command",
        title="MCP server package is not version pinned",
        severity=Severity.MEDIUM,
        category=FindingCategory.SUPPLY_CHAIN,
        evidence=[
            EvidenceLocation(
                path=rel_path,
                line_start=line_number,
                package=package_name,
                command=command,
                redacted_snippet=_server_snippet(
                    server_name,
                    command,
                    url,
                    env_names,
                ),
            )
        ],
        risk=(
            "Package-runner MCP commands can install a different server version "
            "over time, changing tool behavior without code review."
        ),
        recommendation=(
            "Pin the MCP package version or vendor the server command before "
            "granting credentials or filesystem access."
        ),
        confidence=Confidence.HIGH,
        requires_human_review=True,
        source_fact_ids=[source_fact_id],
    )


def _server_snippet(
    server_name: str,
    command: str | None,
    url: str | None,
    env_names: list[str],
) -> str:
    redacted = {
        "server": server_name,
        "command": command,
        "url": url,
        "env": env_names,
    }
    return json.dumps(
        {key: value for key, value in redacted.items() if value},
        sort_keys=True,
    )


def _first_package_arg(args: list[str]) -> str | None:
    for arg in args:
        if arg.startswith("-") or arg.startswith("$") or "=" in arg:
            continue
        return arg
    return None


def _first_line_for_server(
    lines: list[str],
    server_name: str,
    command: str | None,
    url: str | None,
) -> int:
    needles = [f'"{server_name}"']
    if command:
        needles.append(f'"{command}"')
    if url:
        needles.append(f'"{url}"')

    for index, line in enumerate(lines, start=1):
        if any(needle in line for needle in needles):
            return index
    return 1


def _provider_hint(env_name: str) -> str | None:
    normalized = env_name.upper()
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
    return None


def _scope_hint(env_name: str) -> str | None:
    normalized = env_name.upper()
    if "TOKEN" in normalized:
        return "token"
    if "KEY" in normalized:
        return "api_key"
    if "SECRET" in normalized:
        return "secret"
    return None


def _string_or_none(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]
