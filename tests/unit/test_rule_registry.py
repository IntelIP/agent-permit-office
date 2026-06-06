from io import StringIO
import json
import shutil
from pathlib import Path

from agent_permit.cli import main
from agent_permit.rule_registry import DETERMINISTIC_RULE_IDS, RULES_BY_ID


FIXTURES_DIR = Path(__file__).parents[1] / "fixtures"


def test_rule_registry_has_unique_ids() -> None:
    assert len(RULES_BY_ID) == len(DETERMINISTIC_RULE_IDS)
    assert "ci-pr-target-write-token" in DETERMINISTIC_RULE_IDS
    assert "mcp-stdio-credential-ref" in DETERMINISTIC_RULE_IDS
    assert "prompt-approval-bypass" in DETERMINISTIC_RULE_IDS


def test_rules_cli_lists_registered_rules() -> None:
    stdout = StringIO()

    exit_code = main(["rules", "--scanner", "ci_workflows"], stdout=stdout)

    output = stdout.getvalue()
    assert exit_code == 0
    assert "Status: rules_listed" in output
    assert "Scanner: ci_workflows" in output
    assert "[critical]" in output
    assert "Severity.CRITICAL" not in output
    assert "ci-pr-target-write-token" in output
    assert "mcp-stdio-credential-ref" not in output


def test_all_fixture_findings_use_registered_rule_ids(tmp_path) -> None:
    emitted_rule_ids: set[str] = set()

    for fixture_dir in sorted(path for path in FIXTURES_DIR.iterdir() if path.is_dir()):
        target = tmp_path / fixture_dir.name
        shutil.copytree(fixture_dir, target)
        stdout = StringIO()
        stderr = StringIO()
        run_id = f"registry-{fixture_dir.name}"

        exit_code = main(
            ["scan", str(target), "--run-id", run_id],
            stdout=stdout,
            stderr=stderr,
        )

        assert exit_code == 0
        assert stderr.getvalue() == ""
        findings_path = target / ".agent-permit" / "runs" / run_id / "raw-findings.json"
        payload = json.loads(findings_path.read_text())
        emitted_rule_ids.update(
            finding["rule_id"] for finding in payload["findings"]
        )

    assert emitted_rule_ids
    assert emitted_rule_ids <= DETERMINISTIC_RULE_IDS
