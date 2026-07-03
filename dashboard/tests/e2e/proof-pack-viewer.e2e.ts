import { expect, test } from "@playwright/test"

test("queue screen supports scan form, search, drilldown, back, and theme cycle", async ({
  page,
}) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Repository findings" })).toBeVisible()
  await expect(page.getByTestId("finding-row")).toHaveCount(5)

  await page.getByRole("button", { name: "Add repository to scan queue" }).click()
  await expect(page.getByTestId("queue-scan-form")).toBeVisible()
  await expect(page.getByTestId("runner-command")).toContainText(
    "agent-permit runner --once",
  )
  await expect(page.getByTestId("runner-command")).toContainText(
    "--agent-recursion-limit 20",
  )
  await expect(page.getByTestId("queue-scan-submit")).toBeDisabled()
  await page
    .getByTestId("queue-scan-path")
    .fill("https://github.com/github/github-mcp-server")
  await expect(page.getByTestId("queue-scan-submit")).toBeEnabled()
  await page.getByRole("button", { name: "Close" }).click()

  await page.getByTestId("finding-search").fill("github-mcp-server")
  await expect(page.getByTestId("finding-row")).toHaveCount(1)
  await expect(page.getByTestId("finding-row").first()).toContainText(
    "github-mcp-server",
  )

  await page.getByTestId("finding-row").first().click()
  await expect(page).toHaveURL(/\?finding=/)
  await expect(page.getByRole("heading", { name: "Permit review brief" })).toBeVisible()
  await expect(page.getByTestId("reviewer-question")).toBeVisible()
  await expect(page.getByTestId("recommended-response")).toBeVisible()

  await page.getByTestId("finding-back").click()
  await expect(page.getByRole("heading", { name: "Repository findings" })).toBeVisible()

  const themeButton = page.getByLabel("Theme mode: system")
  await expect(themeButton).toBeVisible()
  await themeButton.click()
  await expect(page.getByLabel("Theme mode: light")).toBeVisible()
  await page.getByLabel("Theme mode: light").click()
  await expect(page.getByLabel("Theme mode: dark")).toBeVisible()
})
