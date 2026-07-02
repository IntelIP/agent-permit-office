# Public Fixture Scans

These sanitized artifacts are generated from test fixtures with:

```bash
uv run python tools/build_public_demo_artifacts.py
```

They are safe demo evidence, not customer audit records.

| Fixture | Status | Findings | Graph paths | Controls |
| --- | --- | ---: | ---: | ---: |
| safe-agent | approved | 0 | 0 | 0 |
| risky-ci-agent | blocked | 4 | 1 | 5 |
| risky-mcp-agent | needs_review | 2 | 1 | 3 |
