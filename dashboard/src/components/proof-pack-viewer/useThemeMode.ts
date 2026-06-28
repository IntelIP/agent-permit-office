import { useEffect, useState } from "react"

import type { ThemeMode } from "./themeMode"

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system")

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    function applyThemeMode() {
      const resolvedTheme =
        themeMode === "system" ? (media.matches ? "dark" : "light") : themeMode
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark")
    }

    applyThemeMode()
    media.addEventListener("change", applyThemeMode)
    return () => media.removeEventListener("change", applyThemeMode)
  }, [themeMode])

  return { setThemeMode, themeMode }
}
