import {
  fallbackDashboardData,
  normalizeJob,
  parseSseEvents,
  snapshotToDashboardData,
} from "./liveApiProjection"
import type {
  DashboardData,
  QueueScanInput,
  RunEvent,
  ScanJob,
  SnapshotPayload,
} from "./liveApiTypes"

type JobPayload = {
  error?: string
  job?: Record<string, unknown>
}

const API_BASE_URL =
  import.meta.env.VITE_AGENT_PERMIT_API_URL?.replace(/\/$/, "") ?? null

export async function fetchDashboardData(): Promise<DashboardData> {
  if (!API_BASE_URL) {
    return fallbackDashboardData
  }

  const response = await fetch(`${API_BASE_URL}/snapshot`, {
    headers: { accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`snapshot request failed: ${response.status}`)
  }
  const payload = (await response.json()) as SnapshotPayload
  return snapshotToDashboardData(payload)
}

export async function queueRepositoryScan(input: QueueScanInput): Promise<ScanJob> {
  const apiBaseUrl = requireApiBaseUrl(
    "Set VITE_AGENT_PERMIT_API_URL to queue scans through the Worker API",
  )
  const response = await fetch(`${apiBaseUrl}/jobs`, scanRequest(input))
  const payload = (await response.json()) as JobPayload
  return jobFromPayload(response, payload)
}

export async function fetchJobEvents(
  jobId: string,
  afterId = 0,
): Promise<RunEvent[]> {
  const apiBaseUrl = requireApiBaseUrl("Worker API URL is not configured")
  const response = await fetch(
    `${apiBaseUrl}/events?jobId=${encodeURIComponent(jobId)}&after=${afterId}`,
    { headers: { accept: "text/event-stream" } },
  )
  if (!response.ok) {
    throw new Error(`events request failed: ${response.status}`)
  }
  return parseSseEvents(await response.text())
}

function requireApiBaseUrl(errorMessage: string) {
  if (!API_BASE_URL) throw new Error(errorMessage)
  return API_BASE_URL
}

function scanRequest(input: QueueScanInput): RequestInit {
  return {
    body: JSON.stringify(scanRequestBody(input)),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  }
}

function scanRequestBody(input: QueueScanInput) {
  const target = input.repositoryTarget.trim()
  return {
    branch: input.branch.trim() || null,
    label: input.label.trim() || undefined,
    ...(isGithubRepositoryUrl(target) ? { repositoryUrl: target } : { localPath: target }),
    mode: "scan",
  }
}

function isGithubRepositoryUrl(value: string) {
  try {
    const url = new URL(value)
    const pathParts = url.pathname
      .replace(/\/$/, "")
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean)
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      pathParts.length === 2
    )
  } catch {
    return false
  }
}

function jobFromPayload(response: Response, payload: JobPayload) {
  if (!response.ok || !payload.job) {
    throw new Error(payload.error ?? `queue request failed: ${response.status}`)
  }
  return normalizeJob(payload.job)
}
