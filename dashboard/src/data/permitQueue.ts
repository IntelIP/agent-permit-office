export type PermitStatus = "approved" | "needs-review" | "blocked"

export type Severity = "critical" | "high" | "medium" | "low"

export type TraceState = "passed" | "review" | "blocked"

export type SavedView = {
  id: string
  label: string
  count: number
}

export type QueueFinding = {
  id: string
  repo: string
  branch: string
  runId: string
  status: PermitStatus
  severity: Severity
  rule: string
  title: string
  path: string
  line: number
  capability: string
  confidence: number
  owner: string
  age: string
  summary: string
  evidence: string
  scanner: string
  remediation: string
  artifacts: string[]
  traceIds: string[]
}

export type AgentTraceStep = {
  id: string
  label: string
  state: TraceState
  duration: string
  tool: string
  output: string
}

export type PolicyControl = {
  id: string
  label: string
  state: TraceState
  note: string
}

export const savedViews: SavedView[] = [
  { id: "needs-review", label: "Needs Review", count: 18 },
  { id: "blocked", label: "Blocked", count: 7 },
  { id: "new", label: "New Findings", count: 11 },
  { id: "exceptions", label: "Policy Exceptions", count: 4 },
  { id: "eval-drift", label: "Eval Drift", count: 3 },
]

export const queueFindings: QueueFinding[] = [
  {
    id: "APO-F-1042",
    repo: "t3-oss/create-t3-app",
    branch: "main",
    runId: "run_2026_06_11_1842",
    status: "blocked",
    severity: "critical",
    rule: "MCP-004",
    title: "Remote MCP server has broad filesystem and token access",
    path: ".cursor/mcp.json",
    line: 12,
    capability: "tool-to-secret path",
    confidence: 96,
    owner: "AppSec",
    age: "12m",
    summary:
      "MCP endpoint can read local project files while environment token references are available in the same execution context.",
    evidence:
      "mcpServers.github.env.GITHUB_TOKEN and filesystem root are declared in the same client config.",
    scanner: "mcp-config-scanner",
    remediation:
      "Scope MCP filesystem roots to read-only project paths and move token injection behind least-privilege server policy.",
    artifacts: [
      ".agent-permit/raw-findings.json",
      ".agent-permit/graph-paths.json",
      ".agent-permit/deep-agent-report.md",
    ],
    traceIds: ["trace-01", "trace-03", "trace-04"],
  },
  {
    id: "APO-F-1038",
    repo: "t3-oss/create-t3-app",
    branch: "main",
    runId: "run_2026_06_11_1842",
    status: "needs-review",
    severity: "high",
    rule: "PROMPT-002",
    title: "Repository instructions override scanner boundary",
    path: "AGENTS.md",
    line: 38,
    capability: "instruction injection",
    confidence: 89,
    owner: "Platform",
    age: "17m",
    summary:
      "Repo-local agent instructions attempt to change scanning scope and reporting format for security evidence.",
    evidence:
      "Instruction block asks agents to skip files under generated config when summarizing permit output.",
    scanner: "instruction-scanner",
    remediation:
      "Treat repo instructions as untrusted input in permit mode and require scanner-owned evidence summaries.",
    artifacts: [
      ".agent-permit/instruction-findings.json",
      ".agent-permit/citation-checks.json",
    ],
    traceIds: ["trace-02", "trace-04"],
  },
  {
    id: "APO-F-1027",
    repo: "t3-oss/create-t3-app",
    branch: "canary",
    runId: "run_2026_06_11_1811",
    status: "needs-review",
    severity: "medium",
    rule: "CI-009",
    title: "Pull request workflow keeps write token on untrusted event",
    path: ".github/workflows/preview.yml",
    line: 24,
    capability: "ci write scope",
    confidence: 82,
    owner: "DevEx",
    age: "41m",
    summary:
      "Preview workflow runs on pull_request_target with package install before permission downgrade.",
    evidence:
      "permissions.contents is write-capable during dependency restore and preview artifact generation.",
    scanner: "github-actions-scanner",
    remediation:
      "Split trusted deployment from untrusted build and set read-only permissions before checkout.",
    artifacts: [".agent-permit/workflow-context.json", ".agent-permit/raw-findings.json"],
    traceIds: ["trace-01", "trace-04"],
  },
  {
    id: "APO-F-1019",
    repo: "t3-oss/create-t3-app",
    branch: "main",
    runId: "run_2026_06_11_1740",
    status: "approved",
    severity: "low",
    rule: "SECRET-001",
    title: "Credential reference is redacted and policy-scoped",
    path: "src/env.js",
    line: 9,
    capability: "env reference",
    confidence: 94,
    owner: "Platform",
    age: "1h",
    summary:
      "Environment variable references are present, but no literal secret value or unsafe sink was detected.",
    evidence:
      "Scanner found schema-only references and confirmed redaction in emitted artifacts.",
    scanner: "credential-reference-scanner",
    remediation:
      "Keep runtime secret use behind typed environment access and preserve artifact redaction tests.",
    artifacts: [".agent-permit/controls.json", ".agent-permit/permit.json"],
    traceIds: ["trace-01", "trace-02"],
  },
  {
    id: "APO-F-1004",
    repo: "t3-oss/create-t3-app",
    branch: "feature/ai-router",
    runId: "run_2026_06_11_1655",
    status: "blocked",
    severity: "high",
    rule: "AGENT-007",
    title: "Agent tool can send repository context to external sink",
    path: "src/server/ai/tools.ts",
    line: 88,
    capability: "repo-to-network path",
    confidence: 91,
    owner: "AI Platform",
    age: "2h",
    summary:
      "Tool accepts arbitrary file paths and forwards selected content to an unpinned model endpoint.",
    evidence:
      "Graph path links file read helper to OpenRouter request without allowlist or evidence cap.",
    scanner: "capability-graph",
    remediation:
      "Add explicit path allowlist, byte limits, prompt cache tags, and outbound provider policy.",
    artifacts: [".agent-permit/graph-paths.json", ".agent-permit/deep-agent-report.md"],
    traceIds: ["trace-03", "trace-04"],
  },
]

export const agentTraceSteps: AgentTraceStep[] = [
  {
    id: "trace-01",
    label: "Load deterministic artifacts",
    state: "passed",
    duration: "380ms",
    tool: "artifact.read",
    output: "raw-findings.json, controls.json, graph-paths.json loaded with stable IDs.",
  },
  {
    id: "trace-02",
    label: "Check citation coverage",
    state: "passed",
    duration: "610ms",
    tool: "citation_critic.verify",
    output: "Every claim in summary maps to scanner evidence or control record.",
  },
  {
    id: "trace-03",
    label: "Trace capability path",
    state: "blocked",
    duration: "1.4s",
    tool: "graph.find_path",
    output: "Sensitive source reaches network sink without a blocking control.",
  },
  {
    id: "trace-04",
    label: "Draft reviewer decision",
    state: "review",
    duration: "920ms",
    tool: "deep_agent.summarize",
    output: "Decision requires human approval because remediation touches workflow trust boundary.",
  },
]

export const policyControls: PolicyControl[] = [
  {
    id: "CTRL-01",
    label: "Secret values redacted from artifacts",
    state: "passed",
    note: "Literal secret scan clean. Only env var names appear.",
  },
  {
    id: "CTRL-02",
    label: "Tool filesystem roots scoped",
    state: "blocked",
    note: "MCP config grants project-wide read without tool-level policy.",
  },
  {
    id: "CTRL-03",
    label: "External model sink governed",
    state: "review",
    note: "Provider is routed through OpenRouter, but file egress policy needs owner approval.",
  },
  {
    id: "CTRL-04",
    label: "Citation critic passed",
    state: "passed",
    note: "No invented claims found in Deep Agent summary.",
  },
]
