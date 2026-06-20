import { ArchiveBoxIcon, FileSearchIcon, FlowArrowIcon, RobotIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  AgentTraceStep,
  ArtifactPreview,
  DecisionLogEntry,
  ProofPack,
  QueueFinding,
  TraceState,
} from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import { ArtifactList } from "./ArtifactList"
import { ArtifactStatusBadge, SeverityText, StatusText, TraceText } from "./StatusBadge"
import {
  decisionLogEntries,
  displayFindingSummary,
  displayFindingTitle,
  evidenceLocation,
  policyCheckDescription,
  policyCheckLabel,
} from "./proofPackUtils"

export function AgentReportPanel({
  artifactPreviews,
  decisionLog,
  embedded = false,
  finding,
  page = false,
  proofPack,
  traceSteps,
}: {
  artifactPreviews: Record<string, ArtifactPreview>
  decisionLog: DecisionLogEntry[]
  embedded?: boolean
  finding: QueueFinding
  page?: boolean
  proofPack: ProofPack
  traceSteps: AgentTraceStep[]
}) {
  const rowDecisionLog = decisionLogEntries(finding)
  const title = displayFindingTitle(finding)

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden bg-background",
        page
          ? "flex-1"
          : embedded
            ? "min-h-[720px] border-t border-border"
            : "h-screen border-l border-border",
      )}
    >
      <div className="border-b border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Evidence review
            </div>
            <h2 className="mt-3 max-w-full text-balance break-words text-2xl font-semibold leading-7 tracking-[-0.012em]">
              {title}
            </h2>
            <p className="mt-3 max-w-full break-words text-sm leading-6 text-muted-foreground">
              {displayFindingSummary(finding)}
            </p>
          </div>
          <div className="shrink-0">
            <StatusText status={finding.status} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-border/80 border-y border-border/80 max-sm:grid-cols-1 max-sm:divide-x-0">
          <Fact label="Repository" value={finding.repo} />
          <Fact label="Policy checked" value={policyCheckLabel(finding)} />
          <Fact label="Review team" value={finding.owner} />
        </div>
      </div>

      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="evidence">
        <TabsList className="h-auto justify-start overflow-x-auto rounded-none border-b border-border bg-transparent px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="agent">Deep Agent</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <ScrollArea className="min-h-0 flex-1">
          <TabsContent className="m-0 px-5" value="evidence">
            <Section
              action={<SeverityText severity={finding.severity} />}
              icon={<FileSearchIcon size={15} />}
              title="Scanner result"
            >
              <p className="text-sm leading-6 text-muted-foreground">
                {policyCheckDescription(finding)}
              </p>
              <code className="mt-4 block max-w-full break-all rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs leading-5">
                {evidenceLocation(finding)}
              </code>
            </Section>

            <Section icon={<FlowArrowIcon size={15} />} title="Why this is flagged">
              <div className="flex flex-col gap-3">
                <TracePoint
                  body={policyCheckDescription(finding)}
                  title={policyCheckLabel(finding)}
                />
                <TracePoint
                  body={`${finding.metrics.controls} deterministic checks evaluated repository evidence before agent review.`}
                  title="Controls checked"
                />
                <TracePoint
                  body={`${finding.confidence}% confidence from scanner evidence and policy checks.`}
                  title="Decision confidence"
                />
              </div>
            </Section>

            <Section title="Decision log">
              <div className="flex flex-col">
                {rowDecisionLog.map((entry) => (
                  <div
                    className="grid grid-cols-[9px_minmax(0,1fr)] gap-3 border-b border-border/70 py-3 last:border-b-0"
                    key={`${entry.actor}-${entry.action}`}
                  >
                    <span className="mt-1.5 size-2 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <strong>{entry.actor}</strong>
                        <span className="text-muted-foreground">{entry.action}</span>
                      </div>
                      <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                        {entry.detail}
                      </p>
                      <code className="mt-1 block break-all font-mono text-xs leading-5 text-muted-foreground">
                        {entry.ref}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Remediation">
              <p className="break-words text-sm leading-6 text-muted-foreground">
                {finding.remediation}
              </p>
            </Section>
          </TabsContent>

          <TabsContent className="m-0 px-5" value="agent">
            <Section icon={<RobotIcon size={15} />} title="Grounding checks">
              <div className="grid grid-cols-2 border-y border-border/80 max-sm:grid-cols-1">
                <Fact label="Evidence citations" value={finding.metrics.citationCheckPassed ? "Passed" : "Needs review"} />
                <Fact label="Expected outcome" value={finding.metrics.expectationCheckPassed ? "Matched" : "Needs review"} />
                <Fact label="Model calls" value={finding.metrics.modelCalls.toString()} />
                <Fact label="Scanner controls" value={finding.metrics.controls.toString()} />
              </div>
            </Section>

            <Section title="Trace steps">
              <div className="flex flex-col">
                {traceSteps.map((step) => (
                  <div
                    className="border-b border-border/70 py-3 last:border-b-0"
                    key={step.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{step.label}</div>
                        <div className="mt-1 break-all font-mono text-xs leading-5 text-muted-foreground">
                          {step.tool} / {step.duration}
                        </div>
                      </div>
                      <TraceText state={step.state} />
                    </div>
                    <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                      {step.output}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Run decision history">
              <div className="flex flex-col">
                {decisionLog.map((entry) => (
                  <div
                    className="flex items-start justify-between gap-3 border-b border-border/70 py-3 text-sm last:border-b-0"
                    key={entry.id}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold">{entry.label}</div>
                      <div className="mt-1 break-words leading-6 text-muted-foreground">
                        {entry.detail}
                      </div>
                    </div>
                    <TraceText state={decisionStateToTraceState(entry.state)} />
                  </div>
                ))}
              </div>
            </Section>
          </TabsContent>

          <TabsContent className="m-0 px-5" value="artifacts">
            <Section
              action={<ArtifactStatusBadge status={proofPack.status} />}
              icon={<ArchiveBoxIcon size={15} />}
              title="Proof package"
            >
              <p className="break-words text-sm leading-6 text-muted-foreground">
                {proofPack.reason}
              </p>
              {proofPack.sourceRunPath ? (
                <code className="mt-4 block max-w-full break-all rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs leading-5">
                  {proofPack.sourceRunPath}
                </code>
              ) : null}
            </Section>

            <Section title="Artifacts">
              <ArtifactList artifactPreviews={artifactPreviews} finding={finding} />
            </Section>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}

function decisionStateToTraceState(state: DecisionLogEntry["state"]): TraceState {
  if (state === "approved") return "passed"
  if (state === "needs-review") return "review"
  return state
}

function Fact({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold">{value}</div>
    </div>
  )
}

function Section({
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
    <section className="border-b border-border py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em]">
          {action}
        </div>
      </div>
      {children}
    </section>
  )
}

function TracePoint({ body, title }: { body: string; title: string }) {
  return (
    <div className="grid grid-cols-[9px_minmax(0,1fr)] gap-3">
      <span className="mt-1.5 size-2 rounded-full bg-primary" />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
