import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (`npm run test:e2e`). Uses the dev server on :3000 when one
 * is already running, and starts one otherwise.
 */
export default defineConfig({
  testDir: "./e2e",
  // Generous, because the dev server compiles each route on its first visit.
  timeout: 60_000,
  // Server actions on a dev server under parallel load can take a few seconds.
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The specs assert on the demo data, so they run against the mock.
    // If you reuse a dev server you started yourself, start it with
    // TUFF_DATA_SOURCE=mock too.
    env: { TUFF_DATA_SOURCE: "mock" },
  },
});
