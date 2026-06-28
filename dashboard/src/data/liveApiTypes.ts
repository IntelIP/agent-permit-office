import type { QueueFinding, RepoSnapshot, SavedView } from "@/data/permitQueue"

export type ApiStatus = "loading" | "live" | "static" | "error"

export type ScanJob = {
  id: string
  repositoryId: string
  repositoryLabel: string
  localPath: string
  branch: string | null
  mode: string
  status: "queued" | "running" | "completed" | "failed" | string
  requestedAt: string | null
  claimedAt: string | null
  completedAt: string | null
  error: string | null
}

export type QueueScanInput = {
  branch: string
  label: string
  localPath: string
}

export type RunEvent = {
  id: number
  eventName: string
  sequence: number
  occurredAt: string
  payload: Record<string, unknown>
}

export type DashboardData = {
  apiStatus: ApiStatus
  error: string | null
  findings: QueueFinding[]
  generatedAt: string | null
  jobs: ScanJob[]
  repos: RepoSnapshot[]
  savedViews: SavedView[]
}

export type SnapshotPayload = {
  generatedAt?: string
  repositories?: ApiRepositoryRow[]
  runs?: ApiRunRow[]
  findings?: ApiFindingRow[]
  jobs?: ApiJobRow[]
}

export type ApiRepositoryRow = Record<string, unknown>
export type ApiRunRow = Record<string, unknown>
export type ApiFindingRow = Record<string, unknown>
export type ApiJobRow = Record<string, unknown>
