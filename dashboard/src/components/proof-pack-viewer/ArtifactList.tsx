import { ArrowSquareOutIcon, FileTextIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import type { ArtifactPreview, QueueFinding } from "@/data/permitQueue"
import { ArtifactStatusBadge } from "./StatusBadge"
import { artifactInsight, artifactLabel } from "./proofPackUtils"

export function ArtifactList({
  artifactPreviews,
  finding,
}: {
  artifactPreviews: Record<string, ArtifactPreview>
  finding: QueueFinding
}) {
  return (
    <div className="flex flex-col">
      {finding.artifacts.map((artifact) => {
        const preview = artifactPreviews[artifact]
        const insight = artifactInsight(artifact, finding, preview)
        const external = artifact.startsWith("http")

        return (
          <div
            className="border-b border-border/70 py-3 last:border-b-0"
            key={artifact}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileTextIcon size={15} />
                  <span className="truncate">{artifactLabel(artifact)}</span>
                </div>
                <code className="mt-1 block break-all font-mono text-xs leading-5 text-muted-foreground">
                  {artifact}
                </code>
              </div>
              {external ? (
                <Button asChild size="icon-xs" variant="outline">
                  <a href={artifact} rel="noreferrer" target="_blank">
                    <ArrowSquareOutIcon data-icon="inline-start" />
                    <span className="sr-only">Open source repository</span>
                  </a>
                </Button>
              ) : (
                <ArtifactStatusBadge status={preview ? "available" : "missing"} />
              )}
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {insight.body}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {insight.facts.map((fact) => (
                <span
                  className="font-mono text-xs text-muted-foreground"
                  key={fact}
                >
                  {fact}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
