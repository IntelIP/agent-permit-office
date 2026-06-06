# Phoenix Observability And Evaluation

Sprint 10 makes Phoenix the default observability direction for Agent Permit Office.

The product still treats deterministic scan artifacts as source of truth. Phoenix observes live Deep Agent behavior and can later host trace-backed eval workflows, but it does not decide permit status.

## Why Phoenix First

Phoenix fits this project because it is local-first, open-source, and OpenTelemetry/OpenInference native. That matters for a security tool because early demos should not require hosted trace storage or secret-bearing repo data leaving the machine.

LangSmith still fits LangChain-native production teams, but Phoenix is the better first choice here:

- local server at `http://localhost:6006`
- OpenTelemetry collector endpoint
- OpenInference LangChain instrumentation
- deterministic and LLM-as-judge eval support
- clean path to other OTel-compatible backends later

## Local Eval Harness

Run:

```bash
uv run agent-permit eval tests/fixtures --run-id local-eval
```

Output:

```text
.agent-permit/evals/local-eval/
  eval-results.json
  eval-report.md
  cases/<fixture-id>/.agent-permit/runs/<scan-run-id>/
```

The eval harness checks:

- expected permit status
- expected deterministic rule IDs
- citation support for the investigation report
- artifact secret-leak markers

This remains the regression gate even when Phoenix tracing is enabled.

## Phoenix Tracing

Install optional Phoenix dependencies:

```bash
uv sync --extra phoenix --extra deep-agent
```

Run Phoenix locally:

```bash
uv run --extra phoenix python -m phoenix.server.main serve
```

Phoenix listens locally by default:

```bash
export PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006
```

Trace a live Deep Agent investigation:

```bash
uv run --extra deep-agent --extra phoenix agent-permit investigate \
  .agent-permit/runs/<run_id> \
  --model openai:gpt-5.4 \
  --phoenix
```

The `--phoenix` flag initializes `phoenix.otel.register()` before the Deep Agent runtime is created. With the OpenInference LangChain instrumentor installed, LangChain and LangGraph calls can emit spans to Phoenix.

## What Phoenix Should Show

Useful trace fields:

- model call inputs and outputs
- Deep Agent coordinator span
- specialist subagent spans
- evidence tool calls
- model latency and errors
- trace metadata such as `scan_run_id` and `permit_status`

Useful review questions:

- Did the agent use typed evidence tools or raw artifact reads?
- Did it inspect all high-risk findings?
- Did it call the citation critic before final output?
- Did it spend tokens on irrelevant artifacts?
- Did model choice change unsupported citation rate?

## What We Do Not Turn On Yet

Not yet:

- server-side Phoenix datasets
- Phoenix LLM-as-judge evals
- online production evals
- alerts
- hosted Arize AX

Reason: the scanner truth set is still small. First prove deterministic fixture evals and trace visibility. Then add Phoenix datasets from real repo validation runs.

## Next Build Slice

Next useful slice:

1. Add Phoenix trace metadata for every evidence tool call.
2. Export local eval results into a Phoenix-compatible dataset shape.
3. Add a small LLM judge only for investigation quality, not permit status.
4. Compare Deep Agent prompts/models by citation failure rate and token cost.

## References

- Phoenix OTEL setup: https://www.arize.com/docs/phoenix/tracing/how-to-tracing/setup-tracing/setup-using-phoenix-otel
- OpenInference LangChain instrumentation: https://arize-ai.github.io/openinference/python/instrumentation/openinference-instrumentation-langchain/
- Phoenix evals overview: https://arize.com/docs/phoenix/evaluation/llm-evals
- Phoenix eval SDK: https://arize.com/docs/phoenix/sdk-api-reference/python/arize-phoenix-evals
