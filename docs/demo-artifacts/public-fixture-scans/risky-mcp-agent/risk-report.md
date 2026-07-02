# Agent Permit Office Risk Report

Status: needs_review
Credentials: GITHUB_TOKEN
Findings: 2
Graph paths: 1
Controls: 3

## Top Findings
- [high] mcp-stdio-credential-ref: Stdio MCP server receives credential references (.mcp.json:3)
- [medium] mcp-unpinned-package-command: MCP server package is not version pinned (.mcp.json:3)

## Required Approvals
- Credential-to-MCP boundary control: Require package pinning, allowlist the MCP server, and use least-privilege credentials.
- MCP credential approval gate: Require human approval and least-privilege credential scope.
- MCP package version pinning: Pin MCP package versions before granting credentials.

## Top Paths
- [high] credential -> mcp_server: Credential reference can reach an MCP tool runtime.
