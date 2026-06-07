# Contributing

Agent Permit Office accepts focused contributions that improve scanner accuracy, evidence quality, docs, fixtures, or integrations.

## Development Setup

```bash
uv sync --all-extras --dev
uv run --all-extras pytest
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
```

Run optional live Deep Agent paths only when you intend to spend model tokens:

```bash
export OPENROUTER_API_KEY=<key>
uv run --extra deep-agent agent-permit investigate .agent-permit/runs/<run_id>
```

## Contribution Areas

Good first contribution areas:

- deterministic rule improvements
- false-positive reductions
- fixture coverage
- SARIF output improvements
- GitHub Action hardening
- documentation and demo clarity
- public repo validation manifests

Avoid broad rewrites until the scanner artifact contracts are stable.

## Scanner Contribution Rules

Scanner changes must:

- keep raw secret values out of artifacts
- include file and line evidence when possible
- add or update fixture coverage
- preserve deterministic permit behavior
- keep repo scanning static unless a design doc explicitly changes that boundary

Fixtures belong under `tests/fixtures/`. If a fixture is intentionally risky, make that obvious in its name and expected manifest.

## Deep Agent Contribution Rules

Deep Agent changes must:

- keep deterministic scan artifacts as source of truth
- avoid unbounded raw repo browsing
- preserve citation critic enforcement
- keep live model spend out of normal unit tests
- expose token/cache usage when provider metadata is available

## Pull Request Checklist

Before opening a pull request:

- `uv run --all-extras pytest`
- `uv run agent-permit scan . --ci --exclude "tests/fixtures/**"`
- no `.env.local`, generated `.agent-permit/`, traces, or private reports committed
- README or docs updated when behavior changes
- new rules listed through `uv run agent-permit rules`

## License

By contributing, you agree that your contribution is licensed under the Apache License 2.0.

Do not submit code or artifacts you do not have permission to contribute.
