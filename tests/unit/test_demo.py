import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

import agent_permit.cli as cli
import agent_permit.demo as demo
from agent_permit.cli import main
from agent_permit.demo import (
    OPEN_SOURCE_DEMO_HTML_FILE,
    OPEN_SOURCE_DEMO_REPORT_FILE,
    OPEN_SOURCE_DEMO_RESULTS_FILE,
    OpenSourceDemoRun,
    RepoPreparationResult,
    run_open_source_demo,
)
from agent_permit.evals import (
    LiveRepoValidationResult,
    LiveRepoValidationRun,
)


def test_open_source_demo_prepare_only_writes_reports(tmp_path, monkeypatch) -> None:
    manifest_path = _write_demo_manifest(tmp_path)
    repo_root = tmp_path / "repos"
    output_dir = tmp_path / "demo-output"

    def fake_prepare_repo(**kwargs) -> RepoPreparationResult:
        return RepoPreparationResult(
            repo_id=kwargs["repo_id"],
            source=kwargs["source"],
            repo_path=kwargs["repo_path"],
            status="exists",
            commit="abc123456789",
            commit_date="2026-06-07T00:00:00Z",
            commit_message="demo commit",
            error_message="",
        )

    monkeypatch.setattr(demo, "_prepare_repo", fake_prepare_repo)

    demo_run = run_open_source_demo(
        manifest_path,
        repo_root=repo_root,
        demo_run_id="demo-test",
        output_dir=output_dir,
        run_live_validation=False,
    )
    payload = json.loads((output_dir / OPEN_SOURCE_DEMO_RESULTS_FILE).read_text())

    assert demo_run.passed is True
    assert payload["passed"] is True
    assert payload["validation"] is None
    assert (output_dir / OPEN_SOURCE_DEMO_REPORT_FILE).is_file()
    assert (output_dir / OPEN_SOURCE_DEMO_HTML_FILE).is_file()
    assert "Live validation was skipped" in (
        output_dir / OPEN_SOURCE_DEMO_REPORT_FILE
    ).read_text()
    assert "Agent Permit Office Open Source Demo" in (
        output_dir / OPEN_SOURCE_DEMO_HTML_FILE
    ).read_text()


def test_open_source_demo_cli_prints_report_paths(tmp_path, monkeypatch) -> None:
    manifest_path = _write_demo_manifest(tmp_path)
    output_dir = tmp_path / "demo-output"
    stdout = StringIO()
    stderr = StringIO()

    def fake_run_open_source_demo(*_args, **_kwargs) -> OpenSourceDemoRun:
        output_dir.mkdir()
        for name in (
            OPEN_SOURCE_DEMO_RESULTS_FILE,
            OPEN_SOURCE_DEMO_REPORT_FILE,
            OPEN_SOURCE_DEMO_HTML_FILE,
        ):
            (output_dir / name).write_text("demo\n", encoding="utf-8")
        now = datetime.now(timezone.utc)
        validation_result = LiveRepoValidationResult(
            repo_id="demo-repo",
            passed=True,
            live_validation_passed=True,
            expectation_check_passed=True,
            source="local",
            repo_path=tmp_path / "repo",
            run_id="demo-run-demo-repo",
            expected_permit_status="approved",
            actual_permit_status="approved",
            expected_rule_ids_present=(),
            expected_rule_ids_absent=(),
            actual_rule_ids=(),
            missing_rule_ids=(),
            forbidden_rule_ids=(),
            status_check_passed=True,
            expected_rule_check_passed=True,
            forbidden_rule_check_passed=True,
            citation_check_passed=True,
            findings_count=0,
            graph_paths_count=0,
            controls_count=0,
            model_calls=1,
            input_tokens=100,
            total_tokens=120,
            cached_tokens=50,
            cache_hit_ratio=0.5,
            artifact_dir=tmp_path / "artifact",
            report_path=None,
            usage_path=None,
            validation_path=None,
            error_message="",
            duration_seconds=1.0,
        )
        validation_run = LiveRepoValidationRun(
            validation_run_id="demo-run",
            output_dir=output_dir / "live-validation",
            manifest_path=manifest_path,
            repo_root=tmp_path / "repos",
            results=(validation_result,),
            started_at=now,
            completed_at=now,
        )
        return OpenSourceDemoRun(
            demo_run_id="demo-run",
            manifest_path=manifest_path,
            repo_root=tmp_path / "repos",
            output_dir=output_dir,
            repo_results=(
                RepoPreparationResult(
                    repo_id="demo-repo",
                    source="local",
                    repo_path=tmp_path / "repo",
                    status="exists",
                    commit="abc123456789",
                    commit_date="2026-06-07T00:00:00Z",
                    commit_message="demo commit",
                    error_message="",
                ),
            ),
            validation_run=validation_run,
            started_at=now,
            completed_at=now,
        )

    monkeypatch.setattr(cli, "run_open_source_demo", fake_run_open_source_demo)

    exit_code = main(
        [
            "open-source-demo",
            str(manifest_path),
            "--repo-root",
            str(tmp_path / "repos"),
            "--run-id",
            "demo-run",
            "--output",
            str(output_dir),
            "--skip-refresh",
            "--phoenix",
        ],
        stdout=stdout,
        stderr=stderr,
    )

    assert exit_code == 0
    assert stderr.getvalue() == ""
    assert "Status: open_source_demo_complete" in stdout.getvalue()
    assert "Live validation: 1/1 passed" in stdout.getvalue()
    assert "HTML:" in stdout.getvalue()


def _write_demo_manifest(tmp_path: Path) -> Path:
    manifest_path = tmp_path / "open-source-live-repos.json"
    manifest_path.write_text(
        json.dumps(
            {
                "version": 1,
                "repos": [
                    {
                        "id": "demo-repo",
                        "source": "https://example.test/demo.git",
                        "local_path": "demo-repo",
                        "expected_permit_status": "approved",
                        "expected_rule_ids_present": [],
                        "expected_rule_ids_absent": [],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    return manifest_path
