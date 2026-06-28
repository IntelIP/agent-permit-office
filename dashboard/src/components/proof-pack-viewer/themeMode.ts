export type ThemeMode = "system" | "light" | "dark"

export function getNextThemeMode(themeMode: ThemeMode): ThemeMode {
  if (themeMode === "system") return "light"
  if (themeMode === "light") return "dark"
  return "system"
}
