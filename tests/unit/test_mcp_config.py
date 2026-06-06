from agent_permit.scanners.file_inventory import FileInventoryScanner
from agent_permit.scanners.mcp_config import McpConfigScanner


def test_mcp_config_scanner_detects_stdio_server_credential_and_unpinned_package(
    tmp_path,
) -> None:
    (tmp_path / ".mcp.json").write_text(
        """{
  "mcpServers": {
    "github-tools": {
      "command": "npx",
      "args": ["-y", "github-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
"""
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-mcp")

    result = McpConfigScanner().scan(
        tmp_path,
        scan_run_id="run-mcp",
        inventory=inventory,
    )
    payload = result.agent_bom.model_dump_json() + "".join(
        finding.model_dump_json() for finding in result.findings
    )

    assert len(result.agent_bom.mcp_servers) == 1
    assert result.agent_bom.mcp_servers[0].name == "github-tools"
    assert result.agent_bom.mcp_servers[0].transport == "stdio"
    assert result.agent_bom.mcp_servers[0].command == "npx"
    assert len(result.agent_bom.credential_refs) == 1
    assert result.agent_bom.credential_refs[0].name == "GITHUB_TOKEN"
    assert result.agent_bom.credential_refs[0].provider == "github"
    assert {finding.rule_id for finding in result.findings} == {
        "mcp-stdio-credential-ref",
        "mcp-unpinned-package-command",
    }
    assert "${GITHUB_TOKEN}" not in payload


def test_mcp_config_scanner_detects_remote_server_without_stdio_findings(
    tmp_path,
) -> None:
    (tmp_path / "mcp.json").write_text(
        """{
  "servers": {
    "docs": {
      "url": "https://example.com/mcp"
    }
  }
}
"""
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-remote")

    result = McpConfigScanner().scan(
        tmp_path,
        scan_run_id="run-remote",
        inventory=inventory,
    )

    assert len(result.agent_bom.mcp_servers) == 1
    assert result.agent_bom.mcp_servers[0].transport == "remote_http"
    assert result.agent_bom.mcp_servers[0].url == "https://example.com/mcp"
    assert result.agent_bom.credential_refs == []
    assert result.findings == []


def test_mcp_config_scanner_allows_pinned_package_runner(tmp_path) -> None:
    (tmp_path / "claude_desktop_config.json").write_text(
        """{
  "mcpServers": {
    "github-tools": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github@1.2.3"]
    }
  }
}
"""
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-pinned")

    result = McpConfigScanner().scan(
        tmp_path,
        scan_run_id="run-pinned",
        inventory=inventory,
    )

    assert len(result.agent_bom.mcp_servers) == 1
    assert result.findings == []


def test_mcp_config_scanner_reports_invalid_json(tmp_path) -> None:
    (tmp_path / ".mcp.json").write_text('{"mcpServers": {\n')
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-invalid")

    result = McpConfigScanner().scan(
        tmp_path,
        scan_run_id="run-invalid",
        inventory=inventory,
    )

    assert result.agent_bom.mcp_servers == []
    assert len(result.findings) == 1
    assert result.findings[0].rule_id == "mcp-config-invalid-json"
    assert result.findings[0].evidence[0].line_start == 2
