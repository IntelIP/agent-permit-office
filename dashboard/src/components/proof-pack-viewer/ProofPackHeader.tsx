import { PlusIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"

export function ProofPackHeader({
  onAddRepository,
  title = "Repository findings",
}: {
  onAddRepository: () => void
  title?: string
}) {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-7 tracking-[-0.012em]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          aria-label="Stage a repository scan"
          data-testid="queue-scan-open"
          onClick={onAddRepository}
          title="Open a form to stage a repository scan"
          variant="outline"
        >
          <PlusIcon data-icon="inline-start" />
          Queue scan
        </Button>
      </div>
    </header>
  )
}
