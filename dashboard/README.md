# Agent Permit Office Dashboard

Local dashboard for reviewing Agent Permit Office scan, live-validation, and Deep Agent evidence artifacts.

```bash
bun install
bun dev
```

Refresh the dashboard data snapshot from repo-local `.agent-permit` artifacts:

```bash
python3 ../tools/export_dashboard_snapshot.py
```

Current scope:

- Vite React TypeScript app
- Bun package lifecycle
- shadcn/ui primitives with Phosphor icons
- static dashboard snapshot generated from local artifacts
- local-only, no hosted integrations yet
