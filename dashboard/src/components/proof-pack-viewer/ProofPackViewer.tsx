import { useState } from "react"

import type { DashboardData } from "@/data/liveApi"
import type { QueueFinding } from "@/data/permitQueue"
import { AgentReportPanel } from "./AgentReportPanel"
import {
  FindingQueueTable,
  type FindingQueueTableProps,
} from "./FindingQueueTable"
import { ProofPackHeader } from "./ProofPackHeader"
import { QueueSidebar, RailNav } from "./ProofPackShell"
import { useFilteredFindings } from "./useFilteredFindings"
import { useFindingRoute } from "./useFindingRoute"
import { useProofPackDashboard } from "./useProofPackDashboard"
import { useThemeMode } from "./useThemeMode"

type QueueSurfaceProps = Pick<
  FindingQueueTableProps,
  | "isQueueing"
  | "jobEvents"
  | "onCloseAddRepository"
  | "onQueueScan"
  | "onSearchChange"
  | "onSelectFinding"
  | "queueError"
  | "recentJob"
  | "search"
  | "showAddRepository"
> & {
  dashboardData: DashboardData
  filteredFindings: QueueFinding[]
  onAddRepository: () => void
  selectedFinding: QueueFinding | undefined
}

type ProofPackSurfaceProps = QueueSurfaceProps & {
  onShowQueue: () => void
  surface: "queue" | "finding"
}

export function ProofPackViewer() {
  const { setThemeMode, themeMode } = useThemeMode()
  const {
    dashboardData,
    isQueueing,
    jobEvents,
    queueError,
    queueScan,
    recentJob,
    setShowAddRepository,
    showAddRepository,
  } = useProofPackDashboard()
  const [activeView, setActiveView] = useState("all")
  const [search, setSearch] = useState("")
  const currentView = dashboardData.savedViews.some((view) => view.id === activeView)
    ? activeView
    : "all"

  const filteredFindings = useFilteredFindings({
    activeView: currentView,
    findings: dashboardData.findings,
    search,
  })
  const {
    openFinding,
    returnToQueue,
    selectedFinding,
    surface,
  } = useFindingRoute({
    fallbackFindingId: dashboardData.findings[0]?.id ?? "",
    filteredFindings,
    findings: dashboardData.findings,
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[56px_minmax(0,1fr)] lg:grid-cols-[56px_264px_minmax(0,1fr)]">
        <RailNav
          onThemeModeChange={setThemeMode}
          themeMode={themeMode}
        />

        <QueueSidebar
          activeView={currentView}
          onActiveViewChange={setActiveView}
          repos={dashboardData.repos}
          savedViews={dashboardData.savedViews}
        />

        <main className="flex min-h-screen min-w-0 flex-col md:col-start-2 lg:col-start-3">
          <ProofPackSurface
            dashboardData={dashboardData}
            filteredFindings={filteredFindings}
            isQueueing={isQueueing}
            jobEvents={jobEvents}
            onAddRepository={() => setShowAddRepository(true)}
            onCloseAddRepository={() => setShowAddRepository(false)}
            onQueueScan={queueScan}
            onSearchChange={setSearch}
            onSelectFinding={openFinding}
            onShowQueue={returnToQueue}
            queueError={queueError}
            recentJob={recentJob}
            search={search}
            selectedFinding={selectedFinding}
            showAddRepository={showAddRepository}
            surface={surface}
          />
        </main>
      </div>
    </div>
  )
}

function ProofPackSurface({
  dashboardData,
  filteredFindings,
  isQueueing,
  jobEvents,
  onAddRepository,
  onCloseAddRepository,
  onQueueScan,
  onSearchChange,
  onSelectFinding,
  onShowQueue,
  queueError,
  recentJob,
  search,
  selectedFinding,
  showAddRepository,
  surface,
}: ProofPackSurfaceProps) {
  const finding = findingForSurface(surface, selectedFinding)
  if (finding) return <FindingSurface finding={finding} onShowQueue={onShowQueue} />

  return (
    <QueueSurface
      dashboardData={dashboardData}
      filteredFindings={filteredFindings}
      isQueueing={isQueueing}
      jobEvents={jobEvents}
      onAddRepository={onAddRepository}
      onCloseAddRepository={onCloseAddRepository}
      onQueueScan={onQueueScan}
      onSearchChange={onSearchChange}
      onSelectFinding={onSelectFinding}
      queueError={queueError}
      recentJob={recentJob}
      search={search}
      selectedFinding={selectedFinding}
      showAddRepository={showAddRepository}
    />
  )
}

function FindingSurface({
  finding,
  onShowQueue,
}: {
  finding: QueueFinding
  onShowQueue: () => void
}) {
  return <AgentReportPanel finding={finding} onBack={onShowQueue} page />
}

function QueueSurface({
  dashboardData,
  filteredFindings,
  isQueueing,
  jobEvents,
  onAddRepository,
  onCloseAddRepository,
  onQueueScan,
  onSearchChange,
  onSelectFinding,
  queueError,
  recentJob,
  search,
  selectedFinding,
  showAddRepository,
}: QueueSurfaceProps) {
  return (
    <>
      <ProofPackHeader
        onAddRepository={onAddRepository}
        title="Repository findings"
      />
      <FindingQueueTable
        apiStatus={dashboardData.apiStatus}
        error={dashboardData.error}
        findings={filteredFindings}
        generatedAt={dashboardData.generatedAt}
        isQueueing={isQueueing}
        jobEvents={jobEvents}
        jobs={dashboardData.jobs}
        onCloseAddRepository={onCloseAddRepository}
        onQueueScan={onQueueScan}
        onSearchChange={onSearchChange}
        onSelectFinding={onSelectFinding}
        queueError={queueError}
        recentJob={recentJob}
        search={search}
        selectedFindingId={selectedFinding?.id ?? ""}
        showAddRepository={showAddRepository}
      />
    </>
  )
}

function findingForSurface(
  surface: "queue" | "finding",
  selectedFinding: QueueFinding | undefined,
) {
  return surface === "finding" ? selectedFinding : undefined
}
