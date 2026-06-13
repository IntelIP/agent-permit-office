# Live Proof Rerun Plan

Date: 2026-06-13

Purpose: move live Deep Agent evidence and proof packs from partial/demo-grade to complete audit-grade once OpenRouter credits/API access are restored.

## Guardrail

Do not run live model commands until both are true:

- OpenRouter credits/API access are confirmed usable.
- User explicitly approves live model spend for the rerun.

No-spend commands are safe:

```bash
uv run pytest
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
python3 tools/export_dashboard_snapshot.py
python3 tools/export_dashboard_snapshot.py --proof-pack
cd dashboard && bun run build
```

## Preflight

Run before any live model spend:

```bash
git status --short
uv run pytest
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
cd dashboard && bun run lint
cd dashboard && bun run build
uv build
```

Expected:

- tests pass
- self-scan permit status is `approved`
- dashboard lint/build pass
- Python wheel and sdist build
- no tracked `.agent-permit`, `dist`, `dashboard/dist`, private env, or cache artifacts

## Open-Source Proof Pack Rerun

Use this path to refresh the five-repo proof set and produce durable per-repo artifacts.

Set environment:

```bash
export OPENROUTER_API_KEY=<key>
export OPENROUTER_TIMEOUT_SECONDS=30
export OPENROUTER_MAX_COMPLETION_TOKENS=2400
export PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
```

Run live validation:

```bash
uv run --extra deep-agent --extra phoenix agent-permit live-validate-real \
  docs/evals/open-source-live-repos.json \
  --repo-root /tmp/agent-permit-open-source-validation \
  --run-id sprint34-open-source-live-rerun \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

Expected aggregate artifacts:

```text
.agent-permit/live-repo-validations/sprint34-open-source-live-rerun/live-repo-validation-results.json
.agent-permit/live-repo-validations/sprint34-open-source-live-rerun/live-repo-validation-report.md
.agent-permit/live-repo-validations/sprint34-open-source-live-rerun/repos/
```

Expected per-repo artifacts under `repos/`:

```text
permit.yaml
raw-findings.json
graph-paths.json
run-metrics.json
live-validation.json
agent-investigation.md
openrouter-usage.json
summary.md
risk-report.md
controls.json
```

Refresh dashboard snapshot:

```bash
python3 tools/export_dashboard_snapshot.py
```

Write proof pack:

```bash
python3 tools/export_dashboard_snapshot.py --proof-pack
```

Expected proof artifacts:

```text
.agent-permit/proof-packs/sprint34-open-source-live-rerun/proof-pack-report.md
.agent-permit/proof-packs/sprint34-open-source-live-rerun/proof-pack-manifest.json
.agent-permit/proof-packs/sprint34-open-source-live-rerun/dashboard/dashboardSnapshot.json
.agent-permit/proof-packs/sprint34-open-source-live-rerun/validation/live-repo-validation-results.json
.agent-permit/proof-packs/sprint34-open-source-live-rerun/validation/live-repo-validation-report.md
.agent-permit/proof-packs/sprint34-open-source-live-rerun.zip
```

Validate proof pack status:

```bash
python3 - <<'PY'
import json
from pathlib import Path

manifest = Path(".agent-permit/proof-packs/sprint34-open-source-live-rerun/proof-pack-manifest.json")
data = json.loads(manifest.read_text())
print("status:", data.get("status"))
print("missing:", len(data.get("missing", [])))
raise SystemExit(0 if data.get("status") == "ready" and not data.get("missing") else 1)
PY
```

## APO-66 T3 Severity Rerun

APO-66 stays `Blocked` until OpenRouter credits/API access are restored. Current blocker is OpenRouter `402 Insufficient credits`. Do not move it out of Blocked just because this plan exists.

Use this only after credits and spend approval:

```bash
export OPENROUTER_API_KEY=<key>
export OPENROUTER_TIMEOUT_SECONDS=30
export OPENROUTER_MAX_COMPLETION_TOKENS=2400
export PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces

uv run --extra deep-agent --extra phoenix agent-permit live-validate \
  /tmp/agent-permit-open-source-validation/t3-oss__create-t3-app \
  --run-id sprint34-t3-live-severity \
  --agent-recursion-limit 20 \
  --phoenix \
  --exclude ".agent-permit/**"
```

Expected deterministic severity counts for the T3 run:

```text
critical: 2
high: 2
medium: 50
```

Validate raw finding severity counts:

```bash
python3 - <<'PY'
import json
from collections import Counter
from pathlib import Path

path = Path("/tmp/agent-permit-open-source-validation/t3-oss__create-t3-app/.agent-permit/runs/sprint34-t3-live-severity/raw-findings.json")
data = json.loads(path.read_text())
findings = data["findings"] if isinstance(data, dict) and "findings" in data else data
counts = Counter(item["severity"] for item in findings)
expected = {"critical": 2, "high": 2, "medium": 50}
print(dict(counts))
raise SystemExit(0 if all(counts.get(k, 0) == v for k, v in expected.items()) else 1)
PY
```

Validate live run artifact:

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path("/tmp/agent-permit-open-source-validation/t3-oss__create-t3-app/.agent-permit/runs/sprint34-t3-live-severity/live-validation.json")
data = json.loads(path.read_text())
print("status:", data.get("status"))
print("citation_check_passed:", data.get("citation_check_passed"))
raise SystemExit(0 if data.get("citation_check_passed") is True else 1)
PY
```

Completion criteria for APO-66:

- live validation completes without OpenRouter `402`
- citation critic passes
- aggregate severity counts match raw findings
- generated report does not invent unsupported counts
- docs or Plane comment record final artifact paths

## Post-Rerun Checks

Run after either live rerun:

```bash
uv run pytest
uv run agent-permit scan . --ci --exclude "tests/fixtures/**"
cd dashboard && bun run build
python3 tools/export_dashboard_snapshot.py
python3 tools/export_dashboard_snapshot.py --proof-pack
```

Check:

- proof pack manifest status is `ready`
- proof pack missing list is empty
- `live-validation.json` says citation check passed for every repo
- `openrouter-usage.json` exists where live Deep Agent ran
- dashboard snapshot uses the new run ID
- no generated `.agent-permit/`, `dist`, or dashboard build output is tracked

Do not commit generated proof packs unless they are intentionally scrubbed and approved for public demo use.
