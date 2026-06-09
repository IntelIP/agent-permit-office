# Dashboard Design Research

Date: 2026-06-08

This note defines the visual direction for the Agent Permit Office dashboard before implementation. The dashboard should feel like a working security review console, not a marketing page or generic analytics template.

## Reference Set

| Reference | What matters for Agent Permit Office | Borrow | Avoid |
| --- | --- | --- | --- |
| GitHub code scanning alerts | Alert triage is evidence-first: alert title, severity, status, affected file, code region, affected branch, metadata, and remediation state. | Finding row density, severity badges, code evidence panel, right-side metadata rail. | Copying GitHub issue styling too closely or hiding file evidence behind too many clicks. |
| Semgrep dashboard | AppSec dashboard focuses on backlog, triage state, guardrail adoption, filters, severity, confidence, reachability, validation, project grouping, and median open age. | Top filter bar, posture summary, project finding table, backlog trend, guardrail adoption metrics. | Pure executive KPI page with no path from metric to finding evidence. |
| LangSmith traces | Agent debugging needs a thread/message scan first, then details for exact runs, tool calls, inputs, outputs, timing, and errors. | Split view: agent timeline on one side, selected step details in a drawer or side panel. | Chat transcript as the main product surface. This is a permit console, not a chat app. |
| PostHog dashboards | Product dashboards support date filters, reusable insight cards, editable layouts, text annotations, shared views, and multiple chart types. | Modular metric cards, time filters, annotation cards, decision-specific charts. | Too many chart cards without a clear review decision. |
| Wiz Security Graph | Security teams benefit from seeing relationships across code, identity, cloud, runtime, secrets, and sensitive data. | Relationship map as a secondary investigation tab for capability chains and blast radius. | Making graph visualization the primary MVP surface before it has enough data quality. |
| shadcn/ui dashboard blocks | Strong app shell pattern: sidebar, header, section cards, dominant chart, data table, responsive composition. | Sidebar shell, section cards, data table, chart primitives, sheet/detail patterns. | The default sales/revenue dashboard content model. |

## Direction A: Permit Triage Console

Recommended for MVP.

What it communicates:

- serious AppSec workflow
- deterministic permit status
- fast reviewer scan
- evidence before narrative

Core layout:

- left sidebar for `Runs`, `Repositories`, `Findings`, `Agent Trace`, `Evals`, `Settings`
- top header with repository, branch, run ID, scanner mode, date, and export action
- status strip with `Permit`, `Critical/High`, `Agent Risk`, `Cost`, `Eval Drift`
- primary content grid:
  - left: findings table with severity, rule, path, line, capability, confidence, and status
  - right: selected run summary, policy gates, agent timeline, and artifacts
- detail sheet:
  - code evidence
  - deterministic scanner source
  - Deep Agent investigation summary
  - remediation hints
  - suppression/approval note

Components:

- shadcn/ui: `Sidebar`, `Card`, `Table`, `Badge`, `Tabs`, `Sheet`, `Command`, `Tooltip`, `Accordion`, `ScrollArea`, `Skeleton`
- shadcn chart: Recharts-backed `ChartContainer`, `ChartTooltip`, `ChartLegend`
- Phosphor icons: `ShieldCheck`, `WarningDiamond`, `FileSearch`, `Robot`, `GitBranch`, `Funnel`, `ClockCounterClockwise`, `ChartLine`, `Database`, `Cloud`

Palette:

- neutral base: white/off-white surface, near-black text, low-contrast borders
- semantic status:
  - approved: emerald
  - warning: amber
  - blocked: red
  - AI/agent trace: indigo
  - data/storage: teal
- use Coolors during implementation to validate contrast and tune semantic token pairs

Chart grammar:

- one dominant trend chart per page
- severity bars for distribution
- small sparklines only inside cards when they change a decision
- no unlabeled decorative charts
- all chart colors map to semantic tokens

## Direction B: Agent Trace War Room

Fallback direction for later detail-heavy mode.

What it communicates:

- agent behavior transparency
- investigation depth
- system relationship awareness
- why a permit was blocked or approved

Core layout:

- central timeline of scanner and agent steps
- right details panel for selected tool call or model reasoning packet
- secondary graph tab for codebase capability paths and sensitive asset relationships
- bottom evidence drawer for files, SARIF, artifacts, and eval outputs

Borrow:

- LangSmith trace drill-down behavior
- Wiz-style relationship storytelling
- PostHog-style annotations for explaining important changes

Avoid:

- network graph as first screen
- dark cyber aesthetic
- free-form agent chat as default workflow
- hidden deterministic scanner evidence

## Recommendation

Build Direction A first.

Reasons:

- matches MVP value: reviewer can decide whether a repo/run is safe
- easiest to populate with current artifacts
- best fit for local OSS and hosted open-core versions
- uses shadcn/ui directly without inventing a new interaction model
- leaves Direction B available as an `Agent Trace` tab once trace data matures

## First Designed Screen

Name: `Run Review`

Above the fold:

- sidebar navigation
- run header with repo and branch
- permit status strip
- severity and cost cards
- findings table
- selected run summary panel

Secondary tabs:

- `Findings`
- `Agent Trace`
- `Evals`
- `Artifacts`
- `Analytics`

First empty state:

- show local setup status
- show expected artifact paths
- show `agent-permit scan` command
- no fake charts when no run data exists

## Implementation Rules

- keep UI dense but readable
- no hero section
- no nested cards
- no one-hue palette
- no decorative gradient blobs
- no chart unless it changes a review decision
- preserve exact file and line evidence
- keep deterministic scanner output visually distinct from Deep Agent commentary
- local dashboard reads artifacts first; hosted integrations remain behind flags

## References

- GitHub code scanning alerts: https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning-alerts
- GitHub alert screenshot: https://docs.github.com/assets/cb-235019/images/help/repository/code-scanning-alert.png
- GitHub alert list screenshot: https://docs.github.com/assets/cb-20594/images/help/repository/code-scanning-library-alert-index.png
- Semgrep dashboard: https://docs.semgrep.dev/semgrep-appsec-platform/dashboard
- LangSmith trace view: https://docs.langchain.com/langsmith/view-traces
- LangSmith AI observability: https://info.langchain.com/AI-Observability
- PostHog dashboards: https://posthog.com/docs/product-analytics/dashboards
- PostHog dashboard screenshot: https://res.cloudinary.com/dmukukwp6/image/upload/dashboard_light_61b3bab3b6.png
- Wiz Security Graph: https://www.wiz.io/lp/wiz-security-graph
- Wiz graph screenshot: https://www.datocms-assets.com/75231/1737653118-image-7.png?fm=webp
- shadcn/ui dashboard blocks: https://ui.shadcn.com/blocks?category=dashboard
- shadcn/ui charts: https://v3.shadcn.com/docs/components/chart
