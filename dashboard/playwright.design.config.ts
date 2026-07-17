import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  reporter: [["list"]],
  testMatch: /design-memory\.capture\.ts/,
  use: {
    ...baseConfig.use,
    screenshot: "off",
    trace: "off",
  },
  webServer: {
    command: "VITE_AGENT_PERMIT_API_URL= bun run build && bun run preview -- --host 127.0.0.1",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4173",
  },
});
