import { useMemo, useState } from "react"
import {
  ArchiveBoxIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  DatabaseIcon,
  DownloadSimpleIcon,
  FileSearchIcon,
  FlowArrowIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PulseIcon,
  RobotIcon,
  ShieldCheckIcon,
  SunIcon,
  WarningDiamondIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  agentTraceSteps,
  artifactPreviews,
  policyControls,
  queueFindings,
  queueSummary,
  runMeta,
  savedViews,
  type AgentTraceStep,
  type ArtifactPreview,
  type PermitStatus,
  type QueueSummary,
  type QueueFinding,
  type Severity,
  type TraceState,
} from "@/data/permitQueue"

const statusLabels: Record<PermitStatus, string> = {
  approved: "Approved",
  "needs-review": "Needs review",
  blocked: "Blocked",
}

const severityLabels: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

const traceLabels: Record<TraceState, string> = {
  passed: "Passed",
  review: "Review",
  blocked: "Blocked",
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a"
  }
  return `${Math.round(value * 100)}%`
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value)
}

function evidenceLocation(finding: QueueFinding) {
  return finding.line > 0 ? `${finding.path}:${finding.line}` : finding.path
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  return `${Math.round(bytes / 1024)} KB`
}

function artifactLabel(artifact: string) {
  if (artifact.startsWith("http")) {
    return "External source"
  }
  return artifact.split("/").at(-1) ?? artifact
}

function StatusBadge({ status }: { status: PermitStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("apo-status-badge", `is-${status}`)}
    >
      {status === "approved" ? (
        <CheckCircleIcon data-icon="inline-start" weight="fill" />
      ) : status === "blocked" ? (
        <XCircleIcon data-icon="inline-start" weight="fill" />
      ) : (
        <WarningDiamondIcon data-icon="inline-start" weight="fill" />
      )}
      {statusLabels[status]}
    </Badge>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={cn("apo-severity-badge", `is-${severity}`)}
    >
      {severityLabels[severity]}
    </Badge>
  )
}

function TraceBadge({ state }: { state: TraceState }) {
  return (
    <Badge variant="outline" className={cn("apo-trace-badge", `is-${state}`)}>
      {state === "passed" ? (
        <CheckCircleIcon data-icon="inline-start" weight="fill" />
      ) : state === "blocked" ? (
        <XCircleIcon data-icon="inline-start" weight="fill" />
      ) : (
        <WarningDiamondIcon data-icon="inline-start" weight="fill" />
      )}
      {traceLabels[state]}
    </Badge>
  )
}

function AppSidebar({ summary }: { summary: QueueSummary }) {
  return (
    <aside className="apo-sidebar" aria-label="Dashboard navigation">
      <div className="apo-brand">
        <div className="apo-brand-mark">
          <ShieldCheckIcon weight="fill" />
        </div>
        <div>
          <div className="apo-brand-title">Agent Permit</div>
          <div className="apo-brand-subtitle">Office</div>
        </div>
      </div>

      <div className="apo-sidebar-panel" aria-label="Current dashboard context">
        <div className="apo-sidebar-kicker">Current surface</div>
        <div className="apo-sidebar-title">
          <FileSearchIcon weight="fill" />
          <span>Findings queue</span>
        </div>
        <p>Review live validation findings, Deep Agent evidence, and permit decisions.</p>
        <div className="apo-sidebar-stats">
          <span>{summary.findings} findings</span>
          <span>{summary.repos} repos</span>
        </div>
      </div>
    </aside>
  )
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: "light" | "dark"
  onChange: () => void
}) {
  return (
    <Button
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="apo-theme-toggle"
      data-testid="theme-toggle"
      onClick={onChange}
      size="icon-sm"
      variant="outline"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}

function DashboardHeader({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark"
  onThemeChange: () => void
}) {
  return (
    <header className="apo-header">
      <div className="apo-header-title">
        <h1>{runMeta.title}</h1>
        <div className="apo-header-meta">
          <span>{runMeta.repo}</span>
          <span>{runMeta.branch}</span>
          <span>{runMeta.runId}</span>
        </div>
      </div>

      <div className="apo-header-actions">
        <ThemeToggle onChange={onThemeChange} theme={theme} />
        <Button variant="outline">
          <ArchiveBoxIcon data-icon="inline-start" />
          Artifacts
        </Button>
        <Button>
          <DownloadSimpleIcon data-icon="inline-start" />
          Export
        </Button>
      </div>
    </header>
  )
}

function SectionIntro({
  description,
  label,
  title,
}: {
  description: string
  label: string
  title: string
}) {
  return (
    <div className="apo-section-intro">
      <div className="apo-section-label">{label}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

function SavedViews({
  activeView,
  onChange,
}: {
  activeView: string
  onChange: (view: string) => void
}) {
  return (
    <div className="apo-saved-views" aria-label="Saved views">
      {savedViews.map((view) => (
        <button
          className={cn("apo-saved-view", activeView === view.id && "is-active")}
          data-testid={`saved-view-${view.id}`}
          key={view.id}
          onClick={() => onChange(view.id)}
          type="button"
        >
          <span>{view.label}</span>
          <span>{view.count}</span>
        </button>
      ))}
    </div>
  )
}

function FilterBar({
  search,
  severity,
  onSearchChange,
  onSeverityChange,
}: {
  search: string
  severity: string
  onSearchChange: (value: string) => void
  onSeverityChange: (value: string) => void
}) {
  return (
    <section className="apo-filter-bar" aria-label="Queue filters">
      <div className="apo-search-control">
        <MagnifyingGlassIcon />
        <Input
          aria-label="Search findings"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search rule, file, capability"
          value={search}
        />
      </div>

      <Select onValueChange={onSeverityChange} value={severity}>
        <SelectTrigger className="apo-select-trigger">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </section>
  )
}

function SummaryTiles({ summary }: { summary: QueueSummary }) {
  return (
    <div className="apo-summary-grid" aria-label="Queue summary">
      <MetricTile
        icon={WarningDiamondIcon}
        label="Findings"
        note={`${summary.repos} repos scanned`}
        tone="review"
        value={summary.findings.toString()}
      />
      <MetricTile
        icon={XCircleIcon}
        label="Blocked repos"
        note="Must fix first"
        tone="blocked"
        value={summary.blockedRepos.toString()}
      />
      <MetricTile
        icon={RobotIcon}
        label="Citation coverage"
        note="Deep Agent grounded"
        tone="agent"
        value={formatPercent(summary.citationCoverage)}
      />
      <MetricTile
        icon={PulseIcon}
        label="Cache hit"
        note={`${formatCompact(summary.cachedTokens)} cached tokens`}
        tone="artifact"
        value={formatPercent(summary.cacheHitRatio)}
      />
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  note,
  tone,
  value,
}: {
  icon: typeof WarningDiamondIcon
  label: string
  note: string
  tone: string
  value: string
}) {
  return (
    <div className={cn("apo-metric-tile", `is-${tone}`)}>
      <div className="apo-metric-icon">
        <Icon weight="duotone" />
      </div>
      <div>
        <div className="apo-metric-value">{value}</div>
        <div className="apo-metric-label">{label}</div>
        <div className="apo-metric-note">{note}</div>
      </div>
    </div>
  )
}

function FindingsTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: QueueFinding[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <Card className="apo-table-panel">
      <div className="apo-table-pinned">
        <div className="apo-detail-kicker">Findings spreadsheet</div>
        <div className="apo-detail-title-row">
          <h2>Review queue</h2>
          <span className="apo-sort-label">Sorted by risk</span>
        </div>
        <p>{rows.length} validation rows. Select a row to inspect evidence.</p>
      </div>
      <CardContent className="apo-table-content">
        <div className="apo-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Finding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Capability</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Commit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  className="apo-finding-row"
                  data-state={row.id === selectedId ? "selected" : undefined}
                  data-testid={`finding-row-${row.id}`}
                  key={row.id}
                  onClick={() => onSelect(row.id)}
                  tabIndex={0}
                >
                  <TableCell className="apo-finding-main-cell">
                    <div className="apo-finding-title">{row.title}</div>
                    <div className="apo-finding-meta">
                      <span>{row.id}</span>
                      <span>{row.repo}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={row.severity} />
                  </TableCell>
                  <TableCell className="apo-rule-cell">{row.rule}</TableCell>
                  <TableCell className="apo-path-cell">{evidenceLocation(row)}</TableCell>
                  <TableCell>{row.capability}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell className="apo-age-cell">{row.age}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRail({
  finding,
  onArtifactOpen,
}: {
  finding: QueueFinding
  onArtifactOpen: (artifact: string) => void
}) {
  const relatedTraceSteps = agentTraceSteps.filter((step) =>
    finding.traceIds.includes(step.id),
  )

  return (
    <aside className="apo-detail-rail" aria-label="Selected finding detail">
      <div className="apo-detail-pinned">
        <div className="apo-detail-kicker">Selected finding evidence</div>
        <div className="apo-detail-title-row">
          <h2>{finding.id}</h2>
          <StatusBadge status={finding.status} />
        </div>
        <p>{finding.summary}</p>
        <div className="apo-decision-actions">
          <Button variant="outline" size="sm">
            Request changes
          </Button>
          <Button size="sm">Approve exception</Button>
        </div>
      </div>

      <Tabs defaultValue="evidence" className="apo-detail-tabs">
        <TabsList className="apo-detail-tab-list">
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        <ScrollArea className="apo-detail-scroll">
          <TabsContent value="evidence">
            <EvidenceTab finding={finding} onArtifactOpen={onArtifactOpen} />
          </TabsContent>
          <TabsContent value="trace">
            <TraceTab steps={relatedTraceSteps} />
          </TabsContent>
          <TabsContent value="policy">
            <PolicyTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}

function EvidenceTab({
  finding,
  onArtifactOpen,
}: {
  finding: QueueFinding
  onArtifactOpen: (artifact: string) => void
}) {
  return (
    <div className="apo-detail-section-stack">
      <section className="apo-detail-section">
        <div className="apo-section-heading">
          <FileSearchIcon />
          Scanner evidence
        </div>
        <p>{finding.evidence}</p>
        <div className="apo-code-line">
          <span>{finding.path}</span>
          <span>{finding.line > 0 ? `line ${finding.line}` : "artifact"}</span>
        </div>
      </section>

      <section className="apo-detail-section">
        <div className="apo-section-heading">
          <FlowArrowIcon />
          Capability path
        </div>
        <div className="apo-path-chain">
          <span>repo file</span>
          <span>tool context</span>
          <span>{finding.capability}</span>
        </div>
      </section>

      <section className="apo-detail-section">
        <div className="apo-section-heading">
          <ArchiveBoxIcon />
          Artifacts
        </div>
        <div className="apo-artifact-list">
          {finding.artifacts.map((artifact) => (
            <button
              className="apo-artifact-row"
              data-artifact={artifact}
              data-testid="artifact-row"
              key={artifact}
              onClick={() => onArtifactOpen(artifact)}
              type="button"
            >
              <DatabaseIcon />
              <span>{artifact}</span>
              <ArrowSquareOutIcon />
            </button>
          ))}
        </div>
      </section>

      <section className="apo-detail-section">
        <div className="apo-section-heading">
          <ShieldCheckIcon />
          Remediation
        </div>
        <p>{finding.remediation}</p>
      </section>
    </div>
  )
}

function TraceTab({ steps }: { steps: AgentTraceStep[] }) {
  return (
    <div className="apo-detail-section-stack">
      {steps.map((step) => (
        <section className="apo-trace-step" key={step.id}>
          <div className="apo-trace-step-header">
            <div>
              <div className="apo-trace-title">{step.label}</div>
              <div className="apo-trace-meta">
                {step.tool} / {step.duration}
              </div>
            </div>
            <TraceBadge state={step.state} />
          </div>
          <p>{step.output}</p>
        </section>
      ))}
    </div>
  )
}

function PolicyTab() {
  return (
    <div className="apo-detail-section-stack">
      {policyControls.map((control) => (
        <section className="apo-policy-control" key={control.id}>
          <div>
            <div className="apo-policy-title">
              <LockKeyIcon />
              {control.label}
            </div>
            <p>{control.note}</p>
          </div>
          <TraceBadge state={control.state} />
        </section>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="apo-empty-panel">
      <CardContent className="apo-empty-content">
        <ShieldCheckIcon weight="duotone" />
        <div>
          <h2>No findings match filters</h2>
          <p>Widen severity or search filters to restore queue rows.</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ArtifactDrawer({
  artifact,
  preview,
  onOpenChange,
}: {
  artifact: string | null
  preview: ArtifactPreview | undefined
  onOpenChange: (open: boolean) => void
}) {
  const isExternal = artifact?.startsWith("http") ?? false

  return (
    <Sheet open={artifact !== null} onOpenChange={onOpenChange}>
      <SheetContent className="apo-artifact-drawer">
        <SheetHeader className="apo-artifact-drawer-header">
          <div className="apo-detail-kicker">Artifact preview</div>
          <SheetTitle>{artifact ? artifactLabel(artifact) : "Artifact"}</SheetTitle>
          <SheetDescription>
            {preview
              ? "Repo-local artifact captured in the dashboard snapshot."
              : "External artifact reference from the validation row."}
          </SheetDescription>
        </SheetHeader>

        {artifact ? (
          <div className="apo-artifact-drawer-body">
            <div className="apo-artifact-meta-grid">
              <div>
                <span>Path</span>
                <strong>{artifact}</strong>
              </div>
              <div>
                <span>Kind</span>
                <strong>{preview?.kind ?? (isExternal ? "url" : "unknown")}</strong>
              </div>
              <div>
                <span>Size</span>
                <strong>{preview ? formatBytes(preview.sizeBytes) : "not local"}</strong>
              </div>
            </div>

            {preview ? (
              <ScrollArea className="apo-artifact-preview-scroll">
                <pre className="apo-artifact-preview">{preview.content}</pre>
                {preview.truncated ? (
                  <p className="apo-artifact-preview-note">Preview truncated at 12 KB.</p>
                ) : null}
              </ScrollArea>
            ) : (
              <div className="apo-artifact-empty-preview">
                <DatabaseIcon />
                <div>
                  <h3>No local preview</h3>
                  <p>
                    {isExternal
                      ? "This row points to the source repository."
                      : "This artifact was not generated into the dashboard snapshot."}
                  </p>
                  {isExternal ? (
                    <a href={artifact} rel="noreferrer" target="_blank">
                      Open source
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function PermitReviewQueue() {
  const [activeView, setActiveView] = useState(savedViews[0]?.id ?? "all")
  const [selectedId, setSelectedId] = useState(queueFindings[0].id)
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [severity, setSeverity] = useState("all")
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return queueFindings.filter((row) => {
      const matchesView = activeView === "all" || row.status === activeView
      const matchesSeverity = severity === "all" || row.severity === severity
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [row.title, row.rule, row.path, row.capability, row.owner, row.repo, row.source]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch)

      return matchesView && matchesSeverity && matchesSearch
    })
  }, [activeView, search, severity])

  const selectedFinding =
    filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? queueFindings[0]

  return (
    <div className={cn("apo-dashboard", theme === "dark" && "dark")}>
      <AppSidebar summary={queueSummary} />
      <main className="apo-main">
        <DashboardHeader
          onThemeChange={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          theme={theme}
        />
        <div className="apo-workspace">
          <section className="apo-dashboard-stack" aria-label="Permit findings">
            <div className="apo-section-group">
              <SectionIntro
                description="Live validation, Deep Agent grounding, and cost controls from local artifacts."
                label="Run overview"
                title="Decision snapshot"
              />
              <SummaryTiles summary={queueSummary} />
            </div>

            <div className="apo-section-group">
              <SectionIntro
                description="Saved views filter the work queue. Search narrows repo, rule, evidence, and owner."
                label="Queue setup"
                title="Choose what to review"
              />
              <div className="apo-queue-controls">
                <SavedViews activeView={activeView} onChange={setActiveView} />
                <FilterBar
                  onSearchChange={setSearch}
                  onSeverityChange={setSeverity}
                  search={search}
                  severity={severity}
                />
              </div>
            </div>

            {filteredRows.length > 0 ? (
              <FindingsTable
                onSelect={setSelectedId}
                rows={filteredRows}
                selectedId={selectedFinding.id}
              />
            ) : (
              <EmptyState />
            )}
            <DetailRail finding={selectedFinding} onArtifactOpen={setSelectedArtifact} />
          </section>
        </div>
      </main>
      <ArtifactDrawer
        artifact={selectedArtifact}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedArtifact(null)
          }
        }}
        preview={selectedArtifact ? artifactPreviews[selectedArtifact] : undefined}
      />
      <Separator className="apo-mobile-separator" />
    </div>
  )
}
