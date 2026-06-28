import type {
  ArtifactPreview,
  PermitStatus,
  QueueFinding,
  Severity,
  TraceState,
} from "@/data/permitQueue"

export const statusLabels: Record<PermitStatus, string> = {
  approved: "Approved",
  "needs-review": "Needs review",
  blocked: "Blocked",
}

export const severityLabels: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export const traceLabels: Record<TraceState, string> = {
  passed: "Passed",
  review: "Review",
  blocked: "Blocked",
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

type RiskKind =
  | "mcp-stdio-credential-ref"
  | "mcp-unpinned-package-command"
  | "ci-pr-target-write-token"
  | "ci-pull-request-target"
  | "ci-write-all-permissions"
  | "pull-request"
  | "secret-write-permission"
  | "secret"
  | "unknown"

type FindingTextResolver = string | ((finding: QueueFinding) => string)
type RiskCopy = {
  description?: string
  label?: string
  question?: FindingTextResolver
  summary?: string
  title?: FindingTextResolver
}

const riskRuleMatchers: Array<{ kind: RiskKind; match: string }> = [
  { kind: "mcp-stdio-credential-ref", match: "mcp-stdio-credential-ref" },
  { kind: "mcp-unpinned-package-command", match: "mcp-unpinned-package-command" },
  { kind: "ci-pr-target-write-token", match: "ci-pr-target-write-token" },
  { kind: "ci-pull-request-target", match: "ci-pull-request-target" },
  { kind: "ci-write-all-permissions", match: "ci-write-all-permissions" },
  { kind: "pull-request", match: "pull-request" },
]

const riskCopyByKind: Partial<Record<RiskKind, RiskCopy>> = {
  "ci-pr-target-write-token": {
    description:
      "Checks whether pull request target workflows also receive repository write permissions.",
    label: "Pull request target write token",
    question: (finding) =>
      `Should ${finding.repo} be allowed to run pull request target automation with write access?`,
    summary:
      "A pull request target workflow may run with repository write access. Fix this before allowing unattended agent work.",
    title: (finding) =>
      `Block pull request target workflow write access in ${finding.repo}`,
  },
  "ci-pull-request-target": {
    description:
      "Checks whether workflows use pull_request_target, which runs in the base repository context.",
    label: "Pull request target workflow",
    question: (finding) =>
      `Should ${finding.repo} be allowed to use pull request target automation?`,
    summary:
      "A pull request target workflow runs in the base repository context. Review the job before approving agent automation.",
    title: (finding) => `Review pull request target workflow in ${finding.repo}`,
  },
  "ci-write-all-permissions": {
    description: "Checks whether workflows grant broad write-all repository permissions.",
    label: "Workflow write-all permissions",
    question: (finding) => `Should ${finding.repo} keep workflow write-all permissions?`,
    summary:
      "A workflow grants broad write-all permissions. Reduce the token scope before unattended agent work continues.",
    title: (finding) => `Reduce workflow write-all permissions in ${finding.repo}`,
  },
  "mcp-stdio-credential-ref": {
    description:
      "The scanner found an MCP server that can receive credential-bearing environment variables before its command, package, and permissions are reviewed.",
    label: "MCP server credential access",
    question: (finding) =>
      `Should ${finding.repo} be allowed to launch an MCP server with credential access?`,
    summary:
      "This repository launches an MCP server that can receive credential-bearing environment variables. Review the server package and permissions before approval.",
  },
  "mcp-unpinned-package-command": {
    description:
      "The scanner found an MCP server command that can install a different package version over time, which can change tool behavior without code review.",
    label: "Unpinned MCP server package",
    question: (finding) =>
      `Should ${finding.repo} be allowed to launch an unpinned MCP server package?`,
    summary:
      "This repository launches an MCP server package without a pinned version. Review the package command before approval.",
  },
  "pull-request": {
    description: "Checks whether pull request workflows can run with repository write permissions.",
    label: "Pull request write access",
    question: (finding) =>
      `Should ${finding.repo} be allowed to run pull request automation with write access?`,
    summary:
      "Pull request automation may run with repository write access. Review this before allowing unattended agent work.",
    title: (finding) => `Block pull request workflow write access in ${finding.repo}`,
  },
  "secret-write-permission": {
    description:
      "Checks whether CI secrets can be reached from workflows that also have write permissions.",
    label: "CI secrets with write access",
    question: (finding) =>
      `Should ${finding.repo} be allowed to run automation where secrets may be reachable?`,
    summary:
      "CI secrets may be reachable in a workflow that can also write back to the repository.",
    title: (finding) =>
      `Review CI secrets and write permissions in ${finding.repo}`,
  },
  secret: {
    description: "Checks whether workflow or tool configuration can expose CI secrets.",
    label: "CI secret exposure",
    question: (finding) =>
      `Should ${finding.repo} be allowed to run automation where secrets may be reachable?`,
    summary:
      "Workflow or tool configuration may expose CI secrets. Review the evidence before approving this repository.",
    title: (finding) => `Review CI secret usage in ${finding.repo}`,
  },
}

function isCleanFinding(finding: QueueFinding) {
  return finding.rule === "clean-run" || finding.status === "approved"
}

function riskKind(finding: QueueFinding): RiskKind {
  const { rule, title } = finding
  const matchedRule = riskRuleMatchers.find(({ match }) => rule.includes(match))

  if (matchedRule) return matchedRule.kind
  if (!rule.includes("secret")) return "unknown"

  if (rule.includes("secret") && title.includes("write-permission")) {
    return "secret-write-permission"
  }
  return "secret"
}

function resolveFindingText(
  finding: QueueFinding,
  resolver: FindingTextResolver | undefined,
  fallback: (finding: QueueFinding) => string,
) {
  if (typeof resolver === "function") return resolver(finding)
  return resolver ?? fallback(finding)
}

export function evidenceLocation(finding: QueueFinding) {
  return finding.line > 0 ? `${finding.path}:${finding.line}` : finding.path
}

export function displayFindingTitle(finding: QueueFinding) {
  if (isCleanFinding(finding)) {
    return `${finding.repo} passed this scan`
  }

  return resolveFindingText(
    finding,
    riskCopyByKind[riskKind(finding)]?.title,
    normalizedFindingTitle,
  )
}

function normalizedFindingTitle(finding: QueueFinding) {
  return finding.title
    .replace(`${finding.repo} `, "")
    .replace(/^needs review:\s*/i, "Review ")
    .replace(/^blocked:\s*/i, "Block ")
    .replace(/^approved:\s*/i, "Approved ")
}

export function displayFindingSummary(finding: QueueFinding) {
  if (isCleanFinding(finding)) {
    return "No configured agent-permit risks were found for this repository in the latest scan."
  }

  return riskCopyByKind[riskKind(finding)]?.summary ?? finding.summary
}

export function reviewerQuestion(finding: QueueFinding) {
  if (isCleanFinding(finding)) {
    return "Can this repository continue running agent and CI automation?"
  }

  return resolveFindingText(
    finding,
    riskCopyByKind[riskKind(finding)]?.question,
    () => "Should this repository be allowed to run agent or CI automation?",
  )
}

export function policyCheckLabel(finding: QueueFinding) {
  if (finding.rule === "clean-run") return "No risky policy matched"
  return riskCopyByKind[riskKind(finding)]?.label ?? finding.rule.replaceAll("-", " ")
}

export function policyCheckDescription(finding: QueueFinding) {
  if (finding.rule === "clean-run") {
    return "Scanner did not find configured agent-permit policy risks in this repository."
  }

  return riskCopyByKind[riskKind(finding)]?.description ?? finding.evidence
}

export function searchableFindingText(finding: QueueFinding) {
  return [
    displayFindingTitle(finding),
    policyCheckLabel(finding),
    policyCheckDescription(finding),
    finding.title,
    finding.repo,
    finding.rule,
    finding.path,
    finding.capability,
    finding.owner,
    finding.evidence,
  ].join(" ")
}

export function artifactLabel(artifact: string) {
  if (artifact.startsWith("http")) return "External source"
  return artifact.split("/").at(-1) ?? artifact
}

export function artifactInsight(
  artifact: string,
  finding: QueueFinding,
  preview: ArtifactPreview | undefined,
) {
  if (artifact.startsWith("http")) {
    return {
      body: `Source repository for ${finding.repo}. Use this when you need to inspect the upstream project behind this scan row.`,
      facts: ["External URL", "Not embedded in local snapshot"],
      heading: "Source repository",
    }
  }

  if (!preview) {
    return {
      body: "This artifact was referenced by the scan, but no preview was embedded in the dashboard snapshot.",
      facts: ["Preview missing", "Regenerate snapshot after scan"],
      heading: "Artifact not embedded",
    }
  }

  if (preview.path.endsWith("live-repo-validation-results.json")) {
    return {
      body: `${finding.repo} is backed by the live validation result. It records permit status, expected policy checks, citation state, and artifact paths.`,
      facts: [
        `${finding.metrics.findings} findings`,
        `${finding.metrics.controls} controls`,
        finding.metrics.citationCheckPassed ? "Citations passed" : "Citations need review",
      ],
      heading: "Aggregate validation evidence",
    }
  }

  if (preview.path.endsWith("live-repo-validation-report.md")) {
    return {
      body: "Reviewer report summarizing repository outcome, findings, controls, and citation checks.",
      facts: [
        `${finding.metrics.modelCalls} model calls`,
        finding.metrics.citationCheckPassed ? "Citations passed" : "Citations need review",
      ],
      heading: "Reviewer summary report",
    }
  }

  return {
    body: "Repository-local artifact captured in the dashboard snapshot.",
    facts: [preview.kind, formatBytes(preview.sizeBytes)],
    heading: "Local artifact preview",
  }
}
