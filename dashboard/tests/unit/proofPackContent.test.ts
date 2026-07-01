import { describe, expect, it } from "vitest"

import {
  artifactNames,
  decisionSummary,
  displayEvidenceLocation,
  recommendedResponse,
  requiredControls,
  riskPathNodes,
  statusHelpText,
} from "@/components/proof-pack-viewer/agentReportContent"
import {
  displayFindingSummary,
  displayFindingTitle,
  policyCheckDescription,
  policyCheckLabel,
  reviewerQuestion,
} from "@/components/proof-pack-viewer/proofPackUtils"
import { filterFindings } from "@/components/proof-pack-viewer/useFilteredFindings"
import { makeFinding } from "./testFindingFactory"

describe("proof pack content helpers", () => {
  it("translates secret and write-permission findings into reviewer English", () => {
    const finding = makeFinding()

    expect(displayFindingTitle(finding)).toBe(
      "Review CI secrets and write permissions in open-swe",
    )
    expect(policyCheckLabel(finding)).toBe("CI secrets with write access")
    expect(policyCheckDescription(finding)).toContain(
      "workflows that also have write permissions",
    )
    expect(reviewerQuestion(finding)).toBe(
      "Should open-swe be allowed to run automation where secrets may be reachable?",
    )
    expect(displayFindingSummary(finding)).toContain("workflow that can also write")
  })

  it("builds reviewer controls and risk path from MCP findings", () => {
    const finding = makeFinding({
      capability: "github MCP server",
      rule: "mcp-stdio-credential-ref",
      status: "blocked",
      title: "MCP server receives credential references",
    })

    expect(riskPathNodes(finding).map((node) => node.label)).toEqual([
      "Credential",
      "MCP server",
      "Runtime command",
    ])
    expect(requiredControls(finding).map((control) => control.status)).toEqual([
      "missing",
      "missing",
      "weak",
    ])
  })

  it("keeps clean runs short and approval-oriented", () => {
    const finding = makeFinding({
      rule: "clean-run",
      status: "approved",
      title: "lightagent passed this scan",
    })

    expect(displayFindingTitle(finding)).toBe("open-swe passed this scan")
    expect(decisionSummary(finding)).toContain("passed the configured permit checks")
    expect(statusHelpText(finding)).toContain("passed")
    expect(recommendedResponse(finding)).toContain("Approve from this scanner")
    expect(requiredControls(finding)).toEqual([
      {
        detail: "No configured risky policy path matched in this scan.",
        status: "ready",
        title: "Configured policy checks passed",
      },
    ])
  })

  it("keeps evidence and artifact labels readable", () => {
    const finding = makeFinding({
      artifacts: [
        ".agent-permit/live-repo-validations/sprint23/raw-findings.json",
        ".agent-permit/live-repo-validations/sprint23/controls.json",
      ],
      path: ".agent-permit/live-repo-validations/sprint23/result.json",
    })

    expect(displayEvidenceLocation(`${finding.path}:12`)).toBe("result.json:12")
    expect(displayEvidenceLocation("")).toBe("Evidence unavailable")
    expect(artifactNames(finding)).toEqual([
      "raw-findings.json",
      "controls.json",
      "graph-paths.json",
      "permit.yaml",
      "run-metrics.json",
    ])
  })

  it("filters findings by status and readable search text", () => {
    const findings = [
      makeFinding({ repo: "open-swe", status: "needs-review" }),
      makeFinding({
        id: "finding-2",
        repo: "lightagent",
        rule: "clean-run",
        status: "approved",
        title: "lightagent passed this scan",
      }),
    ]

    expect(
      filterFindings({
        activeView: "approved",
        findings,
        search: "",
      }).map((finding) => finding.repo),
    ).toEqual(["lightagent"])
    expect(
      filterFindings({
        activeView: "all",
        findings,
        search: "write permissions",
      }).map((finding) => finding.repo),
    ).toEqual(["open-swe"])
  })

  it("puts blocked findings into a direct recommended response", () => {
    const finding = makeFinding({
      rule: "ci-pr-target-write-token",
      status: "blocked",
      title: "pull request target workflow keeps write token",
    })

    expect(recommendedResponse(finding)).toBe(
      "Block unattended access. Require remediation or an explicit security exception before approval.",
    )
  })
})
