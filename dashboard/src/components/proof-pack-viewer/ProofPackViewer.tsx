import {
  ArrowLeftIcon,
  DesktopIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from "@phosphor-icons/react"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  artifactPreviews,
  agentTraceSteps,
  decisionLog,
  proofPack,
  queueFindings,
  repos,
  savedViews,
  type QueueFinding,
  type RepoSnapshot,
  type SavedView,
} from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import { AgentReportPanel } from "./AgentReportPanel"
import { FindingQueueTable } from "./FindingQueueTable"
import { ProofPackHeader } from "./ProofPackHeader"
import { searchableFindingText } from "./proofPackUtils"

type ThemeMode = "system" | "light" | "dark"

export function ProofPackViewer() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system")
  const [activeView, setActiveView] = useState(savedViews[0]?.id ?? "all")
  const [search, setSearch] = useState("")
  const [showAddRepository, setShowAddRepository] = useState(false)
  const initialFindingId = useMemo(() => getValidFindingIdFromUrl(), [])
  const [selectedFindingId, setSelectedFindingId] = useState(
    initialFindingId ?? queueFindings[0]?.id ?? "",
  )
  const [surface, setSurface] = useState<"queue" | "finding">(
    initialFindingId ? "finding" : "queue",
  )

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function applyThemeMode() {
      const resolvedTheme = themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    }

    applyThemeMode()
    media.addEventListener("change", applyThemeMode)
    return () => media.removeEventListener("change", applyThemeMode)
  }, [themeMode])

  useEffect(() => {
    function syncFromUrl() {
      const findingId = getValidFindingIdFromUrl()
      if (findingId) {
        setSelectedFindingId(findingId)
        setSurface("finding")
        return
      }
      setSurface("queue")
    }

    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener("hashchange", syncFromUrl)
    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener("hashchange", syncFromUrl)
    }
  }, [])

  const filteredFindings = useMemo(() => {
    const query = search.trim().toLowerCase()

    return queueFindings.filter((finding) => {
      const viewMatch =
        activeView === "all" ||
        finding.status === activeView ||
        (activeView === "needs-review" && finding.status === "needs-review")
      const queryMatch =
        query.length === 0 ||
        searchableFindingText(finding)
          .toLowerCase()
          .includes(query)

      return viewMatch && queryMatch
    })
  }, [activeView, search])

  const selectedFinding =
    queueFindings.find((finding) => finding.id === selectedFindingId) ??
    filteredFindings.find((finding) => finding.id === selectedFindingId) ??
    filteredFindings[0] ??
    queueFindings[0]

  function openFinding(finding: QueueFinding) {
    setSelectedFindingId(finding.id)
    setSurface("finding")
    window.history.pushState(null, "", `?finding=${encodeURIComponent(finding.id)}`)
    window.scrollTo({ top: 0 })
  }

  function returnToQueue() {
    setSurface("queue")
    window.history.pushState(null, "", window.location.pathname)
    window.scrollTo({ top: 0 })
  }

  const isFindingSurface = surface === "finding" && selectedFinding

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[56px_minmax(0,1fr)] lg:grid-cols-[56px_264px_minmax(0,1fr)]">
        <RailNav
          onThemeModeChange={setThemeMode}
          themeMode={themeMode}
        />

        <QueueSidebar
          activeView={activeView}
          onActiveViewChange={setActiveView}
          repos={repos}
          savedViews={savedViews}
        />

        <main className="flex min-h-screen min-w-0 flex-col md:col-start-2 lg:col-start-3">
          <ProofPackHeader
            onAddRepository={() => setShowAddRepository(true)}
            title={isFindingSurface ? "Finding evidence" : "Repository findings"}
          />

          {isFindingSurface ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-5 py-3">
                <Button onClick={returnToQueue} size="sm" variant="ghost">
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back to repository findings
                </Button>
              </div>
              <AgentReportPanel
                artifactPreviews={artifactPreviews}
                decisionLog={decisionLog}
                finding={selectedFinding}
                page
                proofPack={proofPack}
                traceSteps={agentTraceSteps}
              />
            </section>
          ) : (
            <FindingQueueTable
              findings={filteredFindings}
              onSearchChange={setSearch}
              onSelectFinding={openFinding}
              search={search}
              selectedFindingId={selectedFinding?.id ?? ""}
              showAddRepository={showAddRepository}
              onCloseAddRepository={() => setShowAddRepository(false)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function getFindingIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const queryFinding = params.get("finding")
  if (queryFinding) return queryFinding

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\??/, ""))
  return hashParams.get("finding")
}

function getValidFindingIdFromUrl() {
  const findingId = getFindingIdFromUrl()
  if (!findingId) return null
  return queueFindings.some((finding) => finding.id === findingId) ? findingId : null
}

function RailNav({
  onThemeModeChange,
  themeMode,
}: {
  onThemeModeChange: (mode: ThemeMode) => void
  themeMode: ThemeMode
}) {
  const nextThemeMode = getNextThemeMode(themeMode)
  const ThemeIcon =
    themeMode === "system" ? DesktopIcon : themeMode === "dark" ? MoonIcon : SunIcon

  return (
    <nav className="sticky top-0 hidden h-screen min-h-0 flex-col overflow-hidden border-r border-border bg-background md:flex">
      <div className="flex h-20 w-full shrink-0 items-center justify-center border-b border-border">
        <div className="grid size-9 place-items-center rounded-xl border border-primary/50 bg-primary/10 text-primary">
          <ShieldCheckIcon size={18} weight="fill" />
        </div>
      </div>
      <div className="flex-1" />
      <Button
        aria-label={`Theme mode: ${themeMode}`}
        className="mb-3"
        onClick={() => onThemeModeChange(nextThemeMode)}
        size="icon-sm"
        title={`Theme: ${themeMode}. Click to cycle modes.`}
        variant="ghost"
      >
        <ThemeIcon />
      </Button>
    </nav>
  )
}

function getNextThemeMode(themeMode: ThemeMode): ThemeMode {
  if (themeMode === "system") return "light"
  if (themeMode === "light") return "dark"
  return "system"
}

function QueueSidebar({
  activeView,
  onActiveViewChange,
  repos,
  savedViews,
}: {
  activeView: string
  onActiveViewChange: (viewId: string) => void
  repos: RepoSnapshot[]
  savedViews: SavedView[]
}) {
  return (
    <aside className="sticky top-0 hidden h-screen min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-background lg:flex">
      <div className="flex h-20 shrink-0 items-center border-b border-border px-6">
        <div>
          <div className="text-lg font-semibold leading-5">PermitGraph</div>
          <div className="mt-1 text-xs text-muted-foreground">Repository scan review</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="px-3 py-5">
          <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Scan status
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {savedViews.map((view) => (
              <button
                className={cn(
                  "grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  activeView === view.id && "bg-muted text-foreground",
                )}
                key={view.id}
                onClick={() => onActiveViewChange(view.id)}
                type="button"
              >
                <span
                  className={cn(
                    "size-1.5 justify-self-center rounded-full border border-muted-foreground",
                    activeView === view.id && "border-primary bg-primary",
                  )}
                />
                <span className="truncate">{view.label}</span>
                <span className="font-mono text-xs text-muted-foreground">{view.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-3 py-2">
          <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Scanned repositories
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {repos.slice(0, 4).map((repo) => (
              <div
                className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2 text-sm text-muted-foreground"
                key={repo.id}
              >
                <span className="size-1.5 justify-self-center rounded-full border border-muted-foreground" />
                <span className="truncate">{repo.label}</span>
                <span className="font-mono text-xs">{repo.counts.findings}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
