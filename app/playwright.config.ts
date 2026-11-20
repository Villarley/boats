import { defineConfig, devices } from "@playwright/test";

// Runs against the local chain (`npm run chain`) and a production build on :3100, built into
// .next-e2e so a `next dev` on :3000 keeps working (and can't restart mid-run).
// global-setup rewinds the chain to a snapshot, so the suite can be run again without a restart.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    screenshot: "only-on-failure",
    ...devices["iPhone 14"],
    browserName: "chromium",
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined },
  },
  webServer: {
    command: "NEXT_DIST_DIR=.next-e2e npx next build && NEXT_DIST_DIR=.next-e2e npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
