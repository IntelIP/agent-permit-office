import { ArrowLeftIcon, FileSearchIcon, FlowArrowIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { QueueFinding } from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import { SeverityText } from "./StatusBadge"
import {
  artifactNames,
  decisionSummary,
  displayEvidenceLocation,
  requiredControls,
  riskPathNodes,
  statusHelpText,
  type RequiredControl,
  type RiskNode,
} from "./agentReportContent"
import {
  displayFindingSummary,
  evidenceLocation,
  policyCheckDescription,
  policyCheckLabel,
  reviewerQuestion,
  statusLabels,
} from "./proofPackUtils"

const controlStatusClass: Record<RequiredControl["status"], string> = {
  missing: "border-apo-blocked-border bg-apo-blocked-soft text-apo-blocked",
  ready: "border-apo-approved-border bg-apo-approved-soft text-apo-approved",
  weak: "border-apo-review-border bg-apo-review-soft text-apo-review",
}

const controlStatusLabel: Record<RequiredControl["status"], string> = {
  missing: "Missing",
  ready: "Ready",
  weak: "Weak",
}

export function AgentReportPanel({
  finding,
  onBack,
  page = false,
}: {
  finding: QueueFinding
  onBack?: () => void
  page?: boolean
}) {
  const policy = policyCheckLabel(finding)
  const policyDescription = policyCheckDescription(finding)
  const evidence = evidenceLocation(finding)
  const evidenceDisplay = displayEvidenceLocation(evidence)
  const riskPath = riskPathNodes(finding)
  const controls = requiredControls(finding)
  const reviewMode = finding.metrics.modelCalls > 0 ? "Deep Agent checked" : "Scanner only"

  return (
    <section
      className={cn(
        "flex min-h-screen min-w-0 flex-1 flex-col bg-background text-foreground",
        page && "flex-1",
      )}
    >
      <header className="sticky top-0 z-20 flex min-h-20 shrink-0 items-center justify-between gap-5 border-b border-border bg-background/95 px-5 backdrop-blur md:px-7">
        <div className="min-w-0">
          <Button
            className="-ml-2 mb-1"
            data-testid="finding-back"
            onClick={onBack}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to repository findings
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
              Permit review brief
            </h1>
            <InfoTooltip>
              This page helps a reviewer decide whether this repository access
              path can be approved, needs changes, or needs an exception.
            </InfoTooltip>
          </div>
        </div>
      </header>

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
        <main className="mx-auto max-w-[1180px] space-y-5">
          <section className="grid gap-5 border-b border-border pb-6 xl:grid-cols-[minmax(0,1fr)_230px]">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-apo-review">
                Review before approving
              </div>
              <h2
                className="mt-3 max-w-5xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-5xl"
                data-testid="reviewer-question"
              >
                {reviewerQuestion(finding)}
              </h2>
              <p className="mt-4 max-w-4xl text-base leading-7 text-muted-foreground">
                {displayFindingSummary(finding)}
              </p>
            </div>

            <aside className="h-fit rounded-2xl border border-apo-review-border bg-apo-review-soft p-4 text-apo-review">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                Permit status
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {statusLabels[finding.status]}
              </div>
              <p className="mt-2 text-sm leading-5 text-current/80">
                {statusHelpText(finding)}
              </p>
            </aside>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Fact label="Repository" value={finding.repo} />
            <Fact
              label="Evidence"
              tooltip={evidence === evidenceDisplay ? undefined : evidence}
              value={evidenceDisplay}
            />
            <Fact label="Policy check" value={policy} />
            <Fact label="Review mode" value={reviewMode} />
          </section>

          <section className="grid gap-5">
            <SidePanel>
              <h3 className="text-base font-semibold">Run context</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Facts used to decide whether this finding needs review.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Findings" value={String(finding.metrics.findings)} />
                <Metric
                  label="Graph paths"
                  value={String(finding.metrics.graphPaths)}
                />
                <Metric
                  label="Controls checked"
                  value={String(finding.metrics.controls)}
                />
                <Metric label="Review layer" value={reviewMode} />
                <Metric
                  label="Citations"
                  value={
                    finding.metrics.citationCheckPassed
                      ? "Passed"
                      : "Not available"
                  }
                />
              </div>
            </SidePanel>

            <SidePanel>
              <h3 className="text-base font-semibold">Artifacts used</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Local files and repository references used to support this brief.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {artifactNames(finding).map((artifact) => (
                  <ArtifactChip artifact={artifact} key={artifact} />
                ))}
              </div>
            </SidePanel>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Panel
              action={<SeverityText severity={finding.severity} />}
              title="Decision summary"
            >
              <p className="text-base leading-7 text-muted-foreground">
                {decisionSummary(finding)}
              </p>
            </Panel>

            <Panel
              action={<span className="text-apo-agent">From policy controls</span>}
              title="Required controls before approval"
            >
              <div className="divide-y divide-border">
                {controls.map((control) => (
                  <ControlRow control={control} key={control.title} />
                ))}
              </div>
            </Panel>
          </section>

          <Panel
            action={<span className="text-apo-agent">From graph paths</span>}
            icon={<FlowArrowIcon size={16} />}
            title="Risk path"
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_36px_1fr_36px_1fr]">
              {riskPath.map((node, index) => (
                <RiskPathPart
                  isLast={index === riskPath.length - 1}
                  key={`${node.label}-${index}`}
                  node={node}
                />
              ))}
            </div>
          </Panel>

          <Panel
            action={<span className="text-apo-agent">From scanner evidence</span>}
            icon={<FileSearchIcon size={16} />}
            title="Evidence to inspect"
          >
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              <EvidenceRow label="File">
                <span>{evidenceDisplay}</span>
                {evidence !== evidenceDisplay ? (
                  <InfoTooltip>{evidence}</InfoTooltip>
                ) : null}
              </EvidenceRow>
              <EvidenceRow label="Policy meaning">
                <span>{policyDescription}</span>
                <InfoTooltip>
                  This does not mean the token leaked. It means the repository
                  creates a path where credentials can reach an agent or tool
                  runtime unless a reviewer approves the boundary.
                </InfoTooltip>
              </EvidenceRow>
              <EvidenceRow label="Scanner note" value={finding.evidence} />
              <EvidenceRow label="Fix guidance" value={finding.remediation} />
            </div>
          </Panel>

        </main>
      </div>
    </section>
  )
}

function Fact({
  label,
  tooltip,
  value,
}: {
  label: string
  tooltip?: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex min-w-0 items-start gap-1.5 text-sm font-semibold leading-5">
        <span className="min-w-0 break-words">{value}</span>
        {tooltip ? <InfoTooltip>{tooltip}</InfoTooltip> : null}
      </div>
    </div>
  )
}

function Panel({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  icon?: ReactNode
  title: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border bg-muted/10 px-4">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        {action ? (
          <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em]">
            {action}
          </div>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function RiskPathPart({
  isLast,
  node,
}: {
  isLast: boolean
  node: RiskNode
}) {
  return (
    <>
      <div className="flex min-h-28 min-w-0 flex-col rounded-xl border border-border bg-muted/20 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {node.label}
        </div>
        <div className="mt-3 break-words text-base font-semibold leading-5">
          {node.title}
        </div>
        <p className="mt-auto pt-3 text-sm leading-5 text-muted-foreground">
          {node.detail}
        </p>
      </div>
      {!isLast ? (
        <div className="hidden place-items-center text-xl text-primary lg:grid">
          →
        </div>
      ) : null}
    </>
  )
}

function EvidenceRow({
  children,
  label,
  value,
}: {
  children?: ReactNode
  label: string
  value?: string
}) {
  return (
    <div className="grid border-b border-border last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)]">
      <div className="bg-muted/25 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 px-4 py-3 text-sm leading-6 text-foreground">
        {children ?? (
          <span className="break-words">{value}</span>
        )}
      </div>
    </div>
  )
}

function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="ml-2 inline-flex size-4 items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] font-semibold text-muted-foreground"
          type="button"
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-pretty text-xs leading-5">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function ControlRow({ control }: { control: RequiredControl }) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[104px_minmax(0,1fr)]">
      <span
        className={cn(
          "inline-flex h-6 w-fit items-center rounded-full border px-2.5 text-xs font-semibold",
          controlStatusClass[control.status],
        )}
      >
        {controlStatusLabel[control.status]}
      </span>
      <div>
        <div className="text-sm font-semibold">{control.title}</div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {control.detail}
        </p>
      </div>
    </div>
  )
}

function SidePanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      {children}
    </section>
  )
}

function ArtifactChip({ artifact }: { artifact: string }) {
  return (
    <code className="max-w-full break-words rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-xs leading-5 text-muted-foreground">
      {artifact}
    </code>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-3 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-words font-semibold leading-5">{value}</div>
    </div>
  )
}
