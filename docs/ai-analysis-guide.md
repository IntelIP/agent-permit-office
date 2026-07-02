# AI Analysis Guide

This guide tells AI agents how to analyze PermitGraph output without inventing findings or leaking sensitive data.

## What This Is

PermitGraph scans repositories before AI agents receive tools, credentials, memory, CI permissions, or production access.

The deterministic scanner is the source of truth. Deep Agent investigation is an explanation and citation layer over existing scanner artifacts.

## When To Use It

Use this guide when an AI agent is asked to:

- summarize a PermitGraph run
- explain why a repository is blocked or needs review
- inspect generated artifacts
- compare expected and actual findings
- draft reviewer-facing remediation

## Review Order

1. Read `summary.md`.
2. Read `permit.yaml`.
3. Read `raw-findings.json`.
4. Read `graph-paths.json`.
5. Read `controls.json` if present.
6. Read `agent-investigation.md` only after deterministic evidence is understood.

## How To Analyze Status

`approved` means no configured agent-access risk matched in this scanner run.

`needs_review` means a reviewer must inspect evidence before unattended access continues.

`blocked` means unattended agent access should stop until remediation or an explicit exception exists.

## How To Explain Findings

Use plain English:

- name the repository or file
- name the access path
- explain the reviewer decision
- cite scanner evidence
- describe the next action

Do not leave raw rule IDs as the only explanation.

## What Not To Do

- Do not create new findings from model intuition.
- Do not claim a repository is safe beyond the configured scanner scope.
- Do not publish generated artifacts without redaction review.
- Do not reveal raw secret values.
- Do not execute repository code, MCP servers, CI workflows, package scripts, or external tools to prove a scanner result.

## Useful Commands

```bash
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
uv run agent-permit rules
uv run --extra deep-agent agent-permit investigate .agent-permit/runs/<run_id>
```

## Related Docs

- `AGENTS.md`
- `llms.txt`
- `docs/artifact-reference.md`
- `docs/deep-agent-investigator.md`
- `docs/scanner-and-model-plan.md`
