# Agent Permit Office Summary

Status: blocked
Findings: 4
Graph paths: 1
Controls: 5
Credentials: none

## Top Findings
- [critical] ci-pr-target-write-token at .github/workflows/agent.yml:4
- [high] ci-pull-request-target at .github/workflows/agent.yml:4 (event=pull_request_target)
- [high] ci-write-all-permissions at .github/workflows/agent.yml:7 (event=pull_request_target, scope=write-all)
- [medium] ci-secret-reference at .github/workflows/agent.yml:16 (event=pull_request_target, job=agent-review, secret=GITHUB_TOKEN)

## CI Workflow Groups
- `.github/workflows/agent.yml` / `agent-review`
  - Rules: ci-secret-reference
  - Secret refs: GITHUB_TOKEN
- `.github/workflows/agent.yml` / `workflow`
  - Rules: ci-pr-target-write-token, ci-pull-request-target, ci-write-all-permissions
  - Write scopes: write-all

## Artifacts
- permit.yaml
- risk-report.md
- raw-findings.json
- agent-bom.json
- codebase-map.json
- graph-paths.json
- controls.json
