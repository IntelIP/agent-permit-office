import {
  CheckCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ApiStatus, QueueScanInput, RunEvent, ScanJob } from "@/data/liveApi"

const RUNNER_COMMAND =
  "set -a; source .env; set +a; uv run --extra db --extra deep-agent agent-permit runner --once --deep-agent auto"

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
  const [localPath, setLocalPath] = useState("")
  const [label, setLabel] = useState("")
  const [branch, setBranch] = useState("main")

  async function queueRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitQueuedRepository({ branch, label, localPath, onQueueScan })
  }

  return (
    <div className="mb-5 rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Queue a local repository</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates a Postgres job. The scan starts when you run the local CLI
            runner on this machine.
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
          aria-label="Local repository path"
          autoFocus
          data-testid="queue-scan-path"
          onChange={(event) => setLocalPath(event.target.value)}
          placeholder="/absolute/path/to/repository"
          value={localPath}
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
          placeholder="main"
          value={branch}
        />
        <QueueSubmitButton isQueueing={isQueueing} localPath={localPath} />
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
  localPath,
  onQueueScan,
}: {
  branch: string
  label: string
  localPath: string
  onQueueScan: (input: QueueScanInput) => Promise<void>
}) {
  const trimmedPath = localPath.trim()
  if (!trimmedPath) return
  await onQueueScan({
    branch,
    label,
    localPath: trimmedPath,
  })
}

function QueueSubmitButton({
  isQueueing,
  localPath,
}: {
  isQueueing: boolean
  localPath: string
}) {
  return (
    <Button
      data-testid="queue-scan-submit"
      disabled={localPath.trim().length === 0 || isQueueing}
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
        The hosted dashboard cannot read your local filesystem. The local runner
        claims the queued job, scans the path, writes artifacts, and updates this view.
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
      Job queued for {recentJob.repositoryLabel}. Run the local runner command above
      to start the scan.
    </div>
  )
}

export function QueueProgressPanel({
  events,
  job,
}: {
  events: RunEvent[]
  job: ScanJob | null
}) {
  return (
    <div className="mb-5 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Latest queued scan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {job
              ? `${job.repositoryLabel} is ${job.status}.`
              : "Waiting for runner events."}
          </p>
        </div>
        {job ? (
          <span className="rounded-full border border-border px-2 py-1 font-mono text-xs text-muted-foreground">
            {job.id}
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
