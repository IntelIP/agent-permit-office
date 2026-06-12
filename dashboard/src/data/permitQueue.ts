import dashboardSnapshot from "./generated/dashboardSnapshot.json"

export type PermitStatus = "approved" | "needs-review" | "blocked"

export type Severity = "critical" | "high" | "medium" | "low"

export type TraceState = "passed" | "review" | "blocked"

export type SavedView = {
  id: string
  label: string
  count: number
}

export type RunMeta = {
  branch: string
  completedAt: string | null
  repo: string
  runId: string
  title: string
}

export type QueueSummary = {
  approvedRepos: number
  blockedRepos: number
  cacheHitRatio: number | null
  cachedTokens: number
  citationCoverage: number
  controls: number
  evalPassRate: number | null
  findings: number
  graphPaths: number
  inputTokens: number
  latestScanFilesIndexed: number | null
  latestScanFindings: number | null
  latestScanStatus: string | null
  modelCalls: number
  needsReviewRepos: number
  passedRepos: number
  repos: number
  totalTokens: number
}

export type QueueFinding = {
  id: string
  repo: string
  source: string
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
  commit: {
    date: string | null
    hash: string | null
    message: string | null
  }
  metrics: {
    cacheHitRatio: number | null
    cachedTokens: number
    citationCheckPassed: boolean
    controls: number
    durationSeconds: number | null
    expectationCheckPassed: boolean
    findings: number
    graphPaths: number
    modelCalls: number
    totalTokens: number
  }
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

type DashboardSnapshot = {
  generatedAt: string
  runMeta: RunMeta
  summary: QueueSummary
  savedViews: SavedView[]
  findings: QueueFinding[]
  traceSteps: AgentTraceStep[]
  policyControls: PolicyControl[]
  source: Record<string, string | null>
}

const snapshot = dashboardSnapshot as DashboardSnapshot

export const dashboardGeneratedAt = snapshot.generatedAt
export const dashboardSource = snapshot.source
export const runMeta = snapshot.runMeta
export const queueSummary = snapshot.summary
export const savedViews = snapshot.savedViews
export const queueFindings = snapshot.findings
export const agentTraceSteps = snapshot.traceSteps
export const policyControls = snapshot.policyControls
