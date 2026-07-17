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
type DashboardFixtureSource = {
  generatedAt: string;
  findings: Array<Record<string, unknown>>;
  repos: Array<Record<string, unknown>>;
  runs: Array<Record<string, unknown>>;
};

const dashboardSnapshot = JSON.parse(
  readFileSync(resolve(dashboardRoot, "src/data/generated/dashboardSnapshot.json"), "utf8"),
) as DashboardFixtureSource;
const apiSnapshot = JSON.stringify({
  generatedAt: dashboardSnapshot.generatedAt,
  repositories: dashboardSnapshot.repos.map((repo) => ({
    id: repo.id,
    label: repo.label,
    local_path: repo.source,
  })),
  runs: dashboardSnapshot.runs.map((run) => {
    const repo = dashboardSnapshot.repos.find((candidate) => candidate.id === run.repoId);
    const metrics = (run.metrics ?? {}) as Record<string, unknown>;
    const artifacts = Array.isArray(run.artifacts) ? run.artifacts : [];
    return {
      artifact_dir: artifacts[0] ?? "",
      branch: "fixture",
      cache_hit_ratio: metrics.cacheHitRatio ?? 0,
      cached_tokens: metrics.cachedTokens ?? 0,
      completed_at: run.completedAt,
      controls_count: metrics.controls ?? 0,
      findings_count: metrics.findings ?? 0,
      graph_paths_count: metrics.graphPaths ?? 0,
      local_path: repo?.source ?? "fixture",
      model: null,
      model_calls: metrics.modelCalls ?? 0,
      permit_status: run.status,
      repository_id: run.repoId,
      repository_label: repo?.label ?? run.repoId,
      run_id: run.id,
      status: "completed",
      total_tokens: metrics.totalTokens ?? 0,
    };
  }),
  findings: dashboardSnapshot.findings.map((finding) => {
    const metrics = (finding.metrics ?? {}) as Record<string, unknown>;
    return {
      cache_hit_ratio: metrics.cacheHitRatio ?? 0,
      cached_tokens: metrics.cachedTokens ?? 0,
      controls_count: metrics.controls ?? 0,
      finding_id: finding.id,
      findings_count: metrics.findings ?? 1,
      graph_paths_count: metrics.graphPaths ?? 0,
      local_path: finding.source,
      model_calls: metrics.modelCalls ?? 0,
      permit_status: finding.status,
      recommendation: finding.remediation,
      repository_label: finding.repo,
      risk: finding.summary,
      rule_id: finding.rule,
      run_id: finding.runId,
      severity: finding.severity,
      title: finding.title,
      total_tokens: metrics.totalTokens ?? 0,
    };
  }),
});
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
        let fixtureRequests = 0;
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ colorScheme: theme as "light" | "dark", reducedMotion: "reduce" });
        await page.route("**/api/snapshot", async (route) => {
          fixtureRequests += 1;
          await route.fulfill({ body: apiSnapshot, contentType: "application/json", status: 200 });
        });
        await page.goto(surface.target, { waitUntil: "domcontentloaded" });
        await page.evaluate((selectedTheme) => {
          document.documentElement.classList.remove("light", "dark");
          document.documentElement.classList.add(selectedTheme);
          document.documentElement.style.colorScheme = selectedTheme;
        }, theme);
        await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
        await page.evaluate(() => document.fonts.ready);

        await expect(page.getByRole("heading", { name: "Repository findings" })).toBeVisible();
        await expect(page.getByText("Live Worker data", { exact: true })).toBeVisible();
        expect(fixtureRequests).toBeGreaterThan(0);
        await expect(page.getByText("unknown policy", { exact: true })).toHaveCount(0);
        await expect(page.locator("html")).toHaveClass(new RegExp(`(?:^|\\s)${theme}(?:\\s|$)`));
        expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("DM Sans");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await page.screenshot({ path: resolve(output, `${id}.png`), animations: "disabled" });
      });
    }
  }
});
