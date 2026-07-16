# PermitGraph Agent Guide

## Project Purpose

Agent Permit Office, branded as PermitGraph in developer-facing docs, is a local permit gate for AI agents. It checks whether a repository should allow agents, MCP servers, CI workflows, credentials, memory, or production tools before access is expanded.

## Source Of Truth

- Deterministic scanner artifacts are the source of truth.
- Deep Agent output explains scanner artifacts and checks citation grounding.
- Do not create findings from model prose alone.
- Do not execute target repository agent code, MCP servers, CI workflows, package scripts, or external tools during scanner work.

## Main Review Flow

1. Run or inspect `uv run agent-permit scan . --ci`.
2. Read `.agent-permit/runs/<run_id>/summary.md`.
3. Confirm status in `.agent-permit/runs/<run_id>/permit.yaml`.
4. Inspect `.agent-permit/runs/<run_id>/raw-findings.json`.
5. Inspect `.agent-permit/runs/<run_id>/graph-paths.json`.
6. Use Deep Agent investigation only after scanner artifacts exist.

## Important Artifacts

- `summary.md`: human-readable scan result.
- `risk-report.md`: expanded risk explanation.
- `permit.yaml`: deterministic permit status.
- `raw-findings.json`: normalized finding records.
- `graph-paths.json`: source-to-sink paths.
- `controls.json`: controls evaluated before approval.
- `run-metrics.json`: timing and usage metadata.
- `agent-investigation.md`: optional cited Deep Agent report.

## Safe Defaults

- Keep `.agent-permit/` generated runs untracked unless intentionally exporting sanitized samples.
- Keep `.env` and `.env.local` untracked.
- Prefer JSON/YAML artifacts for automation.
- Prefer Markdown artifacts for reviewer explanation.
- Treat proof packs as sensitive until manually reviewed.

## Docs

- Human docs live in `docs-site/`.
- Research and planning archives live in `docs/`.
- AI-readable docs start with `llms.txt`, this file, `docs/ai-analysis-guide.md`, and `docs/artifact-reference.md`.

## Validation

Use these checks after implementation work:

```bash
uv run pytest -q
python3 tools/release_check.py
```

For docs-only work:

```bash
cd docs-site
bun run build
```

## Product validation gate

- Unit tests are structural evidence only. Before review or merge readiness, run the committed `tabellio.validation.json` against the exact candidate commit with `tabellio-validate gate`.
- Schema, semantic, workflow, operational, and security evidence must pass. `blocked` is not `passed`; a new commit invalidates earlier evidence.
- Preserve PermitGraph's boundary: validators may scan committed fixtures and this repository, but never execute target repository code, MCP servers, target workflows, or paid model providers.
- Keep validation external cost at zero. Upload generated evidence from CI; do not commit it.
- Track rollout and failures in Plane item `APO-120`.
