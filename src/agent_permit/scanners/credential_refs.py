from __future__ import annotations

from pathlib import Path
import re

from agent_permit.credential_hints import (
    is_credential_name,
    provider_hint,
    scope_hint,
)
from agent_permit.models import CredentialRef, EvidenceLocation, FileInventory, FileKind
from agent_permit.redaction import redact_secret_text


ENV_ASSIGNMENT_RE = re.compile(
    r"^\s*(?:export\s+)?(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*="
)
PYTHON_ENV_PATTERNS = (
    re.compile(
        r"\b(?:os\.)?getenv\(\s*[\"'](?P<name>[A-Za-z_][A-Za-z0-9_]*)[\"']"
    ),
    re.compile(
        r"\b(?:os\.)?environ(?:\.get)?\(\s*[\"'](?P<name>[A-Za-z_][A-Za-z0-9_]*)[\"']"
    ),
    re.compile(
        r"\b(?:os\.)?environ\[\s*[\"'](?P<name>[A-Za-z_][A-Za-z0-9_]*)[\"']\s*\]"
    ),
)
JS_ENV_PATTERNS = (
    re.compile(r"\bprocess\.env\.(?P<name>[A-Za-z_][A-Za-z0-9_]*)\b"),
    re.compile(
        r"\bprocess\.env\[\s*[\"'](?P<name>[A-Za-z_][A-Za-z0-9_]*)[\"']\s*\]"
    ),
)


class CredentialReferenceScanner:
    def scan(
        self,
        root_path: Path,
        *,
        scan_run_id: str,
        inventory: FileInventory,
    ) -> list[CredentialRef]:
        root_path = root_path.resolve()
        refs: list[CredentialRef] = []
        seen: set[tuple[str, str, int | None, str | None]] = set()

        for entry in inventory.files:
            path = root_path / entry.path
            if entry.kind == FileKind.ENV_EXAMPLE:
                refs.extend(
                    _scan_env_example(path, entry.path, seen)
                )
            elif entry.kind in {FileKind.PYTHON, FileKind.JAVASCRIPT, FileKind.TYPESCRIPT}:
                refs.extend(
                    _scan_code_file(path, entry.path, entry.kind, seen)
                )

        refs.sort(key=lambda ref: (ref.source.path, ref.source.line_start or 0, ref.name))
        return refs


def _scan_env_example(
    path: Path,
    rel_path: str,
    seen: set[tuple[str, str, int | None, str | None]],
) -> list[CredentialRef]:
    refs: list[CredentialRef] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    for line_number, line in enumerate(text.splitlines(), start=1):
        match = ENV_ASSIGNMENT_RE.search(line)
        if match is None:
            continue
        name = match.group("name")
        if not is_credential_name(name):
            continue
        refs.append(
            _credential_ref(
                name,
                rel_path,
                line_number,
                config_key=name,
                line=line,
                seen=seen,
            )
        )
    return [ref for ref in refs if ref is not None]


def _scan_code_file(
    path: Path,
    rel_path: str,
    kind: FileKind,
    seen: set[tuple[str, str, int | None, str | None]],
) -> list[CredentialRef]:
    patterns = PYTHON_ENV_PATTERNS if kind == FileKind.PYTHON else JS_ENV_PATTERNS
    refs: list[CredentialRef] = []
    text = path.read_text(encoding="utf-8", errors="replace")
    for line_number, line in enumerate(text.splitlines(), start=1):
        for pattern in patterns:
            for match in pattern.finditer(line):
                name = match.group("name")
                if not is_credential_name(name):
                    continue
                refs.append(
                    _credential_ref(
                        name,
                        rel_path,
                        line_number,
                        config_key=None,
                        line=line,
                        seen=seen,
                    )
                )
    return [ref for ref in refs if ref is not None]


def _credential_ref(
    name: str,
    rel_path: str,
    line_number: int,
    *,
    config_key: str | None,
    line: str,
    seen: set[tuple[str, str, int | None, str | None]],
) -> CredentialRef | None:
    dedupe_key = (name, rel_path, line_number, config_key)
    if dedupe_key in seen:
        return None
    seen.add(dedupe_key)
    return CredentialRef(
        name=name,
        provider=provider_hint(name),
        scope_hint=scope_hint(name),
        attached_to=f"file:{rel_path}",
        source=EvidenceLocation(
            path=rel_path,
            line_start=line_number,
            line_end=line_number,
            config_key=config_key,
            redacted_snippet=redact_secret_text(line.strip()),
        ),
    )
