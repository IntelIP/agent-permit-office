# Customer Discovery Kit

Date: 2026-06-13

Use this kit after the demo script in [Demo](demo.md). Goal: learn whether Agent Permit Office solves a painful workflow, who owns it, what evidence matters, and what the buyer would pay for.

## Target Call Shape

```text
5 min: current agent/MCP rollout context
10 min: demo using local proof path
20 min: workflow and evidence questions
10 min: pricing, buying process, next-step ask
5 min: recap and follow-up artifact agreement
```

Do not pitch every feature. Ask where the current approval process breaks.

## Qualification

Strong fit:

- team has internal coding agents, MCP servers, or agentic CI
- agents can read repos, call tools, use credentials, or affect production workflows
- security/platform team must approve agent access before rollout
- current evidence lives in PR comments, Slack, spreadsheets, or ad hoc docs
- buyer wants repeatable proof without uploading full repo contents

Weak fit:

- team only uses hosted chat tools with no repo/tool access
- no security review for agent access
- runtime firewall is the only pain they care about
- they want broad AI-SPM inventory before a narrow permit gate
- they will not run any local scanner or GitHub Action

## Persona Questions

### AppSec

- Who approves new agent tools, MCP servers, CI workflows, or repo-level agent instructions today?
- What evidence do you need before allowing an agent to access credentials or production systems?
- Which findings would be automatic blockers versus policy exceptions?
- How do you track accepted risk and exception expiration today?
- Would SARIF/code-scanning output help adoption, or does this need a separate queue?
- What would make a Deep Agent report trustworthy enough to include in review notes?

### Platform Security

- How many repos would need agent access review in the next 90 days?
- Where should this run: local CLI, CI, scheduled hosted scan, or GitHub app?
- Who owns remediation when a repo is blocked?
- Do you need org-wide policy profiles, repo-specific policies, or both?
- What artifact retention period would satisfy audit or customer review?
- Would you require self-hosted/VPC deployment, or is SaaS acceptable?

### AI Engineering

- What agents are being built or adopted now?
- What tools can those agents call?
- What secrets, tokens, or service accounts are exposed to agent execution contexts?
- How do you test prompt/tool boundaries before production use?
- What model providers and routing policies are allowed?
- Would a bounded Deep Agent investigation help debug complex findings, or should it stay optional per run?

### DevEx / Engineering

- Where would developers tolerate this in workflow: pre-commit, PR, CI, release gate, or scheduled scan?
- What false-positive rate would make them disable it?
- What output would they actually read in a PR?
- Would baseline/diff mode solve adoption for existing noisy repos?
- What one command or GitHub Action setup would feel acceptable?
- What remediation guidance would save time?

### Economic Buyer

- Which risk does this reduce: customer security review, internal audit, production incident, credential leakage, or agent rollout delay?
- What budget owns this: AppSec, platform, AI enablement, DevSecOps, GRC?
- What tool would this replace or complement?
- What is the cost of one delayed agent rollout or one manual security review?
- Would pricing by active repo, seat, or scan volume match how you buy?
- What must exist before procurement: SOC 2, SSO, private deployment, support SLA, data retention controls?

## Demo Success Signals

Green signals:

- buyer names a real repo or agent workflow to test
- AppSec asks for artifact schema, SARIF, audit export, or policy config
- platform asks for scheduled scans, GitHub app, or multi-repo queue
- AI engineering asks how Deep Agent evidence is bounded and citation-checked
- DevEx asks about baseline/diff and PR comments
- buyer asks for proof pack after the call
- buyer agrees to run a local scan or share a sanitized repo pattern
- buyer asks about price, deployment, or design partner terms

Yellow signals:

- interest is mostly educational
- they like the dashboard but cannot name owner or workflow
- they need runtime controls first
- they ask for broad AI inventory before permit workflow
- they want custom policy mapping before trying default rules

Red signals:

- no agent/tool/credential access exists
- no team owns agent access approvals
- they will not run scanners locally or in CI
- they want opaque AI scoring instead of inspectable evidence
- they need full hosted enterprise controls before any validation

## Demo Failure Signals

Treat these as product learnings, not objections to debate.

| Signal | Meaning | Backlog response |
| --- | --- | --- |
| "I do not understand what decision this supports." | Positioning or dashboard hierarchy unclear. | Improve README, demo script, dashboard copy. |
| "This is just SAST." | Source-to-sink agent capability graph not clear. | Strengthen graph/path explanation and visual evidence. |
| "The model part scares me." | Deep Agent trust boundary unclear. | Show deterministic artifacts first, citation critic second, model report last. |
| "We need this across hundreds of repos." | Hosted workflow likely valuable. | Prioritize GitHub app ingestion, scheduled scans, multi-repo queue. |
| "We need Jira/Slack/GitHub approvals." | Workflow integration needed. | Prioritize notifications, assignments, approval exports. |
| "We need proof for customers." | Evidence retention/proof pack value confirmed. | Prioritize durable proof packs, signed links, retention policy. |
| "Too many false positives." | Rule quality or baseline path weak. | Prioritize baseline/diff, rule tuning, suppression workflow. |

## Follow-Up Artifacts

Send only artifacts that match the call.

Default follow-up:

- one-paragraph recap of their current agent approval workflow
- top 3 risks they said matter
- demo command path from [Demo](demo.md)
- local proof pack path or sanitized sample once scrubbed
- open-core boundary from [Open Core Business Plan](open-core-business-plan.md)
- next-step ask: run scanner on one repo or schedule a working session

Security-heavy follow-up:

- `summary.md`
- `risk-report.md`
- `permit.yaml`
- `raw-findings.json`
- `graph-paths.json`
- proof-pack manifest
- explanation of static-only/no-secret-output boundary

Platform-heavy follow-up:

- hosted stack map
- API/data model draft from [Dashboard Stack Architecture](dashboard-stack-architecture.md)
- GitHub Action setup
- scheduled scan roadmap
- multi-repo queue mock/demo screenshots when available

Buyer-heavy follow-up:

- open-core packaging tiers
- pricing hypothesis
- implementation timeline
- design partner ask
- required enterprise controls list

## Insight To Backlog Map

| Repeated signal | Product backlog action | Pricing implication |
| --- | --- | --- |
| Needs multi-repo visibility | Hosted repo inventory, scheduled scans, team queue | Supports per active repo/month. |
| Needs audit evidence | R2 proof pack retention, signed downloads, manifest integrity | Supports Team/Enterprise retention tier. |
| Needs approvals | Request changes, approve exception, owner assignment, expiration | Supports per seat/month or workflow tier. |
| Needs policy mapping | Policy packs, custom rules, control mapping | Supports enterprise add-on. |
| Needs model governance | Managed key, model allowlist, spend quotas, usage dashboards | Supports managed model gateway fee. |
| Needs local-only | Keep OSS CLI strong, BYO key, no telemetry | Do not force SaaS; sell support or self-host later. |
| Needs low noise | Baseline/diff, suppressions, false-positive workflow | Protects adoption; do not charge for basic noise control. |
| Needs procurement controls | SSO/RBAC, retention, support SLA, private deployment | Enterprise contract path. |

## Pricing Questions

Ask after pain is clear:

- Would you rather pay by active repo, security/platform seat, or scan volume?
- What repo count would be in the first rollout?
- How often would scans run?
- Would you bring your own model key or pay for managed model routing?
- What retention period has monetary value?
- What budget range is realistic for a design-partner pilot?

Do not validate the exact price before validating the owned workflow.

## Design Partner Ask

Use a direct ask:

```text
Can we run Agent Permit Office against one repo where agent/tool access is under review, then compare the proof pack to your current approval evidence?
```

Minimum design partner commitment:

- one representative repo or sanitized fixture based on real workflow
- one AppSec/platform reviewer
- one AI/dev owner
- feedback on findings quality and proof pack usefulness
- permission to use anonymized learnings in roadmap planning

## Post-Call Scoring

Score each call from 0 to 2.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Pain | hypothetical | named workflow | urgent rollout/blocker |
| Owner | unclear | user identified | buyer + user identified |
| Evidence need | vague | artifacts useful | proof pack/audit required |
| Workflow fit | unclear | CI/local fit | hosted queue/approval fit |
| Willingness | no next step | another call | repo scan/design partner |
| Budget | none | possible budget | budget owner identified |

Interpretation:

- `0-5`: education, keep warm
- `6-9`: discovery continues
- `10-12`: design partner candidate
