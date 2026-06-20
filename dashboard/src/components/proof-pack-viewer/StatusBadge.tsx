import {
  CheckCircleIcon,
  WarningDiamondIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PermitStatus, Severity, TraceState } from "@/data/permitQueue"
import { severityLabels, statusLabels, traceLabels } from "./proofPackUtils"

const statusClasses: Record<PermitStatus, string> = {
  approved: "border-apo-approved-border bg-apo-approved-soft text-apo-approved",
  "needs-review": "border-apo-review-border bg-apo-review-soft text-apo-review",
  blocked: "border-apo-blocked-border bg-apo-blocked-soft text-apo-blocked",
}

const artifactStatusLabels: Record<"available" | "partial" | "missing" | "aggregate" | "ready", string> = {
  aggregate: "Aggregate evidence",
  available: "Evidence ready",
  missing: "Evidence missing",
  partial: "Partial evidence",
  ready: "Ready",
}

export function StatusBadge({ status }: { status: PermitStatus }) {
  const Icon =
    status === "approved"
      ? CheckCircleIcon
      : status === "blocked"
        ? XCircleIcon
        : WarningDiamondIcon

  return (
    <Badge className={cn("rounded-full", statusClasses[status])} variant="outline">
      <Icon data-icon="inline-start" weight="fill" />
      {statusLabels[status]}
    </Badge>
  )
}

export function ArtifactStatusBadge({
  status,
}: {
  status: "available" | "partial" | "missing" | "aggregate" | "ready"
}) {
  const className =
    status === "available" || status === "ready"
      ? "border-apo-approved-border bg-apo-approved-soft text-apo-approved"
      : status === "partial" || status === "aggregate"
        ? "border-apo-artifact-border bg-apo-artifact-soft text-apo-artifact"
        : "border-apo-blocked-border bg-apo-blocked-soft text-apo-blocked"

  return (
    <Badge className={cn("rounded-full", className)} variant="outline">
      {artifactStatusLabels[status]}
    </Badge>
  )
}

const statusTextClasses: Record<PermitStatus, string> = {
  approved: "text-apo-approved",
  "needs-review": "text-apo-review",
  blocked: "text-apo-blocked",
}

const severityTextClasses: Record<Severity, string> = {
  critical: "text-apo-critical",
  high: "text-apo-blocked",
  medium: "text-apo-review",
  low: "text-apo-muted",
}

const traceTextClasses: Record<TraceState, string> = {
  passed: "text-apo-approved",
  review: "text-apo-agent",
  blocked: "text-apo-blocked",
}

export function StatusText({ status }: { status: PermitStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium",
        statusTextClasses[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  )
}

export function SeverityText({ severity }: { severity: Severity }) {
  return (
    <span className={cn("text-xs font-medium", severityTextClasses[severity])}>
      {severityLabels[severity]}
    </span>
  )
}

export function TraceText({ state }: { state: TraceState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium",
        traceTextClasses[state],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {traceLabels[state]}
    </span>
  )
}
