# GitHub Action

Agent Permit Office ships as a composite GitHub Action through `action.yml`.

## Recommended Workflow

```yaml
name: Agent Permit Office

on:
  pull_request:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Run Agent Permit Office
        uses: OWNER/agent-permit-office@v0.1.0
        with:
          path: .
          artifact-name: agent-permit-office-${{ github.run_id }}
```

For production use, pin `OWNER/agent-permit-office` to a release tag or commit SHA.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `path` | `.` | Repo path to scan, relative to `GITHUB_WORKSPACE` unless absolute. |
| `run-id` | empty | Optional deterministic scan run ID. |
| `exclude` | empty | Newline-separated gitignore-style patterns to skip. |
| `upload-artifacts` | `true` | Upload `.agent-permit/runs/<run_id>/` as a workflow artifact. |
| `artifact-name` | `agent-permit-office` | Artifact name. |

## Outputs

| Output | Meaning |
| --- | --- |
| `exit_code` | Scanner exit code before artifact upload. |
| `artifact_dir` | Absolute path to generated run artifacts. |
| `summary_path` | Absolute path to `summary.md`. |

## Exit Behavior

The action runs:

```bash
agent-permit scan <path> --ci
```

It fails the job when permit status is `needs_review` or `blocked`.

Artifacts still upload before the final failure step, so failed PRs retain:

- `summary.md`
- `risk-report.md`
- `permit.yaml`
- `controls.json`
- `graph-paths.json`
- scanner JSON artifacts

## Excluding Intentional Fixtures

Use `exclude` for intentionally risky fixtures, generated samples, or vendored code that should not affect the permit decision.

```yaml
with:
  path: .
  exclude: |
    tests/fixtures/**
    examples/intentionally-risky/**
```

Default scanner behavior remains strict. Exclusions are opt-in.

## Security Notes

- Use `pull_request`, not `pull_request_target`, for untrusted PR scans.
- Keep workflow permissions at `contents: read` unless a later integration needs more.
- Keep `persist-credentials: false` on checkout unless later steps need push access.
- SARIF upload is intentionally deferred until stable rule IDs and alert behavior are proven.
