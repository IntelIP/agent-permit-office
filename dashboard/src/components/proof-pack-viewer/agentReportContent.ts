import type { QueueFinding } from "@/data/permitQueue"
import { evidenceLocation, policyCheckLabel } from "./proofPackUtils"

export type RiskNode = {
  detail: string
  label: string
  title: string
}

export type RequiredControl = {
  detail: string
  status: "missing" | "weak" | "ready"
  title: string
}

type RiskPathKey =
  | "mcp-stdio-credential-ref"
  | "mcp-unpinned-package-command"
  | "ci-pr-target-write-token"
  | "ci-pull-request-target"
  | "ci-write-all-permissions"
  | "pull-request"
  | "secret"
  | "default"

type RiskNodeTemplate = {
  detail: string
  label: string
  title: string | ((finding: QueueFinding) => string)
}

type RequiredControlTemplate = Omit<RequiredControl, "status"> & {
  status: RequiredControl["status"] | ((finding: QueueFinding) => RequiredControl["status"])
}

export function decisionSummary(finding: QueueFinding) {
  if (finding.status === "approved" || finding.rule === "clean-run") {
    return "This repository passed the configured permit checks. Keep the scan evidence attached and continue monitoring future changes."
  }

  if (finding.status === "blocked") {
    return "Do not approve unattended access yet. The scanner found a policy failure that should be fixed before agent or CI automation continues."
  }

  return "Do not approve unattended access until a reviewer confirms the evidence, required controls, and exception path."
}

export function statusHelpText(finding: QueueFinding) {
  if (finding.status === "approved") {
    return "Configured permit checks passed for this scan."
  }

  if (finding.status === "blocked") {
    return "Required change blocks approval until the repository is rescanned."
  }

  return "Reviewer must confirm evidence and controls before approval."
}

export function displayEvidenceLocation(evidence: string) {
  const trimmedEvidence = evidence.trim()
  if (trimmedEvidence.length === 0) return "Evidence unavailable"

  const parts = trimmedEvidence.split("/")
  const basename = parts.at(-1) ?? trimmedEvidence
  if (basename.match(/(.+):(\d+)$/)) return basename

  if (trimmedEvidence.includes("/")) return basename
  return trimmedEvidence
}

export function riskPathNodes(finding: QueueFinding): RiskNode[] {
  return riskPathTemplates[riskPathKey(finding)].map((node) => ({
    detail: node.detail,
    label: node.label,
    title:
      typeof node.title === "function"
        ? node.title(finding)
        : node.title,
  }))
}

export function requiredControls(finding: QueueFinding): RequiredControl[] {
  if (finding.status === "approved" || finding.rule === "clean-run") {
    return cleanRunControls
  }

  const templates = requiredControlTemplates[riskPathKey(finding)] ?? [
    {
      detail: finding.remediation,
      status: blockedStatus,
      title: "Reviewer approval gate",
    },
  ]
  return templates.map((control) => resolveControl(control, finding))
}

export function artifactNames(finding: QueueFinding) {
  const inferred = [
    "raw-findings.json",
    "graph-paths.json",
    "controls.json",
    "permit.yaml",
    "run-metrics.json",
  ]
  const fromFinding = finding.artifacts
    .map((artifact) => artifact.split("/").at(-1) ?? artifact)
    .filter(Boolean)

  return Array.from(new Set([...fromFinding, ...inferred])).slice(0, 6)
}

function riskPathKey(finding: QueueFinding): RiskPathKey {
  const rule = finding.rule
  const keys: Exclude<RiskPathKey, "default">[] = [
    "mcp-stdio-credential-ref",
    "mcp-unpinned-package-command",
    "ci-pr-target-write-token",
    "ci-pull-request-target",
    "ci-write-all-permissions",
    "pull-request",
    "secret",
  ]
  return keys.find((key) => rule.includes(key)) ?? "default"
}

const riskPathTemplates: Record<RiskPathKey, RiskNodeTemplate[]> = {
  "ci-pr-target-write-token": [
    {
      detail: "Untrusted pull request code can enter the workflow.",
      label: "Trigger",
      title: "Pull request target event",
    },
    {
      detail: "Workflow runs with repository write permissions.",
      label: "Workflow",
      title: (finding) => finding.path,
    },
    {
      detail: "Write token or privileged secret may be reachable.",
      label: "Sink",
      title: "Repository write access",
    },
  ],
  "ci-pull-request-target": [
    {
      detail: "Workflow uses pull_request_target.",
      label: "Trigger",
      title: "Base repository context",
    },
    {
      detail: "Automation may process pull request changes with privileged context.",
      label: "Workflow",
      title: (finding) => finding.path,
    },
    {
      detail: "Reviewer must confirm trusted-code checkout and job gating.",
      label: "Approval gate",
      title: "Pull request trust boundary",
    },
  ],
  "ci-write-all-permissions": [
    {
      detail: "Workflow declares broad repository permissions.",
      label: "Permission",
      title: "write-all",
    },
    {
      detail: "Any job in scope can mutate repository state unless narrowed.",
      label: "Workflow",
      title: (finding) => finding.path,
    },
    {
      detail: "Reviewer should require least-privilege permissions.",
      label: "Approval gate",
      title: "Reduce token scope",
    },
  ],
  default: [
    {
      detail: "Scanner evaluated repository configuration.",
      label: "Scanner",
      title: (finding) => finding.scanner,
    },
    {
      detail: "Evidence maps to this repository path.",
      label: "Evidence",
      title: (finding) => evidenceLocation(finding),
    },
    {
      detail: "Reviewer decides whether access can proceed.",
      label: "Decision",
      title: (finding) => policyCheckLabel(finding),
    },
  ],
  "mcp-stdio-credential-ref": [
    {
      detail: "Credential reference detected in repository configuration.",
      label: "Credential",
      title: "Credential-bearing environment variable",
    },
    {
      detail: "Local stdio server can receive the credential at runtime.",
      label: "MCP server",
      title: (finding) => finding.capability || "MCP tool runtime",
    },
    {
      detail: "Package and command need review before approval.",
      label: "Runtime command",
      title: "MCP server command",
    },
  ],
  "mcp-unpinned-package-command": [
    {
      detail: "Repository launches an MCP package command.",
      label: "Command",
      title: "Unpinned package",
    },
    {
      detail: "Package behavior can change without a repository diff.",
      label: "Supply chain",
      title: "Mutable dependency",
    },
    {
      detail: "Pin or vendor the server before credentials are granted.",
      label: "Approval boundary",
      title: "MCP runtime",
    },
  ],
  "pull-request": [
    {
      detail: "Untrusted pull request code can enter the workflow.",
      label: "Source",
      title: "Pull request",
    },
    {
      detail: "Workflow may execute with elevated repository context.",
      label: "Workflow",
      title: (finding) => finding.path,
    },
    {
      detail: "Write token or privileged secret may be reachable.",
      label: "Sink",
      title: "Repository write access",
    },
  ],
  secret: [
    {
      detail: "Scanner found repository automation that references a secret.",
      label: "Policy signal",
      title: "CI secret reference",
    },
    {
      detail: "Reviewer checks whether the same path can write back or expose the value.",
      label: "Risk condition",
      title: (finding) =>
        finding.title.includes("write-permission")
          ? "Secret plus write access"
          : "Secret exposure path",
    },
    {
      detail: "Use least-privilege permissions or request a workflow change.",
      label: "Approval gate",
      title: "Confirm secret boundary",
    },
  ],
}

const cleanRunControls: RequiredControl[] = [
  {
    detail: "No configured risky policy path matched in this scan.",
    status: "ready",
    title: "Configured policy checks passed",
  },
]

const requiredControlTemplates: Partial<Record<RiskPathKey, RequiredControlTemplate[]>> = {
  "ci-pr-target-write-token": [
    {
      detail: "Remove write token scope from untrusted pull request execution.",
      status: blockedStatus,
      title: "Pull request trust boundary",
    },
    {
      detail: "Confirm secrets are unavailable to untrusted PR code paths.",
      status: "weak",
      title: "Secret isolation",
    },
  ],
  "ci-pull-request-target": [
    {
      detail: "Use pull_request for untrusted code or gate pull_request_target jobs to trusted inputs.",
      status: "weak",
      title: "Pull request target gating",
    },
    {
      detail: "Confirm checkout does not execute untrusted head code in the privileged context.",
      status: "weak",
      title: "Trusted checkout control",
    },
  ],
  "ci-write-all-permissions": [
    {
      detail: "Replace write-all with the smallest permissions needed by the job.",
      status: blockedStatus,
      title: "Least-privilege token scope",
    },
  ],
  "mcp-stdio-credential-ref": [
    {
      detail: "Require human approval and least-privilege credential scope.",
      status: "missing",
      title: "MCP credential approval gate",
    },
    {
      detail: "Pin MCP package versions before granting credentials.",
      status: "missing",
      title: "MCP package version pinning",
    },
    {
      detail: "Allowlist the MCP server and prove the credential cannot cross the intended tool boundary.",
      status: "weak",
      title: "Credential-to-MCP boundary control",
    },
  ],
  "mcp-unpinned-package-command": [
    {
      detail: "Pin the MCP package version or vendor the server command.",
      status: "missing",
      title: "Package pinning",
    },
    {
      detail: "Allowlist the server command before granting repository or credential access.",
      status: "weak",
      title: "MCP server allowlist",
    },
  ],
}

function resolveControl(
  control: RequiredControlTemplate,
  finding: QueueFinding,
): RequiredControl {
  const status =
    typeof control.status === "function" ? control.status(finding) : control.status
  return { ...control, status }
}

function blockedStatus(finding: QueueFinding): RequiredControl["status"] {
  return finding.status === "blocked" ? "missing" : "weak"
}
