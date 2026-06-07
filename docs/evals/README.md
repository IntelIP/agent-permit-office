# Eval Manifests

This directory stores committed eval definitions, not cloned repos.

## Real Repos

`real-repos.json` defines the current public-repo validation set:

- `langchain-ai/open_deep_research`
- `crewAIInc/crewAI-examples`
- `microsoft/autogen`

Clone or refresh the repos separately:

```bash
mkdir -p /tmp/agent-permit-validation
git clone --depth 1 https://github.com/langchain-ai/open_deep_research.git /tmp/agent-permit-validation/open_deep_research
git clone --depth 1 https://github.com/crewAIInc/crewAI-examples.git /tmp/agent-permit-validation/crewAI-examples
git clone --depth 1 https://github.com/microsoft/autogen.git /tmp/agent-permit-validation/autogen
```

Run:

```bash
uv run agent-permit eval-real docs/evals/real-repos.json \
  --repo-root /tmp/agent-permit-validation \
  --run-id local-real-repos
```

The runner scans local checkouts and writes:

```text
.agent-permit/real-repo-evals/<run_id>/
  real-repo-eval-results.json
  real-repo-eval-report.md
```

The manifest intentionally checks expected status and rule families. It does not require exact finding counts because public repos can drift.

## Open Source Live Repos

`open-source-live-repos.json` defines the current live Deep Agent validation set:

- `langchain-ai/open-swe`
- `github/github-mcp-server`
- `mcp-use/mcp-use`
- `wanxingai/LightAgent`
- `CopilotKit/open-multi-agent-canvas`

Clone or refresh the repos separately:

```bash
mkdir -p /tmp/agent-permit-open-source-validation-20260607
git clone --depth 1 --filter=blob:none https://github.com/langchain-ai/open-swe.git /tmp/agent-permit-open-source-validation-20260607/langchain-ai__open-swe
git clone --depth 1 --filter=blob:none https://github.com/github/github-mcp-server.git /tmp/agent-permit-open-source-validation-20260607/github__github-mcp-server
git clone --depth 1 --filter=blob:none https://github.com/mcp-use/mcp-use.git /tmp/agent-permit-open-source-validation-20260607/mcp-use__mcp-use
git clone --depth 1 --filter=blob:none https://github.com/wanxingai/LightAgent.git /tmp/agent-permit-open-source-validation-20260607/wanxingai__LightAgent
git clone --depth 1 --filter=blob:none https://github.com/CopilotKit/open-multi-agent-canvas.git /tmp/agent-permit-open-source-validation-20260607/CopilotKit__open-multi-agent-canvas
```

Run:

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 \
uv run --extra deep-agent --extra phoenix agent-permit live-validate-real \
  docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation-20260607 \
  --run-id local-open-source-live \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

The runner writes:

```text
.agent-permit/live-repo-validations/<run_id>/
  live-repo-validation-results.json
  live-repo-validation-report.md
```

The manifest checks expected permit statuses and expected/forbidden rule families. Each repo still gets its own `.agent-permit/runs/<run_id>-<repo_id>/live-validation.json`.

For demos, use the one-command wrapper:

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 \
uv run --extra deep-agent --extra phoenix agent-permit open-source-demo \
  docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation \
  --run-id local-open-source-demo \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

The wrapper clone/refreshes manifest repos, runs `live-validate-real`, and writes:

```text
.agent-permit/open-source-demos/<run_id>/
  open-source-demo-results.json
  open-source-demo-report.md
  open-source-demo-report.html
  live-validation/
```
