# Open Source Live Validation

Date: 2026-06-07

## Scope

Run the MVP `agent-permit live-validate` path against recent open source agent and MCP repositories.

Validation root:

```text
/tmp/agent-permit-open-source-validation-20260607
```

Command shape:

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 \
uv run --extra deep-agent --extra phoenix agent-permit live-validate <repo> \
  --run-id <run_id> \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

## Candidate Set

Candidate freshness was checked through GitHub repository metadata before shallow clone, then verified locally with `git log -1`.

| Repo | Latest cloned commit | Commit date | Latest message |
| --- | --- | --- | --- |
| [langchain-ai/open-swe](https://github.com/langchain-ai/open-swe) | `5faf190` | 2026-06-06 13:09:31 -0700 | `fix: reject images for text-only models (#1439)` |
| [github/github-mcp-server](https://github.com/github/github-mcp-server) | `457f599` | 2026-06-05 15:04:22 +0100 | `Add confidence parameter to issue mutation MCP tools (#2605)` |
| [mcp-use/mcp-use](https://github.com/mcp-use/mcp-use) | `d7f44dd` | 2026-06-05 09:51:24 -0700 | `chore: update context7 claim (#1666)` |
| [wanxingai/LightAgent](https://github.com/wanxingai/LightAgent) | `220e853` | 2026-06-05 23:00:09 +0800 | `Merge pull request #56 from Oxygen56/fix/tracetools-and-litellm-docs` |
| [CopilotKit/open-multi-agent-canvas](https://github.com/CopilotKit/open-multi-agent-canvas) | `25f20b2` | 2026-06-04 21:59:57 -0500 | `fix: point Copilot Cloud links at the Intelligence dashboard` |

## Live Results

| Repo | Run ID | Harness status | Permit | Findings | Paths | Controls | Citation | Model calls | Tokens | Cached | Cache hit |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |
| `open-swe` | `sprint22-live-open-swe` | passed | needs_review | 2 | 2 | 4 | passed | 3 | 30,631 | 17,183 | 59.69% |
| `github-mcp-server` | `sprint22-live-github-mcp-server` | passed | needs_review | 22 | 9 | 31 | passed | 3 | 33,795 | 18,059 | 57.86% |
| `mcp-use` | `sprint22-live-mcp-use` | passed | blocked | 84 | 22 | 105 | passed | 3 | 50,120 | 26,637 | 55.70% |
| `LightAgent` | `sprint22-live-lightagent` | passed | approved | 0 | 0 | 0 | passed | 3 | 27,841 | 16,441 | 61.79% |
| `open-multi-agent-canvas` | `sprint22-live-open-multi-agent-canvas-rerun` | passed | approved | 0 | 0 | 0 | passed | 4 | 36,009 | 25,566 | 73.14% |

## Signal Examples

`open-swe` produced a small needs-review case:

- `ci-secret-reference` in `.github/workflows/pr_lint.yml`
- `ci-write-permission` in `.github/workflows/promote_main_to_prod.yml`

`github-mcp-server` produced a broader CI review case:

- `ci-write-permission` across issue automation, code scanning, and Docker publishing workflows
- `ci-secret-reference` across issue automation, code scanning, and Docker publishing workflows

`mcp-use` produced the blocked case:

- 84 deterministic CI findings
- 22 source-to-sink graph paths
- one MCP server in the bill of materials
- 20 credential names in the bill of materials

`LightAgent` and `open-multi-agent-canvas` proved the approved path still generates a citation-checked Deep Agent report.

## Bug Found And Fixed

Initial `open-multi-agent-canvas` validation failed correctly:

```text
Unsupported citation: rule:<rule_id>
```

Cause:

- the model copied the prompt's citation template literally in a zero-finding report
- the deterministic citation critic rejected the placeholder as unsupported

Fix:

- Deep Agent system prompt now forbids literal citation templates such as `[rule:<rule_id>]`
- user prompt now tells zero-rule reports to say no rule citations apply without bracketed placeholders
- unit coverage asserts the system prompt includes this guard

Rerun result:

- `sprint22-live-open-multi-agent-canvas-rerun`
- status: passed
- permit: approved
- citation check: passed

## Assessment

The harness is now useful against real public repos:

- It distinguished approved, needs-review, and blocked outcomes.
- It kept live model assessment bounded to scan artifacts.
- It caught an LLM citation failure before marking a validation passed.
- Prompt caching worked across all runs, with cache-hit ratios from 55.70% to 73.14%.

## Sprint 23 Manifest Runner

The manual validation loop is now productized as:

```bash
uv run --extra deep-agent --extra phoenix agent-permit live-validate-real \
  docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation-20260607 \
  --run-id sprint23-open-source-live \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

Aggregate output:

```text
.agent-permit/live-repo-validations/<run_id>/
  live-repo-validation-results.json
  live-repo-validation-report.md
```

Each repo still writes its own run artifacts:

```text
<repo>/.agent-permit/runs/<run_id>-<repo_id>/live-validation.json
```

The manifest runner checks:

- live validation status
- citation critic result
- expected permit status
- expected rule IDs present
- forbidden rule IDs absent
- aggregate model calls, tokens, cached tokens, and cache-hit ratio

Sprint 23 manifest result:

- run ID: `sprint23-open-source-live`
- status: `passed`
- repos: `5/5`
- total tokens: `218,401`
- input tokens: `209,761`
- cached tokens: `140,970`
- cache hit ratio: `67.21%`
- aggregate artifacts: `.agent-permit/live-repo-validations/sprint23-open-source-live/`

The first manifest run also exposed noisy Phoenix re-registration warnings when multiple live validations ran in one process. Phoenix tracing setup is now idempotent, so repeated repo validations reuse the first tracing config instead of re-registering instrumentation.
