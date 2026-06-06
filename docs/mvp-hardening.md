# MVP Hardening

Date: 2026-06-06

## Delivered

- central deterministic rule registry
- `agent-permit rules` catalog command
- fixture test proving emitted finding rule IDs are registered
- critic now uses the registry instead of its own copied rule list
- self-scan command for the repository outside fixture-only demos

## Why

Rule IDs become product surface once reports, CI summaries, SARIF, and Deep Agent citations depend on them. Centralizing the registry reduces drift and makes future SARIF output safer because `ruleId` values need stable identity.

## Commands

List all rules:

```bash
uv run agent-permit rules
```

List CI scanner rules:

```bash
uv run agent-permit rules --scanner ci_workflows
```

Self-scan this repo while excluding intentional fixtures:

```bash
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
```

## Current Boundary

The registry is authoritative for known deterministic rule IDs. Scanner implementations still hold full rule text, risk wording, and recommendations. Later hardening can move full rule metadata into the registry once rule copy stabilizes.
