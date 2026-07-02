# Baseline And Diff Mode

Sprint 15 adds deterministic baseline and diff mode for incremental CI adoption.

Use this when a repo already has known findings and you want CI to fail only when a change introduces new agent-permission risk.

## Commands

Create a baseline from a completed scan:

```bash
uv run agent-permit baseline .agent-permit/runs/<run_id> --output .agent-permit/finding-baseline.json
```

Compare completed scan artifacts against a baseline:

```bash
uv run agent-permit diff .agent-permit/runs/<run_id> --baseline .agent-permit/finding-baseline.json
```

Scan and compare in one run:

```bash
uv run agent-permit scan . --ci --baseline .agent-permit/finding-baseline.json
```

Scan and fail CI only on new findings:

```bash
uv run agent-permit scan . --ci --baseline .agent-permit/finding-baseline.json --ci-new-findings-only
```

## Artifacts

Baseline file:

```text
finding-baseline.json
```

Scan diff artifacts:

```text
.agent-permit/runs/<run_id>/
  finding-diff.json
  finding-diff.md
```

## Matching

Each finding baseline entry contains:

- deterministic finding key
- finding ID
- rule ID
- title
- severity
- category
- file path
- line range

The key is derived from rule ID, first evidence path, first evidence line, and finding title. It intentionally excludes source snippets, secret references, risk prose, and recommendations.

## CI Behavior

Default CI behavior is unchanged:

```bash
uv run agent-permit scan . --ci
```

This still fails when permit status is `needs_review` or `blocked`.

New-only mode is explicit:

```bash
uv run agent-permit scan . --ci --baseline .agent-permit/finding-baseline.json --ci-new-findings-only
```

In this mode:

- inherited findings remain visible in artifacts
- permit status remains unchanged
- CI exits non-zero only when `finding-diff.json` has new findings
- resolved findings are reported but do not fail CI

## GitHub Action

```yaml
permissions:
  contents: read

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: false
      - uses: IntelIP/agent-permit-office@v0.1.0
        with:
          path: .
          baseline: .agent-permit/finding-baseline.json
          ci-new-findings-only: "true"
```

## Safety Boundary

Baseline and diff mode is deterministic. It does not use Deep Agent output, GitHub API calls, hosted state, or LLM judgment. The baseline file is safe to commit because it contains finding metadata and file/line locations, not source snippets or raw secret values.
