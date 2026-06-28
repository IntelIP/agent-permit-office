import {
  queueFindings as fallbackFindings,
  repos as fallbackRepos,
  savedViews as fallbackSavedViews,
  type PermitStatus,
  type QueueFinding,
  type RepoSnapshot,
  type SavedView,
  type Severity,
} from "@/data/permitQueue"
import type {
  ApiFindingRow,
  ApiJobRow,
  ApiRepositoryRow,
  ApiRunRow,
  DashboardData,
  RunEvent,
  ScanJob,
  SnapshotPayload,
} from "./liveApiTypes"

type NormalizedRun = {
  artifactDir: string
  branch: string | null
  cacheHitRatio: number | null
  cachedTokens: number
  completedAt: string | null
  controlsCount: number
  findingsCount: number
  graphPathsCount: number
  localPath: string
  model: string | null
  modelCalls: number
  permitStatus: PermitStatus
  repositoryId: string
  repositoryLabel: string
  runId: string
  runStatus: string
  status: PermitStatus
  totalTokens: number
}

type FindingRowContext = {
  completedAt: unknown
  findingId: string
  recommendation: string
  repo: string
  risk: string
  rule: string
  runId: string
  severity: Severity
  source: string
  status: PermitStatus
  title: string
}

const knownSeverities = new Set<Severity>(["critical", "high", "medium", "low"])

export const fallbackDashboardData: DashboardData = {
  apiStatus: "static",
  error: null,
  findings: fallbackFindings,
  generatedAt: null,
  jobs: [],
  repos: fallbackRepos,
  savedViews: fallbackSavedViews,
}

export function snapshotToDashboardData(payload: SnapshotPayload): DashboardData {
  const runs = (payload.runs ?? []).map(normalizeRun)
  const jobs = (payload.jobs ?? []).map(normalizeJob)
  const findings = buildFindings(payload.findings ?? [], runs)
  const repos = buildRepos(payload.repositories ?? [], runs, findings)

  return {
    apiStatus: "live",
    error: null,
    findings,
    generatedAt: payload.generatedAt ?? null,
    jobs,
    repos,
    savedViews: buildSavedViews(findings),
  }
}

export function normalizeJob(row: ApiJobRow | Record<string, unknown>): ScanJob {
  return {
    branch: nullableString(row.branch),
    claimedAt: nullableString(row.claimed_at),
    completedAt: nullableString(row.completed_at),
    error: nullableString(row.error),
    id: stringValue(row.id),
    localPath: stringValue(row.local_path),
    mode: stringValue(row.mode, "scan"),
    repositoryId: stringValue(row.repository_id),
    repositoryLabel: stringValue(row.repository_label, "Repository"),
    requestedAt: nullableString(row.requested_at),
    status: stringValue(row.status, "queued"),
  }
}

export function parseSseEvents(text: string): RunEvent[] {
  return text
    .split(/\n\n+/)
    .map(parseSseEventBlock)
    .filter((event): event is RunEvent => event !== null)
}

function buildFindings(
  rows: ApiFindingRow[],
  runs: NormalizedRun[],
): QueueFinding[] {
  const completedRuns = runs.filter((run) => run.runStatus !== "failed")
  const visibleRuns = latestRunsByRepository(completedRuns)
  const visibleRunIds = new Set(visibleRuns.map((run) => run.runId))
  const runRows = new Map(visibleRuns.map((run) => [run.runId, run]))
  const visibleRows = rows.filter((row) => visibleRunIds.has(stringValue(row.run_id)))
  const findings = visibleRows.map((row, index) => {
    const run = runRows.get(stringValue(row.run_id))
    return findingFromRow(row, run, index)
  })
  const findingRunIds = new Set(findings.map((finding) => finding.runId))
  const cleanRuns = visibleRuns
    .filter((run) => run.findingsCount === 0 && !findingRunIds.has(run.runId))
    .map((run, index) => cleanFindingFromRun(run, index))

  return [...findings, ...cleanRuns]
}

function latestRunsByRepository(runs: NormalizedRun[]): NormalizedRun[] {
  return Array.from(latestRunMap(runs).values())
}

function findingFromRow(
  row: ApiFindingRow,
  run: NormalizedRun | undefined,
  index: number,
): QueueFinding {
  const context = findingRowContext(row, run, index)

  return {
    age: formatDate(context.completedAt),
    artifactStatus: artifactStatus(run),
    artifacts: artifactList(run),
    branch: fallbackString(row.branch, run?.branch, "local"),
    capability: capabilityForRule(context.rule),
    commit: {
      date: null,
      hash: null,
      message: null,
    },
    confidence: confidenceForStatus(context.status),
    evidence: context.risk,
    id: `${context.runId}:${context.findingId}`,
    line: numberValue(row.line_start),
    metrics: metricsFromRow(row, run),
    missingArtifacts: missingArtifacts(run),
    owner: context.repo,
    path: fallbackString(row.path, run?.artifactDir, "scan evidence"),
    remediation: context.recommendation,
    repo: context.repo,
    rule: context.rule,
    runId: context.runId,
    scanner: "deterministic scanner",
    severity: context.severity,
    source: context.source,
    status: context.status,
    summary: context.risk,
    title: context.title,
    traceIds: [],
  }
}

function findingRowContext(
  row: ApiFindingRow,
  run: NormalizedRun | undefined,
  index: number,
): FindingRowContext {
  const repo = stringValue(row.repository_label, "Repository")
  const rule = stringValue(row.rule_id, "unknown-policy")
  const status = normalizeStatus(row.permit_status ?? row.status)
  const title = stringValue(row.title, `${repo} requires review`)

  return {
    completedAt: row.completed_at ?? run?.completedAt,
    findingId: stringValue(row.finding_id, `live-finding-${index + 1}`),
    recommendation: stringValue(
      row.recommendation,
      "Review the evidence and reduce permissions before approving this repository for agent automation.",
    ),
    repo,
    risk: stringValue(row.risk, title),
    rule,
    runId: stringValue(row.run_id, run?.runId ?? "pending-run"),
    severity: normalizeSeverity(row.severity, status),
    source: fallbackString(row.local_path, run?.localPath, repo),
    status,
    title,
  }
}

function confidenceForStatus(status: PermitStatus) {
  return status === "approved" ? 100 : 92
}

function cleanFindingFromRun(run: NormalizedRun, index: number): QueueFinding {
  return {
    age: formatDate(run.completedAt),
    artifactStatus: run.artifactDir ? "available" : "missing",
    artifacts: run.artifactDir ? [run.artifactDir] : [],
    branch: run.branch ?? "local",
    capability: "clean scan",
    commit: {
      date: null,
      hash: null,
      message: null,
    },
    confidence: 100,
    evidence: "No configured agent-permit risks were found in this run.",
    id: `${run.runId}-clean-${index + 1}`,
    line: 0,
    metrics: metricsFromRun(run),
    missingArtifacts: run.artifactDir ? [] : ["scan artifacts"],
    owner: run.repositoryLabel,
    path: run.artifactDir || "scan evidence",
    remediation: "Keep evidence attached and rescan when repository permissions or agent tooling changes.",
    repo: run.repositoryLabel,
    rule: "clean-run",
    runId: run.runId,
    scanner: "deterministic scanner",
    severity: "low",
    source: run.localPath,
    status: "approved",
    summary: `${run.repositoryLabel} passed this scan.`,
    title: `${run.repositoryLabel} passed this scan`,
    traceIds: [],
  }
}

function buildRepos(
  rows: ApiRepositoryRow[],
  runs: NormalizedRun[],
  findings: QueueFinding[],
): RepoSnapshot[] {
  const latestRunByRepo = latestRunMap(runs)

  return rows.map((row) => {
    const id = stringValue(row.id)
    const label = stringValue(row.label, "Repository")
    const run = latestRunByRepo.get(id)
    const repoFindings = findings.filter((finding) => finding.repo === label)
    const status = run?.status ?? summarizeStatus(repoFindings)

    return {
      commit: {
        date: null,
        hash: null,
        message: null,
      },
      counts: {
        controls: run?.controlsCount ?? 0,
        findings: repoFindings.filter((finding) => finding.rule !== "clean-run").length,
        graphPaths: run?.graphPathsCount ?? 0,
      },
      id,
      label,
      latestRunId: run?.runId ?? "",
      runIds: runs
        .filter((candidate) => candidate.repositoryId === id)
        .map((candidate) => candidate.runId),
      source: stringValue(row.local_path, ""),
      status,
    }
  })
}

function latestRunMap(runs: NormalizedRun[]) {
  const latest = new Map<string, NormalizedRun>()
  for (const run of runs) {
    const current = latest.get(run.repositoryId)
    if (!current || stringValue(run.completedAt) > stringValue(current.completedAt)) {
      latest.set(run.repositoryId, run)
    }
  }
  return latest
}

function buildSavedViews(findings: QueueFinding[]): SavedView[] {
  return [
    { count: findings.length, id: "all", label: "All results" },
    {
      count: findings.filter((finding) => finding.status === "blocked").length,
      id: "blocked",
      label: "Blocked",
    },
    {
      count: findings.filter((finding) => finding.status === "needs-review").length,
      id: "needs-review",
      label: "Needs review",
    },
    {
      count: findings.filter((finding) => finding.status === "approved").length,
      id: "approved",
      label: "Approved",
    },
  ]
}

function parseSseEventBlock(block: string): RunEvent | null {
  const lines = block.split("\n")
  const idLine = lines.find((line) => line.startsWith("id: "))
  const eventLine = lines.find((line) => line.startsWith("event: "))
  const dataLine = lines.find((line) => line.startsWith("data: "))
  if (!idLine || !eventLine || !dataLine) return null

  const data = JSON.parse(dataLine.replace(/^data: /, "")) as Record<
    string,
    unknown
  >
  return {
    eventName: eventLine.replace(/^event: /, ""),
    id: Number(idLine.replace(/^id: /, "")),
    occurredAt: stringValue(data.occurred_at),
    payload: objectValue(data.payload_json),
    sequence: numberValue(data.sequence),
  }
}

function normalizeRun(row: ApiRunRow): NormalizedRun {
  const permitStatus = normalizeStatus(row.permit_status)
  return {
    artifactDir: stringValue(row.artifact_dir),
    branch: nullableString(row.branch),
    cacheHitRatio: nullableNumber(row.cache_hit_ratio),
    cachedTokens: numberValue(row.cached_tokens),
    completedAt: nullableString(row.completed_at),
    controlsCount: numberValue(row.controls_count),
    findingsCount: numberValue(row.findings_count),
    graphPathsCount: numberValue(row.graph_paths_count),
    localPath: stringValue(row.local_path),
    model: nullableString(row.model),
    modelCalls: numberValue(row.model_calls),
    permitStatus,
    repositoryId: stringValue(row.repository_id),
    repositoryLabel: stringValue(row.repository_label, "Repository"),
    runId: stringValue(row.run_id),
    runStatus: stringValue(row.status, "completed"),
    status: permitStatus,
    totalTokens: numberValue(row.total_tokens),
  }
}

function metricsFromRow(
  row: ApiFindingRow,
  run: NormalizedRun | undefined,
): QueueFinding["metrics"] {
  return {
    cacheHitRatio: metricNumberOrNull(row.cache_hit_ratio, run?.cacheHitRatio),
    cachedTokens: metricNumber(row.cached_tokens, run?.cachedTokens),
    citationCheckPassed: true,
    controls: metricNumber(row.controls_count, run?.controlsCount),
    durationSeconds: null,
    expectationCheckPassed: true,
    findings: metricNumber(row.findings_count, run?.findingsCount, 1),
    graphPaths: metricNumber(row.graph_paths_count, run?.graphPathsCount),
    modelCalls: metricNumber(row.model_calls, run?.modelCalls),
    totalTokens: metricNumber(row.total_tokens, run?.totalTokens),
  }
}

function metricsFromRun(run: NormalizedRun): QueueFinding["metrics"] {
  return {
    cacheHitRatio: run.cacheHitRatio,
    cachedTokens: run.cachedTokens,
    citationCheckPassed: true,
    controls: run.controlsCount,
    durationSeconds: null,
    expectationCheckPassed: true,
    findings: run.findingsCount,
    graphPaths: run.graphPathsCount,
    modelCalls: run.modelCalls,
    totalTokens: run.totalTokens,
  }
}

function normalizeStatus(value: unknown): PermitStatus {
  const status = stringValue(value).replace("_", "-")
  if (status === "blocked") return "blocked"
  if (status === "approved") return "approved"
  return "needs-review"
}

function normalizeSeverity(value: unknown, status: PermitStatus): Severity {
  const severity = stringValue(value).toLowerCase()
  if (knownSeverities.has(severity as Severity)) return severity as Severity

  const fallbackByStatus: Record<PermitStatus, Severity> = {
    approved: "low",
    blocked: "critical",
    "needs-review": "high",
  }
  return fallbackByStatus[status]
}

function summarizeStatus(findings: QueueFinding[]): PermitStatus {
  if (findings.some((finding) => finding.status === "blocked")) return "blocked"
  if (findings.some((finding) => finding.status === "needs-review")) {
    return "needs-review"
  }
  return "approved"
}

function capabilityForRule(rule: string): string {
  if (rule.includes("ci")) return "ci trust boundary"
  if (rule.includes("secret")) return "secret exposure"
  if (rule.includes("mcp")) return "tool access"
  return "repository policy"
}

function formatDate(value: unknown): string {
  const dateValue = stringValue(value)
  if (!dateValue) return "Pending"
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return dateValue
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function fallbackString(primary: unknown, secondary: unknown, fallback: string): string {
  return stringValue(primary, stringValue(secondary, fallback))
}

function artifactStatus(
  run: NormalizedRun | undefined,
): QueueFinding["artifactStatus"] {
  return run?.artifactDir ? "available" : "missing"
}

function artifactList(run: NormalizedRun | undefined): string[] {
  return run?.artifactDir ? [run.artifactDir] : []
}

function missingArtifacts(run: NormalizedRun | undefined): string[] {
  return run?.artifactDir ? [] : ["scan artifacts"]
}

function numberValue(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function metricNumber(value: unknown, fallback: number | undefined, defaultValue = 0) {
  return numberValue(value, fallback ?? defaultValue)
}

function metricNumberOrNull(value: unknown, fallback: number | null | undefined) {
  return nullableNumber(value) ?? fallback ?? null
}

function nullableNumber(value: unknown): number | null {
  const numeric = numberValue(value, Number.NaN)
  return Number.isFinite(numeric) ? numeric : null
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
