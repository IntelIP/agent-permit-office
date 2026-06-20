# Frontend Style System

Date: 2026-06-13

## Decision

The frontend rebuild uses a registry-first shadcn/Tailwind workflow. Refero provides design evidence and pattern direction; shadcn provides source components; Tailwind expresses layout, spacing, typography, and state styling; global CSS is limited to semantic tokens.

The existing `dashboard/src/App.css` is treated as prototype CSS, not the design foundation.

## Current Reference Lock

Approved direction: PermitGraph is a security inbox for agent permit proof, not a generic dashboard.

Primary layout:

```text
Rail / queue filters / findings queue / selected finding evidence
```

Primary component language:

- dark shell base `#101419`
- same-color panels in dark mode
- hairline borders and tonal separation instead of shadows
- rows and section dividers instead of dashboard cards
- small status dots and terse status words instead of badge overload
- one real workflow: filter findings, select finding, inspect evidence, export proof

Reference grounding:

| Source | Role |
| --- | --- |
| Refero Linear dark developer-tool style | dark restrained canvas, dense type, subtle borders |
| Refero shadcn monochrome style | component discipline, compact controls, minimal color |
| Refero data-table/security screens | queue + selected-detail inspection pattern |
| Local mockup `/tmp/codex-artifacts/security-inbox-mockup-v2.html` | approved layout and organization |

Reject:

- metric widget wall
- nested UI cards inside inspector
- fake sidebar pages
- all-status dropdown and more-filters controls
- copy-run-id button without a real workflow
- indigo/violet product accents
- decorative gradients, shadows, or large rounded dashboard cards

## Skill

Use the local Codex skill:

```text
$CODEX_HOME/skills/tailwind-visual-extraction
```

Run the CSS smell audit:

```bash
node "$CODEX_HOME/skills/tailwind-visual-extraction/scripts/audit-css-smells.mjs" dashboard/src
```

Current baseline:

```text
App.css: 1816 lines
index.css: 224 lines
unique custom CSS classes: 111
high findings: 6
medium findings: 23
```

## Rebuild Rule

New proof-pack viewer work should use:

- Refero screens for table/detail/layout evidence.
- Refero styles for dark technical tone.
- shadcn registry/components for shell, table, sheet, tabs, badges, buttons, scroll areas.
- Tailwind utilities for layout and styling.
- CSS variables for semantic tokens only.

Avoid:

- new large app-level CSS files
- custom class systems for every element
- raw hex colors outside the token file
- `!important`
- `color-mix()` as a substitute for named tokens
- fake pages or dashboard panels unsupported by backend data

## Target Budget

| Surface | Target |
| --- | --- |
| Global CSS token file | under 250 lines |
| Feature CSS | 0 lines preferred, 50 max with written reason |
| Unique custom classes for proof viewer | under 30 |
| App-level CSS | avoid |
| Raw hex outside token file | 0 |
| `!important` | 0 |

## Component Plan

Build new UI under:

```text
dashboard/src/components/proof-pack-viewer/
```

Components:

```text
ProofPackViewer.tsx
ProofPackHeader.tsx
FindingQueueTable.tsx
AgentReportPanel.tsx
EvidenceSheet.tsx
ArtifactList.tsx
StatusBadge.tsx
```

Runtime composition:

```text
ProofPackViewer
  RailNav
  QueueSidebar
  ProofPackHeader
  FindingQueueTable
  AgentReportPanel
```

Use shadcn primitives where they fit: `Button`, `Input`, `Tabs`, `ScrollArea`, `Separator`, `Tooltip`. Do not force `Card` where a section divider communicates the structure better.

Keep data bridge:

```text
dashboard/src/data/permitQueue.ts
```

## Tailwind Recipes

Panel:

```tsx
<section className="overflow-hidden rounded-lg border border-border bg-card">
```

Table row:

```tsx
<TableRow className="h-11 cursor-pointer border-border hover:bg-muted/40 data-[state=selected]:bg-muted/60">
```

Evidence rail:

```tsx
<aside className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-hidden rounded-lg border border-border bg-card">
```

Muted metadata:

```tsx
<span className="text-xs text-muted-foreground">
```

Dark tokens:

```css
.dark {
  --background: #101419;
  --card: #101419;
  --muted: #151b22;
  --border: #273241;
}
```

## Definition Of Done

- `bun run lint` passes.
- `bun run build` passes.
- CSS smell audit improves from baseline.
- Desktop screenshot reviewed.
- Mobile screenshot reviewed.
- Dark mode screenshot reviewed.
- Each visible UI element maps to backend snapshot data or a real export action.
