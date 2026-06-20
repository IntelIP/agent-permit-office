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

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

export function evidenceLocation(finding: QueueFinding) {
  return finding.line > 0 ? `${finding.path}:${finding.line}` : finding.path
}

export function displayFindingTitle(finding: QueueFinding) {
  if (finding.rule === "clean-run" || finding.status === "approved") {
    return `${finding.repo} passed this scan`
  }

  if (finding.rule.includes("ci-pr-target") || finding.rule.includes("pull-request")) {
    return `Block pull request workflow write access in ${finding.repo}`
  }

  if (finding.rule.includes("secret") && finding.title.includes("write-permission")) {
    return `Review CI secrets and write permissions in ${finding.repo}`
  }

  if (finding.rule.includes("secret")) {
    return `Review CI secret usage in ${finding.repo}`
  }

  return finding.title
    .replace(`${finding.repo} `, "")
    .replace(/^needs review:\s*/i, "Review ")
    .replace(/^blocked:\s*/i, "Block ")
    .replace(/^approved:\s*/i, "Approved ")
}

export function displayFindingSummary(finding: QueueFinding) {
  if (finding.rule === "clean-run" || finding.status === "approved") {
    return "No configured agent-permit risks were found for this repository in the latest scan."
  }

  if (finding.rule.includes("ci-pr-target") || finding.rule.includes("pull-request")) {
    return "Pull request automation may run with repository write access. Review this before allowing unattended agent work."
  }

  if (finding.rule.includes("secret") && finding.title.includes("write-permission")) {
    return "CI secrets may be reachable in a workflow that can also write back to the repository."
  }

  if (finding.rule.includes("secret")) {
    return "Workflow or tool configuration may expose CI secrets. Review the evidence before approving this repository."
  }

  return finding.summary
}

export function policyCheckLabel(finding: QueueFinding) {
  if (finding.rule === "clean-run") return "No risky policy matched"
  if (finding.rule.includes("ci-pr-target") || finding.rule.includes("pull-request")) {
    return "Pull request write access"
  }
  if (finding.rule.includes("secret") && finding.title.includes("write-permission")) {
    return "CI secrets with write access"
  }
  if (finding.rule.includes("secret")) return "CI secret exposure"
  return finding.rule.replaceAll("-", " ")
}

export function policyCheckDescription(finding: QueueFinding) {
  if (finding.rule === "clean-run") {
    return "Scanner did not find configured agent-permit policy risks in this repository."
  }

  if (finding.rule.includes("ci-pr-target") || finding.rule.includes("pull-request")) {
    return "Checks whether pull request workflows can run with repository write permissions."
  }

  if (finding.rule.includes("secret") && finding.title.includes("write-permission")) {
    return "Checks whether CI secrets can be reached from workflows that also have write permissions."
  }

  if (finding.rule.includes("secret")) {
    return "Checks whether workflow or tool configuration can expose CI secrets."
  }

  return finding.evidence
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

export function decisionLogEntries(finding: QueueFinding) {
  const permitAction =
    finding.status === "approved"
      ? "Permit approved"
      : finding.status === "blocked"
        ? "Permit blocked"
        : "Needs review"
  const nextAction =
    finding.status === "approved"
      ? "Keep permit evidence attached"
      : finding.status === "blocked"
        ? "Request code or policy change"
        : "Route to review team"

  return [
    {
      action: `Checked ${policyCheckLabel(finding)}`,
      actor: "Scanner",
      detail: `${severityLabels[finding.severity]} severity. ${policyCheckDescription(finding)}`,
      ref: evidenceLocation(finding),
      tone: finding.status,
    },
    {
      action: "Reviewed repository path",
      actor: "Policy map",
      detail: `${finding.capability}. ${finding.metrics.controls} controls evaluated from repository evidence.`,
      ref: policyCheckLabel(finding),
      tone: finding.status,
    },
    {
      action: permitAction,
      actor: "Permit",
      detail: `${finding.confidence}% confidence from deterministic signals and policy checks.`,
      ref: statusLabels[finding.status],
      tone: finding.status,
    },
    {
      action: "Verified evidence",
      actor: "Deep Agent",
      detail: `${finding.metrics.citationCheckPassed ? "Evidence citations passed" : "Evidence citations need review"}. ${finding.metrics.modelCalls} model calls checked scanner artifacts.`,
      ref: finding.artifacts[0] ? artifactLabel(finding.artifacts[0]) : finding.scanner,
      tone: "agent" as const,
    },
    {
      action: nextAction,
      actor: "Next action",
      detail: finding.remediation,
      ref: finding.owner,
      tone: finding.status,
    },
  ]
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
