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

## Open Source Live Demo

Use this when showing the full MVP path against recent public agent and MCP repos:

```bash
export OPENROUTER_API_KEY=<key>
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 \
uv run --extra deep-agent --extra phoenix agent-permit open-source-demo \
  docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation \
  --run-id open-source-live-demo \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

Fast dry run without model spend:

```bash
uv run agent-permit open-source-demo docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation \
  --run-id open-source-demo-prep \
  --skip-live
```

Open:

```text
.agent-permit/open-source-demos/<run_id>/open-source-demo-report.html
.agent-permit/open-source-demos/<run_id>/open-source-demo-report.md
.agent-permit/open-source-demos/<run_id>/open-source-demo-results.json
```
