import type { QueueFinding } from "@/data/permitQueue"

export function makeFinding(
  overrides: Partial<QueueFinding> = {},
): QueueFinding {
  return {
    age: "Jun 7",
    artifactStatus: "available",
    artifacts: [".agent-permit/raw-findings.json"],
    branch: "main",
    capability: "ci trust boundary",
    commit: {
      date: null,
      hash: null,
      message: null,
    },
    confidence: 92,
    evidence:
      "CI secrets may be reachable in a workflow that can also write back to the repository.",
    id: "finding-1",
    line: 12,
    metrics: {
      cacheHitRatio: 0.67,
      cachedTokens: 141000,
      citationCheckPassed: true,
      controls: 4,
      durationSeconds: null,
      expectationCheckPassed: true,
      findings: 2,
      graphPaths: 2,
      modelCalls: 1,
      totalTokens: 188000,
    },
    missingArtifacts: [],
    owner: "open-swe",
    path: ".github/workflows/ci.yml",
    remediation:
      "Review workflow secrets and use least-privilege permissions before allowing agent automation.",
    repo: "open-swe",
    rule: "ci-secret-reference",
    runId: "run-1",
    scanner: "deterministic scanner",
    severity: "high",
    source: "/repos/open-swe",
    status: "needs-review",
    summary:
      "CI secrets may be reachable in a workflow that can also write back to the repository.",
    title: "open-swe needs review: ci-secret-reference, ci-write-permission",
    traceIds: [],
    ...overrides,
  }
}
