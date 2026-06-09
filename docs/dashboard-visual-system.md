# Dashboard Visual System

Date: 2026-06-09

This note tightens the dashboard visual language after the first generated mockup. The direction stays `Permit Review Queue`, but colors should feel calmer and more operational.

## Color Stack

Principle: neutral surfaces do most of the work. Status colors should mark state, not flood the interface.

### Base

| Token | Hex | Use |
| --- | --- | --- |
| `--apo-bg` | `#F7F8FA` | app background |
| `--apo-surface` | `#FFFFFF` | panels, tables, detail rail |
| `--apo-surface-muted` | `#F2F4F7` | sidebar active row, filter controls |
| `--apo-border` | `#DDE2EA` | default borders |
| `--apo-border-strong` | `#C8D0DC` | selected rows, pinned rail separators |
| `--apo-text` | `#172033` | primary text |
| `--apo-text-muted` | `#667085` | secondary metadata |
| `--apo-text-faint` | `#98A2B3` | timestamps, disabled labels |

### Identity

| Token | Hex | Use |
| --- | --- | --- |
| `--apo-primary` | `#2E6F73` | primary command, active nav icon, selected focus |
| `--apo-primary-soft` | `#E7F3F4` | selected nav fill, light callout |
| `--apo-primary-border` | `#B9DADC` | active border |

### Status

| Status | Text | Background | Border | Use |
| --- | --- | --- | --- | --- |
| Approved | `#2F7D5A` | `#EAF6EF` | `#BBDDCB` | approved permits, passed checks |
| Needs review | `#8A6414` | `#FFF7E0` | `#E7D6A4` | reviewer attention, pending decisions |
| Blocked | `#974A43` | `#FBEDEA` | `#E3B9B4` | blocked permit, severe policy failure |
| Critical | `#8D3D55` | `#F9EAF0` | `#E4B5C5` | critical finding, rarely used |
| Agent trace | `#5E5A9E` | `#F0EFF8` | `#CAC7E8` | Deep Agent trace, citation checks |
| Artifact/data | `#277C83` | `#E8F5F6` | `#B7DDE1` | reports, exports, storage artifacts |
| Resolved/muted | `#596579` | `#EEF1F5` | `#D4DAE4` | suppressed, resolved, archived |

Usage rules:

- avoid saturated fills in table rows
- use color as badge fill, icon color, left rail, or border accent
- use stronger color only for active state, destructive command, or selected finding
- pair color with text and icon, never color alone
- do not use more than two semantic colors in one compact panel unless it is a legend
- keep charts low-saturation; use one dominant color plus status colors only when comparing states

## Typography

Default stack:

```css
font-family: "Geist Variable", Inter, ui-sans-serif, system-ui, sans-serif;
```

Rules:

- page title: `18px / 24px`, weight `600`
- section title: `13px / 20px`, weight `600`
- body: `13px / 20px`, weight `400`
- table row: `12px / 18px`, weight `400`
- badge: `11px / 16px`, weight `600`
- metadata: `12px / 18px`, weight `400`
- code/path: `12px / 18px`, mono stack
- letter spacing: `0`
- no viewport-scaled font sizes
- no large hero type inside the dashboard

## Spacing

Use a 4px base grid.

| Element | Size |
| --- | --- |
| App shell padding | `16px` desktop, `12px` compact |
| Sidebar width | `244px` |
| Header height | `56px` |
| Saved-view row height | `40px` |
| Filter control height | `36px` |
| Table row height | `44px` default, `40px` compact |
| Detail rail width | `408px` default, `440px` max |
| Card/panel padding | `12px` compact, `16px` comfortable |
| Section gap | `16px` |
| Inline control gap | `8px` |
| Page max chrome gap | `20px` |
| Radius | `6px` controls, `8px` panels max |

Layout rules:

- no card inside card
- table and detail rail define the screen; metrics stay compact
- filters must not wrap awkwardly on desktop
- right rail scrolls internally; page shell should not jump on selected row change
- selected row height cannot change on hover or focus

## Icon System

Use `@phosphor-icons/react`.

Rules:

- default weight: `regular`
- state emphasis: `duotone` only for large empty-state or summary icons
- size `16px`: nav, table rows, badges
- size `18px`: filter/action buttons
- size `20px`: section headers and metric cards
- color: `currentColor` by default
- icon-only buttons require tooltip and accessible label
- no mixed Lucide icons in dashboard code unless shadcn install temporarily adds examples that are replaced before merge

Initial icon map:

| Surface | Icons |
| --- | --- |
| Runs | `ClockCounterClockwise`, `GitBranch` |
| Findings | `FileSearch`, `WarningDiamond` |
| Policies | `ShieldCheck`, `LockKey` |
| Agent Trace | `Robot`, `FlowArrow` |
| Evals | `ChartLine`, `Pulse` |
| Artifacts | `ArchiveBox`, `Database` |
| Settings | `GearSix` |
| Actions | `DownloadSimple`, `Funnel`, `MagnifyingGlass`, `CheckCircle`, `XCircle` |

## Tech Stack Readiness

Installed dashboard shell:

- Bun
- Vite
- React 19
- TypeScript
- ESLint
- Tailwind CSS v4 with `@tailwindcss/vite`
- shadcn/ui source components
- Phosphor Icons
- Geist variable font

Installed implementation dependencies:

```text
bun add @phosphor-icons/react
bun add tailwindcss @tailwindcss/vite
bun add class-variance-authority clsx tailwind-merge tw-animate-css
bun add @radix-ui/react-slot
```

shadcn setup:

```text
bun x shadcn@latest init
bun x shadcn@latest add button badge card table tabs sheet tooltip scroll-area separator input select skeleton
```

Optional after first table:

```text
bun add @tanstack/react-table
bun add recharts
```

Implementation order:

1. Build static `Permit Review Queue` shell with local mock artifact data.
2. Replace mock data with local artifact reader/export contract.
3. Add TanStack Table only if native table composition becomes too brittle.
4. Add charts only after review queue and detail rail work.

Gotchas:

- shadcn examples often use Lucide; replace icons with Phosphor during implementation.
- shadcn components are source files in the repo, so token drift must be reviewed like code.
- Tailwind v4 uses theme/CSS variables heavily; keep semantic tokens explicit instead of scattering raw colors.
- Dense UI needs stable dimensions for table rows, filters, badges, and rail sections.

## Source Notes

- shadcn/ui theming uses CSS variables and semantic utilities.
- shadcn/ui sidebar is composable and themeable, which fits persistent dashboard navigation.
- Tailwind CSS v4 exposes design tokens as CSS variables and supports Vite integration through `@tailwindcss/vite`.
- Phosphor React icons support configurable `size`, `color`, and `weight`, including `regular` and `duotone`.

References:

- shadcn/ui theming: https://ui.shadcn.com/docs/theming
- shadcn/ui sidebar: https://ui.shadcn.com/docs/components/sidebar
- Tailwind CSS Vite install: https://tailwindcss.com/docs/installation/using-vite
- Phosphor React: https://github.com/phosphor-icons/react
