# Proof Pack Viewer Rebuild Plan

Date: 2026-06-13

## Purpose

This is the active execution brief for rebuilding the dashboard into a focused Proof Pack Viewer.

The UI should help a security or platform buyer answer four questions:

1. What was scanned?
2. What failed or needs review?
3. What evidence supports the decision?
4. What proof artifact can be shared?

Do not build generic SaaS dashboard pages until the backend supports them.

## Active Plane Set

Parent:

- APO-94 Proof Pack Viewer UI Rebuild

Sprint 36 foundation:

- APO-102 Sprint 36 UI rebuild foundation
- APO-95 Lock Proof Pack Viewer reference and component plan
- APO-96 Install Tailwind visual extraction QA gate
- APO-97 Build registry-first Proof Pack Viewer shell

Sprint 37 implementation:

- APO-103 Sprint 37 Proof Pack Viewer implementation and QA
- APO-98 Rebuild findings queue as dense review table
- APO-99 Rebuild selected evidence and Deep Agent report panel
- APO-100 Replace prototype dashboard and remove custom CSS bloat
- APO-101 Run visual QA, responsive review, and build gates

Superseded historical work:

- APO-71, APO-73, APO-75, APO-80, APO-81, APO-84

## Reference Lock

Primary product pattern:

- Evidence-first security triage console.
- Queue first, selected evidence second, export/proof path third.
- No KPI wall, no graph-first product, no chat-first product.

Primary visual direction:

- Dark technical command-center mode for dark theme.
- Light neutral audit-console mode for light theme.
- Use low-contrast panels, thin borders, dense type, and restrained semantic color.

Live Refero screen references:

| Reference | Role | URL |
| --- | --- | --- |
| Mercury transactions with detail drawer | table + selected detail pattern | https://refero.design/pages/0d491cac-51bb-48c0-a94e-2b4e9f4bf289 |
| Mercury ledger/table filters | dense register, search, saved filters | https://refero.design/pages/d02700cd-1dba-478f-97ed-0d5cfbf320ff |
| Mercury dark recipient drawer | dark mode table + side sheet | https://refero.design/pages/27ec1b29-06d2-4637-9ddc-e15a4371b497 |
| Mercury user activity audit log | chronological decision/activity rows | https://refero.design/pages/da0ff7bb-32ed-4295-a044-4edbcc3b0745 |
| Rox dark dashboard | dark data-dense enterprise surfaces | https://refero.design/pages/b5ab8ddf-a6b4-4b48-ab83-eb36b00af544 |
| n8n data table | plain grid density and filters | https://refero.design/pages/545e7636-ffa1-47a6-8bab-845f27cf9a3c |

Live Refero style references:

| Reference | Role | URL |
| --- | --- | --- |
| Axiom | industrial dark console, sparse accent | https://axiom.co |
| Trigger.dev | compact dark developer-tool polish | https://trigger.dev |
| Turso | dark technical palette with teal accents | https://turso.tech |

Existing research references:

- `docs/dashboard-design-research.md`
- `docs/dashboard-visual-system.md`
- `docs/frontend-style-system.md`
- `docs/permitgraph-dashboard-snapshot-contract.md`
- `docs/proof-pack-export.md`

External references already chosen:

- GitHub code scanning alerts: https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning-alerts
- Semgrep dashboard: https://docs.semgrep.dev/semgrep-appsec-platform/dashboard
- LangSmith trace view: https://docs.langchain.com/langsmith/view-traces
- PostHog dashboards: https://posthog.com/docs/product-analytics/dashboards
- shadcn dashboard blocks: https://ui.shadcn.com/blocks?category=dashboard
- shadcn theming: https://ui.shadcn.com/docs/theming
- shadcn table: https://ui.shadcn.com/docs/components/table
- shadcn sheet: https://ui.shadcn.com/docs/components/sheet
- shadcn tabs: https://ui.shadcn.com/docs/components/tabs
- Phosphor React: https://github.com/phosphor-icons/react

Mobbin references from `docs/dashboard-design-research.md`:

- Cloudflare security insights flow: https://mobbin.com/flows/3f3198f5-c7dc-4718-996e-e7045fa2baf7
- Vanta tests flow: https://mobbin.com/flows/8b1507e0-075c-4deb-9cd2-78944c19fb83
- incident.io inspect alert flow: https://mobbin.com/flows/083b2900-7398-4ebd-bbfe-c5914c98435e
- Cloudflare security triage screen: https://mobbin.com/screens/1a4f30cf-11fa-443e-9cfe-378b9a158c15
- Vanta compliance/security screen: https://mobbin.com/screens/6e3596e8-0f6a-4a38-ad5b-bbc17fae0fe1
- Sentry observability screen: https://mobbin.com/screens/03ec235b-0e50-4698-9b80-2994c5f312b7
- Sentry trace/error detail screen: https://mobbin.com/screens/c45026fc-927c-415e-a638-907945edebc5

## Component Blocks

Build under:

```text
dashboard/src/components/proof-pack-viewer/
```

Use:

| Component | Responsibility | Source |
| --- | --- | --- |
| `ProofPackViewer.tsx` | page composition, selected finding state | local |
| `ProofPackHeader.tsx` | sticky title, run metadata, export/theme actions | shadcn Button/Badge/Tooltip |
| `VerdictStrip.tsx` | concise run verdict and summary metrics | shadcn Card/Badge |
| `FindingQueueTable.tsx` | dense scanner finding table | shadcn Table/Input/Badge |
| `EvidenceSheet.tsx` | mobile and narrow detail surface | shadcn Sheet/Tabs/ScrollArea |
| `AgentReportPanel.tsx` | scanner evidence, Deep Agent report, decision log | shadcn Tabs/Card/ScrollArea |
| `ArtifactList.tsx` | proof-pack files and artifact status | shadcn Button/Badge |
| `StatusBadge.tsx` | approved/blocked/review states | shadcn Badge + Phosphor icons |

Use Phosphor icons only in active product code.

## Data Contract

The frontend reads:

```text
dashboard/src/data/permitQueue.ts
```

That module bridges:

```text
dashboard/src/data/generated/dashboardSnapshot.json
```

The UI must not read scattered `.agent-permit` files directly.

Snapshot fields that matter for this rebuild:

- `runMeta`
- `summary`
- `savedViews`
- `findings`
- `artifactPreviews`
- `runDetails`
- `decisionLog`
- `traceSteps`
- `proofPack`

## Story Execution Blocks

### APO-95

Define reference lock and map every major visual decision to this file, `docs/frontend-style-system.md`, or `docs/dashboard-design-research.md`.

Done when a builder can identify the target UI without asking for another design explanation.

### APO-96

Use the local skill:

```text
$CODEX_HOME/skills/tailwind-visual-extraction
```

Run:

```bash
node "$CODEX_HOME/skills/tailwind-visual-extraction/scripts/audit-css-smells.mjs" dashboard/src
```

Baseline:

```text
App.css: 1816 lines
index.css: 224 lines
unique custom CSS classes: 111
high findings: 6
medium findings: 23
```

### APO-97

Build the shell first:

- sticky header
- no fake sidebar pages
- run identity
- verdict strip
- table/detail two-pane layout
- light/dark mode
- dark shell base `#101419`

Do not build charts or observability screens here.

### APO-98

Build queue table:

- finding
- repo/source
- status
- severity
- rule
- evidence path
- capability
- owner
- age or last seen

Filters:

- saved view chips
- search
- severity only

Remove:

- all-status dropdown
- more-filters button
- copy-run-id button unless tied to real command

### APO-99

Build selected finding detail:

- deterministic scanner evidence
- file path and line
- rule id
- capability path
- Deep Agent report summary
- citation/grounding status
- artifact list
- decision log
- remediation or next action

The Deep Agent must be visible in the value flow.

### APO-100

Replace active render path:

- retire `dashboard/src/components/dashboard/PermitReviewQueue.tsx` or reduce it to a wrapper
- move active work to `dashboard/src/components/proof-pack-viewer/`
- reduce `dashboard/src/App.css`
- keep token CSS in `dashboard/src/index.css`

### APO-101

Close with proof:

```bash
cd dashboard && bun run lint
cd dashboard && bun run build
node "$CODEX_HOME/skills/tailwind-visual-extraction/scripts/audit-css-smells.mjs" dashboard/src
```

Capture screenshots:

- desktop light
- desktop dark
- mobile light
- mobile dark

Verify flow:

1. Select finding row.
2. Inspect scanner evidence.
3. Inspect Deep Agent report.
4. Inspect artifacts.
5. Explain final decision.
6. Export/open proof pack.

## Non-Goals

- Hosted multi-tenant dashboard.
- Clerk/Neon/PostHog production wiring.
- Observability page without real trace/eval data.
- Sales dashboard or executive KPI wall.
- Free-form agent chat UI.
- Graph visualization as first screen.
