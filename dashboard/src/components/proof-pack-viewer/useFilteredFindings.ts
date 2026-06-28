import { useMemo } from "react"

import type { QueueFinding } from "@/data/permitQueue"
import { searchableFindingText } from "./proofPackUtils"

export function useFilteredFindings({
  activeView,
  findings,
  search,
}: {
  activeView: string
  findings: QueueFinding[]
  search: string
}) {
  return useMemo(
    () => filterFindings({ activeView, findings, search }),
    [activeView, findings, search],
  )
}

export function filterFindings({
  activeView,
  findings,
  search,
}: {
  activeView: string
  findings: QueueFinding[]
  search: string
}) {
  const query = search.trim().toLowerCase()
  return findings.filter((finding) =>
    matchesActiveView(finding, activeView) && matchesSearch(finding, query),
  )
}

function matchesActiveView(finding: QueueFinding, activeView: string) {
  if (activeView === "all") return true
  return finding.status === activeView
}

function matchesSearch(finding: QueueFinding, query: string) {
  if (query.length === 0) return true
  return searchableFindingText(finding).toLowerCase().includes(query)
}
