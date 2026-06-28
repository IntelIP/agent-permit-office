import {
  DesktopIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import type { RepoSnapshot, SavedView } from "@/data/permitQueue"
import { cn } from "@/lib/utils"
import { getNextThemeMode, type ThemeMode } from "./themeMode"

export function RailNav({
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
        className="mb-3 self-center"
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

export function QueueSidebar({
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
          <div className="mt-1 text-xs text-muted-foreground">
            Repository scan review
          </div>
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
                data-testid="queue-status-filter"
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
                <span className="font-mono text-xs text-muted-foreground">
                  {view.count}
                </span>
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
