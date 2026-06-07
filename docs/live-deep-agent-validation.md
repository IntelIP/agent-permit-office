# Live Deep Agent Validation

Date: 2026-06-06

## Scope

Validate the required live Deep Agent product path with OpenRouter Claude Sonnet 4.6, prompt/response cache controls, bounded recursion, and deterministic citation checking.

## Fixture

```bash
uv run agent-permit scan tests/fixtures/risky-ci-agent --run-id sprint19-live-risky-ci
```

Scan result:

- permit status: `blocked`
- findings: `4`
- graph paths: `1`
- controls: `5`

## Live Run

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
uv run --extra deep-agent agent-permit investigate \
  tests/fixtures/risky-ci-agent/.agent-permit/runs/sprint19-live-risky-ci \
  --agent-recursion-limit 20
```

Result:

- exit code: `0`
- citation check: `passed`
- model: `openrouter:anthropic/claude-sonnet-4.6`
- report lines: `97`
- sentinel stripped: yes
- generated artifact: `agent-investigation.md`
- generated usage artifact: `openrouter-usage.json`

Usage summary:

```json
{
  "cache_hit_ratio": 0.6836,
  "cache_write_tokens": 0,
  "cached_tokens": 27450,
  "input_tokens": 40156,
  "model_calls": 4,
  "output_tokens": 2026,
  "total_tokens": 42182
}
```

Estimated Sonnet 4.6 spend from the usage counters is about `$0.08`, assuming OpenRouter Anthropic pricing of `$3/M` input, `$15/M` output, and `0.1x` input price for cache reads.

## Fixes From Validation

Initial live runs hit LangGraph recursion limits because the model repeatedly called `validate_report_citations` without the required `report_markdown` argument. The CLI already runs deterministic citation validation after the final answer, so the validation tool was removed from the live agent tool surface.

The live path now has these guardrails:

- `--agent-recursion-limit`, default `12`
- `OPENROUTER_TIMEOUT_SECONDS`, default `45`
- `OPENROUTER_MAX_COMPLETION_TOKENS`, default `2400`
- `END_OF_REPORT` sentinel required for live reports
- deterministic citation critic still gates final report success

## Sprint 20 Phoenix Trace Validation

Phoenix was already running locally at `http://localhost:6006`.

Initial trace export used `PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006` and the live report passed, but span export returned repeated HTTP `405 Method Not Allowed` responses because the exporter posted to the Phoenix UI root instead of the OTLP trace endpoint.

Fix:

- normalize `http://localhost:6006` to `http://localhost:6006/v1/traces`
- set `.env.example` to the `/v1/traces` endpoint
- keep `PHOENIX_BASE_URL=http://localhost:6006` for dataset uploads

Rerun result:

```text
Collector Endpoint: http://localhost:6006/v1/traces
Status: investigation_complete
Citation check: passed
Phoenix tracing: requested
```

No `405` export errors were emitted after normalization.

## Sprint 20 Real Repo Live Validation

Real local repo:

```text
/tmp/agent-permit-validation/open_deep_research
```

Scan command:

```bash
uv run agent-permit scan /tmp/agent-permit-validation/open_deep_research \
  --run-id sprint20-open-deep-research
```

Scan result:

- files indexed: `42`
- credential refs: `17`
- CI findings: `4`
- graph paths: `2`
- controls: `6`
- permit status: `needs_review`

First live report completed but failed the citation critic because it mentioned `ci-secret-reference` and `ci-write-permission` without same-row `[rule:<rule_id>]` citations. It also included an unsupported calendar date. The prompt now explicitly requires:

- every scanner rule ID mention has a same-paragraph or same-table-row `[rule:<rule_id>]` citation
- no calendar dates unless the exact date exists in scan artifacts
- no preamble before the report heading

Successful rerun:

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
uv run --extra deep-agent agent-permit investigate \
  /tmp/agent-permit-validation/open_deep_research/.agent-permit/runs/sprint20-open-deep-research \
  --agent-recursion-limit 20
```

Result:

- exit code: `0`
- citation check: `passed`
- report lines: `88`
- permit status: `needs_review`
- no `END_OF_REPORT` sentinel left in written report
- no unsupported `2025` date

Usage summary:

```json
{
  "cache_hit_ratio": 0.5721,
  "cache_write_tokens": 0,
  "cached_tokens": 17213,
  "input_tokens": 30090,
  "model_calls": 3,
  "output_tokens": 2250,
  "total_tokens": 32340
}
```

## Next Validation

Run one GPT-5.5 comparison only if Sonnet 4.6 fails a harder real-repo citation or report-quality check. Otherwise, next work should be productizing a live validation harness that records these run metrics without manual shell wrappers.

## Sprint 21 Live Validation Harness

`agent-permit live-validate <repo>` productizes the manual validation path:

```bash
OPENROUTER_TIMEOUT_SECONDS=30 \
OPENROUTER_MAX_COMPLETION_TOKENS=2400 \
uv run --extra deep-agent --extra phoenix agent-permit live-validate . \
  --run-id sprint21-live-validation \
  --agent-recursion-limit 20 \
  --phoenix
```

Flow:

1. Run a fresh deterministic scan with `ci=false`.
2. Run the required live Deep Agent investigation on the new artifact directory.
3. Re-run the deterministic citation critic against the written report.
4. Write `live-validation.json` next to the report unless `--output` is provided.

Pass/fail contract:

- scanner failure fails the harness
- live Deep Agent failure fails the harness
- citation critic failure fails the harness
- `blocked` and `needs_review` permit statuses do not fail the harness because they are valid permit outcomes

The validation artifact records:

- target repo and run ID
- artifact, report, usage, and validation paths
- scan and investigation exit codes
- permit status, finding count, graph-path count, control count, and credential count
- selected model and recursion limit
- Phoenix/LangSmith request flags
- citation critic result
- OpenRouter usage summary when available

Fixture harness result:

- run ID: `sprint21-live-fixture`
- exit code: `0`
- status: `live_validation_complete`
- permit status: `blocked`
- findings: `4`
- graph paths: `1`
- controls: `5`
- citation check: `passed`
- model calls: `3`
- total tokens: `29,725`
- cached tokens: `16,717`
- cache hit ratio: `59.8%`
