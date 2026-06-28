import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  testDir: "./tests/e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1",
    reuseExistingServer: true,
    url: "http://127.0.0.1:5173",
  },
})
