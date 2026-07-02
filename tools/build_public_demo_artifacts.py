from __future__ import annotations

from contextlib import redirect_stderr
from datetime import datetime, timezone
from io import StringIO
import json
from pathlib import Path
import shutil
import tempfile
from typing import Any

from agent_permit.baseline import build_finding_baseline
from agent_permit.cli import run_scan
from agent_permit.models import Finding


REPO_ROOT = Path(__file__).resolve().parents[1]
FIXTURE_ROOT = REPO_ROOT / "tests" / "fixtures"
OUTPUT_ROOT = REPO_ROOT / "docs" / "demo-artifacts" / "public-fixture-scans"
SELECTED_ARTIFACTS = (
    "summary.md",
    "risk-report.md",
    "permit.yaml",
    "raw-findings.json",
    "graph-paths.json",
    "controls.json",
    "run-metrics.json",
)
PUBLIC_BASELINE_GENERATED_AT = datetime(2026, 1, 1, tzinfo=timezone.utc)
FIXTURES = (
    {
        "id": "safe-agent",
        "label": "Approved repository",
        "why": "No configured agent-access risk matched.",
    },
    {
        "id": "risky-ci-agent",
        "label": "Blocked CI automation",
        "why": "A pull_request_target workflow grants write permissions and references a token.",
    },
    {
        "id": "risky-mcp-agent",
        "label": "MCP credential review",
        "why": "A local MCP server receives a credential reference and uses an unpinned package command.",
    },
)


def main() -> int:
    if OUTPUT_ROOT.exists():
        shutil.rmtree(OUTPUT_ROOT)
    OUTPUT_ROOT.mkdir(parents=True)

    manifest: dict[str, Any] = {
        "name": "PermitGraph public fixture scans",
        "description": (
            "Sanitized scanner outputs generated from repository fixtures. "
            "These files show real PermitGraph decisions without publishing "
            "private repositories or generated local state."
        ),
        "generator": "tools/build_public_demo_artifacts.py",
        "fixtures": [],
    }

    with tempfile.TemporaryDirectory(prefix="permitgraph-public-demo-") as tmp:
        temp_root = Path(tmp)
        for fixture in FIXTURES:
            fixture_id = fixture["id"]
            source = FIXTURE_ROOT / fixture_id
            target = temp_root / fixture_id
            shutil.copytree(
                source,
                target,
                ignore=shutil.ignore_patterns(".agent-permit", "__pycache__"),
            )

            run_id = f"public-demo-{fixture_id}"
            stdout = StringIO()
            stderr = StringIO()
            with redirect_stderr(stderr):
                exit_code = run_scan(
                    target,
                    run_id=run_id,
                    stdout=stdout,
                    stderr=stderr,
                )
            if exit_code != 0:
                raise RuntimeError(
                    f"demo scan failed for {fixture_id}: {stderr.getvalue()}"
                )

            artifact_dir = target / ".agent-permit" / "runs" / run_id
            public_dir = OUTPUT_ROOT / fixture_id
            public_dir.mkdir()

            replacements = {
                str(target): f"tests/fixtures/{fixture_id}",
                str(target.resolve()): f"tests/fixtures/{fixture_id}",
                str(artifact_dir): (
                    f"tests/fixtures/{fixture_id}/.agent-permit/runs/{run_id}"
                ),
                str(artifact_dir.resolve()): (
                    f"tests/fixtures/{fixture_id}/.agent-permit/runs/{run_id}"
                ),
                str(temp_root): "tests/fixtures",
                str(temp_root.resolve()): "tests/fixtures",
            }

            (public_dir / "cli-output.txt").write_text(
                _sanitize_text(stdout.getvalue(), replacements),
                encoding="utf-8",
            )
            for artifact_name in SELECTED_ARTIFACTS:
                src = artifact_dir / artifact_name
                if artifact_name.endswith(".json"):
                    _write_sanitized_json(src, public_dir / artifact_name, replacements)
                else:
                    (public_dir / artifact_name).write_text(
                        _sanitize_text(src.read_text(encoding="utf-8"), replacements),
                        encoding="utf-8",
                    )

            _write_public_baseline(public_dir)
            metrics = json.loads((public_dir / "run-metrics.json").read_text())
            manifest["fixtures"].append(
                {
                    "id": fixture_id,
                    "label": fixture["label"],
                    "why": fixture["why"],
                    "permit_status": metrics["permit_status"],
                    "findings": metrics["findings"],
                    "graph_paths": metrics["graph_paths"],
                    "controls": metrics["controls"],
                    "artifact_dir": str(public_dir.relative_to(REPO_ROOT)),
                    "baseline": str(
                        (public_dir / "finding-baseline.json").relative_to(REPO_ROOT)
                    ),
                }
            )

    (OUTPUT_ROOT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    (OUTPUT_ROOT / "README.md").write_text(
        _build_readme(manifest),
        encoding="utf-8",
    )
    print(f"Wrote public demo artifacts: {OUTPUT_ROOT}")
    return 0


def _write_sanitized_json(
    source: Path,
    destination: Path,
    replacements: dict[str, str],
) -> None:
    payload = json.loads(source.read_text(encoding="utf-8"))
    payload = _strip_volatile(_sanitize_json(payload, replacements))
    destination.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _write_public_baseline(public_dir: Path) -> None:
    raw_findings = json.loads((public_dir / "raw-findings.json").read_text())
    findings = [
        Finding.model_validate(finding)
        for finding in raw_findings.get("findings", [])
    ]
    baseline = build_finding_baseline(
        findings,
        scan_run_id=str(raw_findings.get("scan_run_id")),
        generated_at=PUBLIC_BASELINE_GENERATED_AT,
    )
    (public_dir / "finding-baseline.json").write_text(
        json.dumps(baseline.model_dump(mode="json"), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _sanitize_json(value: Any, replacements: dict[str, str]) -> Any:
    if isinstance(value, str):
        return _sanitize_text(value, replacements)
    if isinstance(value, list):
        return [_sanitize_json(item, replacements) for item in value]
    if isinstance(value, dict):
        return {
            str(key): _sanitize_json(item, replacements)
            for key, item in value.items()
        }
    return value


def _sanitize_text(value: str, replacements: dict[str, str]) -> str:
    sanitized = value
    for source, target in sorted(replacements.items(), key=lambda item: -len(item[0])):
        sanitized = sanitized.replace(source, target)
    return sanitized


def _strip_volatile(value: Any) -> Any:
    if isinstance(value, list):
        return [_strip_volatile(item) for item in value]
    if isinstance(value, dict):
        stripped = {}
        for key, item in value.items():
            if key in {"duration_ms", "generated_at", "target_hash"}:
                continue
            stripped[key] = _strip_volatile(item)
        return stripped
    return value


def _build_readme(manifest: dict[str, Any]) -> str:
    lines = [
        "# Public Fixture Scans",
        "",
        "These sanitized artifacts are generated from test fixtures with:",
        "",
        "```bash",
        "uv run python tools/build_public_demo_artifacts.py",
        "```",
        "",
        "They are safe demo evidence, not customer audit records.",
        "",
        "| Fixture | Status | Findings | Graph paths | Controls |",
        "| --- | --- | ---: | ---: | ---: |",
    ]
    for fixture in manifest["fixtures"]:
        lines.append(
            "| {id} | {permit_status} | {findings} | {graph_paths} | {controls} |".format(
                **fixture,
            )
        )
    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
