import {
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ApiStatus, QueueScanInput, RunEvent, ScanJob } from "@/data/liveApi"

const RUNNER_COMMAND =
  "set -a; source .env; set +a; uv run --extra db --extra deep-agent agent-permit runner --once --deep-agent auto --agent-recursion-limit 20"

export function LiveStatusStrip({
  apiStatus,
  error,
  generatedAt,
  jobs,
}: {
  apiStatus: ApiStatus
  error: string | null
  generatedAt: string | null
  jobs: ScanJob[]
}) {
  const isLive = apiStatus === "live"
  const statusLabel = liveStatusLabel(apiStatus)
  const statusDetail = liveStatusDetail(apiStatus, generatedAt, error)
  const jobSummary = liveJobSummary(jobs)

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 text-sm text-muted-foreground">
      <div className="flex min-w-0 items-center gap-2">
        {isLive ? (
          <CheckCircleIcon className="text-apo-approved" size={16} weight="fill" />
        ) : (
          <WarningCircleIcon className="text-apo-review" size={16} weight="fill" />
        )}
        <span className="font-medium text-foreground">{statusLabel}</span>
        <span className="truncate">{statusDetail}</span>
      </div>
      {jobSummary ? (
        <span className="shrink-0 font-mono text-xs">{jobSummary}</span>
      ) : null}
    </div>
  )
}

export function AddRepositoryPanel({
  isQueueing,
  onClose,
  onQueueScan,
  queueError,
  recentJob,
}: {
  isQueueing: boolean
  onClose: () => void
  onQueueScan: (input: QueueScanInput) => Promise<void>
  queueError: string | null
  recentJob: ScanJob | null
}) {
  const [repositoryTarget, setRepositoryTarget] = useState("")
  const [label, setLabel] = useState("")
  const [branch, setBranch] = useState("")

  async function queueRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitQueuedRepository({ branch, label, onQueueScan, repositoryTarget })
  }

  return (
    <div className="mb-5 rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Queue a GitHub repository</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a GitHub repository URL. The local CLI runner clones it, scans it,
            and updates this dashboard.
          </p>
        </div>
        <Button onClick={onClose} size="sm" variant="ghost">
          Close
        </Button>
      </div>

      <form
        className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.35fr)_140px_auto]"
        data-testid="queue-scan-form"
        onSubmit={queueRepository}
      >
        <Input
          aria-label="GitHub repository URL or local path"
          autoFocus
          data-testid="queue-scan-path"
          onChange={(event) => setRepositoryTarget(event.target.value)}
          placeholder="https://github.com/owner/repository"
          value={repositoryTarget}
        />
        <Input
          aria-label="Repository label"
          data-testid="queue-scan-label"
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Repository label"
          value={label}
        />
        <Input
          aria-label="Default branch"
          data-testid="queue-scan-branch"
          onChange={(event) => setBranch(event.target.value)}
          placeholder="Default branch"
          value={branch}
        />
        <QueueSubmitButton
          isQueueing={isQueueing}
          repositoryTarget={repositoryTarget}
        />
      </form>

      <RunnerInstructions />
      <QueueErrorMessage queueError={queueError} />
      <RecentJobNotice recentJob={recentJob} />
    </div>
  )
}

async function submitQueuedRepository({
  branch,
  label,
  onQueueScan,
  repositoryTarget,
}: {
  branch: string
  label: string
  onQueueScan: (input: QueueScanInput) => Promise<void>
  repositoryTarget: string
}) {
  const trimmedTarget = repositoryTarget.trim()
  if (!trimmedTarget) return
  await onQueueScan({
    branch,
    label,
    repositoryTarget: trimmedTarget,
  })
}

function QueueSubmitButton({
  isQueueing,
  repositoryTarget,
}: {
  isQueueing: boolean
  repositoryTarget: string
}) {
  return (
    <Button
      data-testid="queue-scan-submit"
      disabled={repositoryTarget.trim().length === 0 || isQueueing}
      type="submit"
    >
      {isQueueing ? "Queueing" : "Queue scan job"}
    </Button>
  )
}

function RunnerInstructions() {
  return (
    <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">After queueing, run this from the repo root:</div>
      <code
        className="mt-2 block overflow-x-auto rounded border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
        data-testid="runner-command"
      >
        {RUNNER_COMMAND}
      </code>
      <p className="mt-2">
        The hosted dashboard cannot scan code directly. The local runner claims the
        queued job, clones GitHub URLs into a local worktree, writes artifacts, and
        updates this view. Absolute local paths still work for advanced scans.
      </p>
    </div>
  )
}

function QueueErrorMessage({ queueError }: { queueError: string | null }) {
  if (!queueError) return null

  return (
    <div className="mt-3 rounded-md border border-apo-blocked-border bg-apo-blocked-soft px-3 py-2 text-sm text-apo-blocked">
      {queueError}
    </div>
  )
}

function RecentJobNotice({ recentJob }: { recentJob: ScanJob | null }) {
  if (!recentJob) return null

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      {jobStatusMessage(recentJob)}
    </div>
  )
}

export function QueueProgressPanel({
  activeJobs = [],
  events,
  job,
}: {
  activeJobs?: ScanJob[]
  events: RunEvent[]
  job: ScanJob | null
}) {
  const visibleJob = job ?? activeJobs[0] ?? null

  return (
    <div className="mb-5 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Scan handoff</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {visibleJob
              ? jobStatusMessage(visibleJob)
              : "Waiting for runner events."}
          </p>
        </div>
        {visibleJob ? (
          <span className="rounded-full border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
            {visibleJob.id}
          </span>
        ) : null}
      </div>

      {events.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {events.slice(-5).map((event) => (
            <div
              className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-sm"
              key={event.id}
            >
              <span className="font-mono text-xs text-muted-foreground">
                {event.eventName}
              </span>
              <span className="truncate text-muted-foreground">
                {eventSummary(event)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-muted-foreground">
          No runner events yet. Start the local CLI runner to process this job.
        </div>
      )}
    </div>
  )
}

function jobStatusMessage(job: ScanJob) {
  if (job.status === "queued") {
    return `${job.repositoryLabel} is queued. Start the local runner to clone and scan it.`
  }
  if (job.status === "running") {
    return `${job.repositoryLabel} is running. The local runner is scanning and writing artifacts.`
  }
  if (job.status === "completed") {
    return `${job.repositoryLabel} completed. Refreshing findings from the Worker API.`
  }
  if (job.status === "failed") {
    return `${job.repositoryLabel} failed. ${job.error ?? "Review runner logs."}`
  }
  return `${job.repositoryLabel} status: ${job.status}.`
}

function liveStatusLabel(apiStatus: ApiStatus) {
  const labels: Record<ApiStatus, string> = {
    error: "Worker API unavailable",
    loading: "Loading Worker data",
    live: "Live Worker data",
    static: "Static snapshot mode",
  }
  return labels[apiStatus]
}

function liveStatusDetail(
  apiStatus: ApiStatus,
  generatedAt: string | null,
  error: string | null,
) {
  if (apiStatus === "loading") return "Reading the latest scan snapshot."
  if (apiStatus === "live") return `Last read ${formatTimestamp(generatedAt)}`
  return error || "Start the Worker API to queue and refresh scans."
}

function liveJobSummary(jobs: ScanJob[]) {
  if (jobs.length === 0) return null
  const failedJobs = jobs.filter((job) => job.status === "failed").length
  if (failedJobs > 0) return pluralizeCount(failedJobs, "failed job")
  return pluralizeCount(jobs.length, "open job")
}

function pluralizeCount(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

function eventSummary(event: RunEvent) {
  const status = event.payload.status
  const findings = event.payload.findings
  if (typeof status === "string") return status
  if (typeof findings === "number") return `${findings} findings`
  return formatTimestamp(event.occurredAt)
}

function formatTimestamp(value: string | null) {
  if (!value) return "not yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}
