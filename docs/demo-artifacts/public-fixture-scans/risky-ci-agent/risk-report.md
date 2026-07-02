# Agent Permit Office Risk Report

Status: blocked
Credentials: none
Findings: 4
Graph paths: 1
Controls: 5

## Top Findings
- [critical] ci-pr-target-write-token: PR-target workflow has write token permissions (.github/workflows/agent.yml:4)
- [high] ci-pull-request-target: Workflow uses pull_request_target (.github/workflows/agent.yml:4 (event=pull_request_target))
- [high] ci-write-all-permissions: Workflow grants write-all permissions (.github/workflows/agent.yml:7 (event=pull_request_target, scope=write-all))
- [medium] ci-secret-reference: Workflow references repository secrets (.github/workflows/agent.yml:16 (event=pull_request_target, job=agent-review, secret=GITHUB_TOKEN))

## Required Approvals
- CI least-privilege workflow control: Use trusted PR context and least-privilege workflow permissions.
- Privileged CI boundary control: Remove write permissions or privileged PR context before running agent workflows.

## Top Paths
- [high] workflow_file -> privileged_ci_workflow: Workflow file defines a privileged CI execution context.
