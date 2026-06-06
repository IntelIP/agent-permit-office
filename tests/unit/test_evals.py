import json
from io import StringIO
from pathlib import Path

from agent_permit.cli import main
from agent_permit.evals import (
    EVAL_REPORT_FILE,
    EVAL_RESULTS_FILE,
    run_fixture_eval_suite,
)


FIXTURES_DIR = Path(__file__).parents[1] / "fixtures"


def test_fixture_eval_suite_passes_against_manifest_truth(tmp_path) -> None:
    eval_run = run_fixture_eval_suite(
        FIXTURES_DIR,
        eval_run_id="unit-eval",
        output_dir=tmp_path / "eval-output",
    )

    results_path = eval_run.output_dir / EVAL_RESULTS_FILE
    report_path = eval_run.output_dir / EVAL_REPORT_FILE
    payload = json.loads(results_path.read_text())

    assert eval_run.passed is True
    assert payload["passed"] is True
    assert payload["summary"] == {"failed": 0, "passed": 4, "total": 4}
    assert report_path.is_file()
    assert "Cases: `4/4`" in report_path.read_text()
    for result in eval_run.results:
        assert result.citation_check_passed is True
        assert result.secret_leak_check_passed is True
        assert result.artifact_dir.is_dir()


def test_eval_cli_writes_local_artifacts(tmp_path) -> None:
    stdout = StringIO()
    stderr = StringIO()

    exit_code = main(
        [
            "eval",
            str(FIXTURES_DIR),
            "--run-id",
            "cli-eval",
            "--output",
            str(tmp_path / "cli-output"),
        ],
        stdout=stdout,
        stderr=stderr,
    )

    assert exit_code == 0
    assert stderr.getvalue() == ""
    assert "Status: eval_complete" in stdout.getvalue()
    assert "Cases: 4/4 passed" in stdout.getvalue()
    assert (tmp_path / "cli-output" / EVAL_RESULTS_FILE).is_file()
    assert (tmp_path / "cli-output" / EVAL_REPORT_FILE).is_file()


def test_eval_cli_rejects_missing_fixture_root(tmp_path) -> None:
    stdout = StringIO()
    stderr = StringIO()
    missing = tmp_path / "missing"

    exit_code = main(["eval", str(missing)], stdout=stdout, stderr=stderr)

    assert exit_code == 2
    assert stdout.getvalue() == ""
    assert f"fixture root does not exist: {missing}" in stderr.getvalue()


def test_eval_cli_rejects_empty_fixture_root(tmp_path) -> None:
    stdout = StringIO()
    stderr = StringIO()
    empty = tmp_path / "empty"
    empty.mkdir()

    exit_code = main(["eval", str(empty)], stdout=stdout, stderr=stderr)

    assert exit_code == 1
    assert stdout.getvalue() == ""
    assert "no fixture manifests found" in stderr.getvalue()
