# Post-Deploy Live Smoke

Date: 2026-07-03

Purpose: prove the deployed dashboard, Worker API, Neon database, local CLI runner, deterministic scanner, and Deep Agent handoff are wired together.

## Deployed surfaces

| Surface | URL |
| --- | --- |
| Worker API | `https://agent-permit-worker.hudson-228.workers.dev` |
| Dashboard | `https://agent-permit-dashboard.pages.dev` |
| Docs | `https://agent-permit-docs.hudson-228.workers.dev/docs` |

## Smoke path

1. Open the dashboard.
2. Click `Queue scan`.
3. Paste a GitHub repository URL.
4. Submit the job.
5. Run the local runner from the repo root:

```bash
set -a; source .env; set +a
uv run --extra db --extra deep-agent agent-permit runner --once --deep-agent auto --agent-recursion-limit 20
```

6. Refresh the dashboard and verify the finding count, queue status, and drilldown content changed.

## Expected proof

The Worker should show:

- one new job record
- one matching scan run
- repository source equal to the queued GitHub URL
- findings written by deterministic scanners
- Deep Agent usage attached when `OPENROUTER_API_KEY` is configured

The runner should show:

- `Status: runner_job_complete`
- `Deep Agent: completed (...)` when live model review succeeds
- local artifacts under `.agent-permit/runner-worktrees/<repo-job>/.agent-permit/runs/<job_id>/`

## Release gate

Run before a release tag:

```bash
uv run pytest -q
python3 tools/release_check.py
cd dashboard && bun run lint && bun run build && bun run test:e2e
cd ../docs-site && bun run build
cd ../worker && bun test
```

Do not tag a release if the live smoke job is failed, the dashboard still points to localhost, or proof pack generation reports missing required artifacts.

## Verified smoke on 2026-07-03

Target:

```text
https://github.com/github/github-mcp-server
```

Queued job:

```text
job_46a7dfa7-875b-4c64-bc05-554bc30a3ccd
```

Runner result:

```text
Status: runner_job_complete
Deep Agent: completed (openrouter:anthropic/claude-sonnet-4.6)
```

Worker snapshot after completion:

| Metric | Value |
| --- | ---: |
| repositories | 9 |
| runs | 9 |
| findings | 46 |
| queued jobs | 0 |
| latest run permit status | `needs_review` |
| latest run findings | 20 |
| latest run graph paths | 9 |
| latest run controls | 29 |
| files indexed | 456 |
| model calls | 4 |
| input tokens | 55,073 |
| output tokens | 2,554 |
| total tokens | 57,627 |
| cached tokens | 34,330 |
| cache hit ratio | 0.6234 |

The deployed path is proven for GitHub URL queueing, local clone execution, deterministic scanner output, Deep Agent report generation, model usage ingestion, and dashboard-readable Worker state.
