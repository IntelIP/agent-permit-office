import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { QueueFinding } from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import { StatusBadge } from "./StatusBadge"
import {
  displayFindingTitle,
  policyCheckDescription,
  policyCheckLabel,
} from "./proofPackUtils"

export function FindingQueueTable({
  findings,
  onSearchChange,
  onSelectFinding,
  onCloseAddRepository,
  search,
  selectedFindingId,
  showAddRepository,
}: {
  findings: QueueFinding[]
  onCloseAddRepository: () => void
  onSearchChange: (value: string) => void
  onSelectFinding: (finding: QueueFinding) => void
  search: string
  selectedFindingId: string
  showAddRepository: boolean
}) {
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
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by finding, policy, or repository"
              value={search}
            />
          </label>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-6 py-6">
          {showAddRepository ? (
            <AddRepositoryPanel onClose={onCloseAddRepository} />
          ) : null}

          <div className="grid grid-cols-[minmax(360px,1fr)_136px_minmax(260px,0.75fr)_minmax(150px,0.45fr)_96px] items-center gap-4 border-b border-border py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground max-xl:grid-cols-[minmax(260px,1fr)_128px_minmax(240px,0.8fr)] max-xl:[&>div:nth-child(n+4)]:hidden max-sm:hidden">
            <div className="pl-4">Risk</div>
            <div>Status</div>
            <div>Policy check</div>
            <div>Repository</div>
            <div>Scan date</div>
          </div>

          <div>
            {findings.map((finding) => (
              <button
                className={cn(
                  "grid w-full grid-cols-[minmax(360px,1fr)_136px_minmax(260px,0.75fr)_minmax(150px,0.45fr)_96px] items-center gap-4 border-b border-border/80 py-4 text-left transition-colors hover:bg-muted/30 max-xl:grid-cols-[minmax(260px,1fr)_128px_minmax(240px,0.8fr)] max-sm:grid-cols-1 max-sm:gap-2",
                  selectedFindingId === finding.id && "bg-primary/5",
                )}
                data-finding-id={finding.id}
                key={finding.id}
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
            ))}

            {findings.length === 0 ? (
              <div className="border-b border-border/80 py-16 text-center text-sm text-muted-foreground">
                No repositories match this search or status filter.
              </div>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </section>
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

function AddRepositoryPanel({ onClose }: { onClose: () => void }) {
  const [repoUrl, setRepoUrl] = useState("")
  const [branch, setBranch] = useState("main")
  const [queuedRepo, setQueuedRepo] = useState("")

  function queueRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedRepoUrl = repoUrl.trim()
    if (!trimmedRepoUrl) return
    setQueuedRepo(trimmedRepoUrl)
  }

  return (
    <div className="mb-5 rounded-lg border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Queue a repository scan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a GitHub repository URL and branch to stage a scan request.
          </p>
        </div>
        <Button onClick={onClose} size="sm" variant="ghost">
          Close
        </Button>
      </div>

      <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]" onSubmit={queueRepository}>
        <Input
          aria-label="Repository URL"
          onChange={(event) => setRepoUrl(event.target.value)}
          placeholder="https://github.com/org/repo"
          value={repoUrl}
        />
        <Input
          aria-label="Default branch"
          onChange={(event) => setBranch(event.target.value)}
          placeholder="main"
          value={branch}
        />
        <Button disabled={repoUrl.trim().length === 0} type="submit">
          Stage scan
        </Button>
      </form>

      {queuedRepo ? (
        <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Scan staged for {queuedRepo} on {branch.trim() || "main"}.
        </div>
      ) : null}
    </div>
  )
}
