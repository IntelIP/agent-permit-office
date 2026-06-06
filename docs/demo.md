# Demo

Use the included fixtures for the first product demo.

## Safe Agent

```bash
uv run agent-permit scan tests/fixtures/safe-agent --ci --run-id demo-safe
```

Expected:

```text
Permit status: approved
CI mode: on
```

Artifacts:

```text
tests/fixtures/safe-agent/.agent-permit/runs/demo-safe/
```

## Risky GitHub Actions Agent

```bash
uv run agent-permit scan tests/fixtures/risky-ci-agent --ci --run-id demo-risky || true
```

Expected:

```text
Permit status: blocked
CI mode: on
```

Open:

```text
tests/fixtures/risky-ci-agent/.agent-permit/runs/demo-risky/summary.md
tests/fixtures/risky-ci-agent/.agent-permit/runs/demo-risky/risk-report.md
tests/fixtures/risky-ci-agent/.agent-permit/runs/demo-risky/permit.yaml
```

The risky fixture proves the MVP value path:

- detects agent execution in privileged PR workflow context
- detects write-all workflow permissions
- connects workflow facts to a deterministic `blocked` permit
- writes PR-readable and machine-readable artifacts

## Risky MCP Agent

```bash
uv run agent-permit scan tests/fixtures/risky-mcp-agent --ci --run-id demo-mcp || true
```

Expected:

```text
Permit status: needs_review
CI mode: on
```

This fixture proves the MCP credential path:

- detects an MCP server launched through a package runner
- detects credential references wired into MCP environment config
- avoids writing raw secret values into artifacts

## Static Only

The MVP performs deterministic static scanning only. It does not execute MCP servers, tools, agent code, workflows, or package scripts.

## Self-Scan

This repository contains intentionally risky fixtures. Exclude them when scanning the repo itself:

```bash
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
```

The GitHub Action workflow uses the same exclusion.
