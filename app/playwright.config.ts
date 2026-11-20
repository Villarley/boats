import { defineConfig, devices } from "@playwright/test";

// Runs against the local chain (`npm run chain`) and a production build (`npm run build`).
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    ...devices["iPhone 14"],
    browserName: "chromium",
    launchOptions: { executablePath: process.env.PW_CHROMIUM || undefined },
  },
  webServer: { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
