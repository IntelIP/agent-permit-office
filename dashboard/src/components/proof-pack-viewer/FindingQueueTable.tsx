import { MagnifyingGlassIcon } from "@phosphor-icons/react"

import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ApiStatus, QueueScanInput, RunEvent, ScanJob } from "@/data/liveApi"
import type { QueueFinding } from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import {
  AddRepositoryPanel,
  LiveStatusStrip,
  QueueProgressPanel,
} from "./QueueStatusPanels"
import { StatusBadge } from "./StatusBadge"
import {
  displayFindingTitle,
  policyCheckDescription,
  policyCheckLabel,
} from "./proofPackUtils"

export type FindingQueueTableProps = {
  apiStatus: ApiStatus
  error: string | null
  findings: QueueFinding[]
  generatedAt: string | null
  isQueueing: boolean
  jobEvents: RunEvent[]
  jobs: ScanJob[]
  onCloseAddRepository: () => void
  onQueueScan: (input: QueueScanInput) => Promise<void>
  onSearchChange: (value: string) => void
  onSelectFinding: (finding: QueueFinding) => void
  queueError: string | null
  recentJob: ScanJob | null
  search: string
  selectedFindingId: string
  showAddRepository: boolean
}

export function FindingQueueTable({
  apiStatus,
  error,
  findings,
  generatedAt,
  isQueueing,
  jobEvents,
  jobs,
  onQueueScan,
  onSearchChange,
  onSelectFinding,
  onCloseAddRepository,
  queueError,
  recentJob,
  search,
  selectedFindingId,
  showAddRepository,
}: FindingQueueTableProps) {
  const activeJobs = jobs.filter((job) =>
    ["queued", "running"].includes(job.status),
  )

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-6 py-5">
        <div className="grid gap-5">
          <label className="relative block min-w-0">
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <Input
              aria-label="Search findings"
              className="h-10 rounded-lg border-border bg-background pl-9"
              data-testid="finding-search"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by finding, policy, or repository"
              value={search}
            />
          </label>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-6">
          <LiveStatusStrip
            apiStatus={apiStatus}
            error={error}
            generatedAt={generatedAt}
            jobs={activeJobs}
          />

          <QueueOptionalPanels
            activeJobs={activeJobs}
            isQueueing={isQueueing}
            jobEvents={jobEvents}
            onCloseAddRepository={onCloseAddRepository}
            onQueueScan={onQueueScan}
            queueError={queueError}
            recentJob={recentJob}
            showAddRepository={showAddRepository}
          />

          <FindingsTableHeader />

          <FindingsRows
            findings={findings}
            onSelectFinding={onSelectFinding}
            selectedFindingId={selectedFindingId}
          />
        </div>
      </ScrollArea>
    </section>
  )
}

function QueueOptionalPanels({
  activeJobs,
  isQueueing,
  jobEvents,
  onCloseAddRepository,
  onQueueScan,
  queueError,
  recentJob,
  showAddRepository,
}: {
  activeJobs: ScanJob[]
  isQueueing: boolean
  jobEvents: RunEvent[]
  onCloseAddRepository: () => void
  onQueueScan: (input: QueueScanInput) => Promise<void>
  queueError: string | null
  recentJob: ScanJob | null
  showAddRepository: boolean
}) {
  return (
    <>
      {showAddRepository ? (
        <AddRepositoryPanel
          isQueueing={isQueueing}
          onClose={onCloseAddRepository}
          onQueueScan={onQueueScan}
          queueError={queueError}
          recentJob={recentJob}
        />
      ) : null}

      {recentJob || activeJobs.length > 0 || jobEvents.length > 0 ? (
        <QueueProgressPanel
          activeJobs={activeJobs}
          events={jobEvents}
          job={recentJob}
        />
      ) : null}
    </>
  )
}

function FindingsTableHeader() {
  return (
    <div className="grid grid-cols-[minmax(360px,1fr)_136px_minmax(260px,0.75fr)_minmax(150px,0.45fr)_96px] items-center gap-4 border-b border-border py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground max-xl:grid-cols-[minmax(260px,1fr)_128px_minmax(240px,0.8fr)] max-xl:[&>div:nth-child(n+4)]:hidden max-sm:hidden">
      <div className="pl-4">Risk</div>
      <div>Status</div>
      <div>Policy check</div>
      <div>Repository</div>
      <div>Scan date</div>
    </div>
  )
}

function FindingsRows({
  findings,
  onSelectFinding,
  selectedFindingId,
}: {
  findings: QueueFinding[]
  onSelectFinding: (finding: QueueFinding) => void
  selectedFindingId: string
}) {
  if (findings.length === 0) return <EmptyFindingsState />

  return (
    <div>
      {findings.map((finding) => (
        <FindingRow
          finding={finding}
          isSelected={selectedFindingId === finding.id}
          key={finding.id}
          onSelectFinding={onSelectFinding}
        />
      ))}
    </div>
  )
}

function FindingRow({
  finding,
  isSelected,
  onSelectFinding,
}: {
  finding: QueueFinding
  isSelected: boolean
  onSelectFinding: (finding: QueueFinding) => void
}) {
  return (
    <button
      className={cn(
        "grid w-full grid-cols-[minmax(360px,1fr)_136px_minmax(260px,0.75fr)_minmax(150px,0.45fr)_96px] items-center gap-4 border-b border-border/80 py-4 text-left transition-colors hover:bg-muted/30 max-xl:grid-cols-[minmax(260px,1fr)_128px_minmax(240px,0.8fr)] max-sm:grid-cols-1 max-sm:gap-2",
        isSelected && "bg-primary/5",
      )}
      data-finding-id={finding.id}
      data-testid="finding-row"
      onClick={() => onSelectFinding(finding)}
      type="button"
    >
      <div className="min-w-0 pl-4">
        <div className="line-clamp-2 text-sm font-semibold leading-5">
          {displayFindingTitle(finding)}
        </div>
      </div>
      <StatusBadge status={finding.status} />
      <PolicyCheck finding={finding} />
      <span className="break-words text-sm text-muted-foreground max-xl:hidden">
        {finding.repo}
      </span>
      <span className="whitespace-nowrap text-sm text-muted-foreground max-xl:hidden">
        {finding.age}
      </span>
    </button>
  )
}

function EmptyFindingsState() {
  return (
    <div className="border-b border-border/80 py-16 text-center text-sm text-muted-foreground">
      No repositories match this search or status filter.
    </div>
  )
}

function PolicyCheck({ finding }: { finding: QueueFinding }) {
  const label = policyCheckLabel(finding)
  const description = policyCheckDescription(finding)

  return (
    <span className="grid min-w-0 gap-1 text-sm leading-5" title={description}>
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-xs leading-5 text-muted-foreground">
        {description}
      </span>
    </span>
  )
}
