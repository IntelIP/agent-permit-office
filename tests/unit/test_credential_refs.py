from agent_permit.scanners.credential_refs import CredentialReferenceScanner
from agent_permit.scanners.file_inventory import FileInventoryScanner


def test_credential_scanner_reads_env_examples_without_values(tmp_path) -> None:
    (tmp_path / ".env").write_text("OPENAI_API_KEY=sk-real-secret\n")
    (tmp_path / ".env.example").write_text(
        "\n".join(
            [
                "NODE_ENV=development",
                "OPENAI_API_KEY=sk-live-placeholder",
                "DATABASE_URL=postgres://user:pass@example/db",
                "export SLACK_BOT_TOKEN=",
            ]
        )
        + "\n"
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-env")

    refs = CredentialReferenceScanner().scan(
        tmp_path,
        scan_run_id="run-env",
        inventory=inventory,
    )
    payload = "".join(ref.model_dump_json() for ref in refs)

    assert [ref.name for ref in refs] == [
        "OPENAI_API_KEY",
        "DATABASE_URL",
        "SLACK_BOT_TOKEN",
    ]
    assert refs[0].provider == "openai"
    assert refs[1].scope_hint == "connection_string"
    assert refs[2].scope_hint == "token"
    assert "NODE_ENV" not in payload
    assert "sk-live-placeholder" not in payload
    assert "postgres://user:pass@example/db" not in payload
    assert "sk-real-secret" not in payload
    assert inventory.skipped["sensitive_env_file"] == 1


def test_credential_scanner_reads_python_env_access(tmp_path) -> None:
    (tmp_path / "agent.py").write_text(
        "\n".join(
            [
                "import os",
                "openai_key = os.getenv('OPENAI_API_KEY')",
                "aws_key = os.environ['AWS_ACCESS_KEY_ID']",
                "token = os.environ.get(\"GITHUB_TOKEN\")",
                "env = os.getenv('NODE_ENV')",
            ]
        )
        + "\n"
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-py")

    refs = CredentialReferenceScanner().scan(
        tmp_path,
        scan_run_id="run-py",
        inventory=inventory,
    )

    assert [ref.name for ref in refs] == [
        "OPENAI_API_KEY",
        "AWS_ACCESS_KEY_ID",
        "GITHUB_TOKEN",
    ]
    assert [ref.source.line_start for ref in refs] == [2, 3, 4]
    assert refs[1].provider == "aws"
    assert refs[2].provider == "github"


def test_credential_scanner_reads_javascript_and_typescript_env_access(tmp_path) -> None:
    (tmp_path / "agent.js").write_text(
        "const token = process.env.GITHUB_TOKEN;\n"
    )
    (tmp_path / "tool.ts").write_text(
        "const key = process.env['ANTHROPIC_API_KEY'];\n"
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-js")

    refs = CredentialReferenceScanner().scan(
        tmp_path,
        scan_run_id="run-js",
        inventory=inventory,
    )

    assert [ref.name for ref in refs] == ["GITHUB_TOKEN", "ANTHROPIC_API_KEY"]
    assert refs[0].source.path == "agent.js"
    assert refs[1].source.path == "tool.ts"
    assert refs[1].provider == "anthropic"


def test_credential_scanner_deduplicates_same_line_matches(tmp_path) -> None:
    (tmp_path / "agent.py").write_text(
        "x = os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY')\n"
    )
    inventory = FileInventoryScanner().scan(tmp_path, scan_run_id="run-dedupe")

    refs = CredentialReferenceScanner().scan(
        tmp_path,
        scan_run_id="run-dedupe",
        inventory=inventory,
    )

    assert len(refs) == 1
    assert refs[0].name == "OPENAI_API_KEY"
