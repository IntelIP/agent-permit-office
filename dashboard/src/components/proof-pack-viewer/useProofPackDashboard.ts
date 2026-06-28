import { useCallback, useEffect, useState } from "react"

import {
  fallbackDashboardData,
  fetchDashboardData,
  fetchJobEvents,
  queueRepositoryScan,
  type DashboardData,
  type QueueScanInput,
  type RunEvent,
  type ScanJob,
} from "@/data/liveApi"

export function useProofPackDashboard() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(fallbackDashboardData)
  const [isQueueing, setIsQueueing] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [recentJob, setRecentJob] = useState<ScanJob | null>(null)
  const [jobEvents, setJobEvents] = useState<RunEvent[]>([])
  const [showAddRepository, setShowAddRepository] = useState(false)

  const refreshLiveDashboard = useCallback(async () => {
    const result = await readDashboardData()
    setDashboardData((currentData) => refreshedDashboardState(currentData, result))
  }, [])

  const refreshJobEvents = useCallback(
    async (jobId: string) => {
      const lastEventId = jobEvents.at(-1)?.id ?? 0
      const nextEvents = await readJobEvents(jobId, lastEventId)
      setJobEvents((currentEvents) => appendEvents(currentEvents, nextEvents))
    },
    [jobEvents],
  )

  useEffect(() => {
    let ignore = false

    async function loadLiveDashboard() {
      const result = await readDashboardData()
      if (!ignore) {
        setDashboardData(initialDashboardState(result))
      }
    }

    void loadLiveDashboard()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const hasOpenJob = dashboardData.jobs.some((job) =>
      ["queued", "running"].includes(job.status),
    )
    if (!hasOpenJob && !recentJob) return

    const interval = window.setInterval(() => {
      void refreshLiveDashboard()
      if (recentJob) {
        void refreshJobEvents(recentJob.id)
      }
    }, 3000)

    return () => window.clearInterval(interval)
  }, [dashboardData.jobs, recentJob, refreshJobEvents, refreshLiveDashboard])

  async function queueScan(input: QueueScanInput) {
    setIsQueueing(true)
    setQueueError(null)
    try {
      const job = await queueRepositoryScan(input)
      setRecentJob(job)
      setJobEvents([])
      await refreshLiveDashboard()
      await refreshJobEvents(job.id)
    } catch (error) {
      setQueueError(
        error instanceof Error ? error.message : "Could not queue repository scan",
      )
    } finally {
      setIsQueueing(false)
    }
  }

  return {
    dashboardData,
    isQueueing,
    jobEvents,
    queueError,
    queueScan,
    recentJob,
    setActiveDashboardData: setDashboardData,
    setShowAddRepository,
    showAddRepository,
  }
}

type DashboardReadResult =
  | { data: DashboardData; ok: true }
  | { error: unknown; ok: false }

async function readDashboardData(): Promise<DashboardReadResult> {
  try {
    return { data: await fetchDashboardData(), ok: true }
  } catch (error) {
    return { error, ok: false }
  }
}

async function readJobEvents(jobId: string, lastEventId: number) {
  try {
    return await fetchJobEvents(jobId, lastEventId)
  } catch {
    // Event replay is advisory; snapshot polling remains the source of truth.
    return []
  }
}

function initialDashboardState(result: DashboardReadResult): DashboardData {
  if (result.ok) return result.data
  return {
    ...fallbackDashboardData,
    apiStatus: "error",
    error: dashboardErrorMessage(result.error),
  }
}

function refreshedDashboardState(
  currentData: DashboardData,
  result: DashboardReadResult,
): DashboardData {
  if (result.ok) return result.data
  return {
    ...currentData,
    apiStatus: currentData.apiStatus === "live" ? "live" : "error",
    error: dashboardErrorMessage(result.error),
  }
}

function appendEvents(currentEvents: RunEvent[], nextEvents: RunEvent[]) {
  return nextEvents.length > 0 ? [...currentEvents, ...nextEvents] : currentEvents
}

function dashboardErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Worker API unavailable"
}
