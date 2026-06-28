import { describe, expect, it } from "vitest"

import {
  parseSseEvents,
  snapshotToDashboardData,
} from "@/data/liveApiProjection"
import type { SnapshotPayload } from "@/data/liveApiTypes"

describe("live API projection", () => {
  it("projects latest completed Worker rows into queue findings and repo counts", () => {
    const payload: SnapshotPayload = {
      findings: [
        {
          finding_id: "f-1",
          line_start: 12,
          path: ".github/workflows/ci.yml",
          permit_status: "needs_review",
          recommendation: "Review workflow secrets.",
          repository_label: "open-swe",
          risk: "CI secrets may be reachable from a workflow that can write.",
          rule_id: "ci-secret-reference",
          run_id: "run-new",
          severity: "high",
          title: "open-swe needs review: ci-secret-reference, ci-write-permission",
        },
      ],
      generatedAt: "2026-06-11T18:42:00Z",
      jobs: [
        {
          id: "job-1",
          local_path: "/repos/open-swe",
          repository_id: "repo-1",
          repository_label: "open-swe",
          status: "queued",
        },
      ],
      repositories: [
        {
          id: "repo-1",
          label: "open-swe",
          local_path: "/repos/open-swe",
        },
      ],
      runs: [
        {
          artifact_dir: ".agent-permit/old",
          completed_at: "2026-06-01T12:00:00Z",
          findings_count: 0,
          permit_status: "approved",
          repository_id: "repo-1",
          repository_label: "open-swe",
          run_id: "run-old",
          status: "completed",
        },
        {
          artifact_dir: ".agent-permit/live",
          branch: "main",
          completed_at: "2026-06-11T18:42:00Z",
          controls_count: 4,
          findings_count: 1,
          graph_paths_count: 2,
          model_calls: 1,
          permit_status: "needs_review",
          repository_id: "repo-1",
          repository_label: "open-swe",
          run_id: "run-new",
          status: "completed",
          total_tokens: 1234,
        },
      ],
    }

    const dashboard = snapshotToDashboardData(payload)

    expect(dashboard.apiStatus).toBe("live")
    expect(dashboard.findings).toHaveLength(1)
    expect(dashboard.findings[0]).toMatchObject({
      artifactStatus: "available",
      branch: "main",
      id: "run-new:f-1",
      line: 12,
      repo: "open-swe",
      rule: "ci-secret-reference",
      status: "needs-review",
    })
    expect(dashboard.repos[0]).toMatchObject({
      counts: { controls: 4, findings: 1, graphPaths: 2 },
      latestRunId: "run-new",
      status: "needs-review",
    })
    expect(dashboard.savedViews.map((view) => [view.id, view.count])).toEqual([
      ["all", 1],
      ["blocked", 0],
      ["needs-review", 1],
      ["approved", 0],
    ])
    expect(dashboard.jobs[0]).toMatchObject({
      id: "job-1",
      repositoryLabel: "open-swe",
      status: "queued",
    })
  })

  it("creates a clean approved row when latest run has no findings", () => {
    const dashboard = snapshotToDashboardData({
      repositories: [
        {
          id: "repo-2",
          label: "lightagent",
          local_path: "/repos/lightagent",
        },
      ],
      runs: [
        {
          artifact_dir: ".agent-permit/lightagent",
          completed_at: "2026-06-12T00:00:00Z",
          findings_count: 0,
          permit_status: "approved",
          repository_id: "repo-2",
          repository_label: "lightagent",
          run_id: "run-clean",
          status: "completed",
        },
      ],
    })

    expect(dashboard.findings).toHaveLength(1)
    expect(dashboard.findings[0]).toMatchObject({
      repo: "lightagent",
      rule: "clean-run",
      status: "approved",
      title: "lightagent passed this scan",
    })
    expect(dashboard.savedViews.find((view) => view.id === "approved")?.count).toBe(1)
  })

  it("parses server-sent runner events", () => {
    const events = parseSseEvents(
      'id: 7\nevent: job-progress\ndata: {"occurred_at":"2026-06-11T18:42:00Z","payload_json":{"status":"running"},"sequence":2}\n\n',
    )

    expect(events).toEqual([
      {
        eventName: "job-progress",
        id: 7,
        occurredAt: "2026-06-11T18:42:00Z",
        payload: { status: "running" },
        sequence: 2,
      },
    ])
  })
})
