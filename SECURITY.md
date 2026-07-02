# Security Policy

PermitGraph is a security tool, but it is still investigation-stage software.

## Supported Versions

Until the first public release, only the current `main` branch is supported.

After tagged releases begin, this policy will define supported release lines and security-fix windows.

## Reporting A Vulnerability

Do not open a public issue for a suspected vulnerability that includes exploit details, secrets, private repository data, or customer information.

Before public repository launch, report privately to the maintainer directly.

After launch, this file should be updated with the project security advisory contact or GitHub private vulnerability reporting instructions.

Include:

- affected version or commit
- command or workflow used
- minimal reproduction steps
- expected vs actual behavior
- whether raw secrets, credentials, private code, or traces were exposed

Do not include real API keys, tokens, or private customer data.

## Security Boundaries

Current scanner boundaries:

- static scanning only
- no agent code execution
- no MCP server execution
- no package script execution
- no workflow execution
- no raw secret values intentionally emitted
- real `.env` files are skipped by default
- generated `.agent-permit/` artifacts are ignored by git

Current Deep Agent boundaries:

- live investigation requires an explicit model key
- Deep Agent reads bounded scan artifacts through evidence tools
- citation critic checks report claims against deterministic artifacts
- deterministic scanner output remains the permit source of truth

## Out Of Scope For Now

Not yet covered:

- dynamic sandbox execution
- malicious dependency behavior at install time
- hosted multi-tenant isolation
- private vulnerability bounty program
- production incident SLA

These become release requirements before a hosted commercial control plane handles customer repositories.
