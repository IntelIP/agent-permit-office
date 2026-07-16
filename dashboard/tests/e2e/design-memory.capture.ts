import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

type Profile = {
  policy: {
    surfaces: Array<{ id: string; kind: "route" | "component"; target: string; viewports: string[]; themes: string[]; states: string[] }>;
    viewports: Array<{ id: string; width: number; height: number }>;
  };
};

const dashboardRoot = process.cwd();
const repoRoot = resolve(dashboardRoot, "..");
const profile = JSON.parse(readFileSync(resolve(repoRoot, "design/product.design.json"), "utf8")) as Profile;
const dashboardSnapshot = readFileSync(resolve(dashboardRoot, "src/data/generated/dashboardSnapshot.json"), "utf8");
const output = resolve(repoRoot, ".artifacts/tabellio/visual-captures");
mkdirSync(output, { recursive: true });

test.describe("Tabellio visual capture matrix", () => {
  test.describe.configure({ mode: "serial" });

  for (const surface of profile.policy.surfaces) {
    if (surface.kind !== "route") throw new Error(`Capture adapter missing for component surface: ${surface.id}`);
    for (const viewportId of surface.viewports) for (const theme of surface.themes) for (const state of surface.states) {
      if (state !== "default") throw new Error(`Capture adapter missing for state: ${surface.id}/${state}`);
      const viewport = profile.policy.viewports.find((entry) => entry.id === viewportId);
      if (!viewport) throw new Error(`Unknown viewport: ${viewportId}`);
      const id = `${surface.id}--${viewportId}--${theme}--${state}`;

      test(id, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme as "light" | "dark", reducedMotion: "reduce" });
        await page.route("**/api/snapshot", async (route) => route.fulfill({ body: dashboardSnapshot, contentType: "application/json", status: 200 }));
        await page.goto(surface.target, { waitUntil: "domcontentloaded" });
        await page.evaluate((selectedTheme) => {
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(selectedTheme);
          document.documentElement.style.colorScheme = selectedTheme;
        }, theme);
        await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
        await page.evaluate(() => document.fonts.ready);

        await expect(page.getByRole("heading", { name: "Repository findings" })).toBeVisible();
        await expect(page.locator("html")).toHaveClass(new RegExp(`(?:^|\\s)${theme}(?:\\s|$)`));
        expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("DM Sans");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await page.screenshot({ path: resolve(output, `${id}.png`), animations: "disabled" });
      });
    }
  }
});
