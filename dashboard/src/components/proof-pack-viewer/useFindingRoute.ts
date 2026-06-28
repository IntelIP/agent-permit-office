import { useCallback, useEffect, useMemo, useState } from "react"

import type { QueueFinding } from "@/data/permitQueue"

type Surface = "queue" | "finding"

export function useFindingRoute({
  fallbackFindingId,
  filteredFindings,
  findings,
}: {
  fallbackFindingId: string
  filteredFindings: QueueFinding[]
  findings: QueueFinding[]
}) {
  const initialFindingId = useMemo(() => getFindingIdFromUrl(), [])
  const [selectedFindingId, setSelectedFindingId] = useState(
    initialFindingId ?? fallbackFindingId,
  )
  const [surface, setSurface] = useState<Surface>(surfaceForRoute(initialFindingId))

  useEffect(() => {
    function syncFromUrl() {
      const findingId = getFindingIdFromUrl()
      syncRouteState(findingId, setSelectedFindingId, setSurface)
    }

    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener("hashchange", syncFromUrl)
    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener("hashchange", syncFromUrl)
    }
  }, [])

  const effectiveSelectedFindingId = resolveSelectedFindingId(
    selectedFindingId,
    findings,
  )
  const selectedFinding = resolveSelectedFinding(
    effectiveSelectedFindingId,
    findings,
    filteredFindings,
  )

  const openFinding = useCallback((finding: QueueFinding) => {
    setSelectedFindingId(finding.id)
    setSurface("finding")
    window.history.pushState(null, "", `?finding=${encodeURIComponent(finding.id)}`)
    window.scrollTo({ top: 0 })
  }, [])

  const returnToQueue = useCallback(() => {
    setSurface("queue")
    window.history.pushState(null, "", window.location.pathname)
    window.scrollTo({ top: 0 })
  }, [])

  return {
    openFinding,
    returnToQueue,
    selectedFinding,
    selectedFindingId: effectiveSelectedFindingId,
    surface,
  }
}

function getFindingIdFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const queryFinding = params.get("finding")
  if (queryFinding) return queryFinding

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\??/, ""))
  return hashParams.get("finding")
}

function surfaceForRoute(findingId: string | null): Surface {
  return findingId ? "finding" : "queue"
}

function syncRouteState(
  findingId: string | null,
  setSelectedFindingId: (findingId: string) => void,
  setSurface: (surface: Surface) => void,
) {
  if (findingId) {
    setSelectedFindingId(findingId)
  }
  setSurface(surfaceForRoute(findingId))
}

function resolveSelectedFindingId(
  selectedFindingId: string,
  findings: QueueFinding[],
) {
  const selectedExists = findings.some((finding) => finding.id === selectedFindingId)
  return selectedExists ? selectedFindingId : findings[0]?.id ?? ""
}

function resolveSelectedFinding(
  selectedFindingId: string,
  findings: QueueFinding[],
  filteredFindings: QueueFinding[],
) {
  return (
    findings.find((finding) => finding.id === selectedFindingId) ??
    filteredFindings.find((finding) => finding.id === selectedFindingId) ??
    filteredFindings[0] ??
    findings[0]
  )
}
