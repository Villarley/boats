import { defineConfig, devices } from "@playwright/test";

// Runs against the local chain (`npm run chain`) and a production build on :3100, built into
// .next-e2e so a `next dev` on :3000 keeps working (and can't restart mid-run).
// global-setup rewinds the chain to a snapshot, so the suite can be run again without a restart.
// Hardhat account 0: public, local chain only.
const HARDHAT_DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

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
    command: "npx next build && npx next start -p 3100",
    // Always the local chain and its public Hardhat dev key, whatever .env.local points the dev server
    // at (process env wins over .env files, so a real Arc key there never reaches these tests).
    env: { NEXT_PUBLIC_CHAIN: "local", NEXT_DIST_DIR: ".next-e2e", KEEPER_PRIVATE_KEY: HARDHAT_DEV_KEY, FAUCET_PRIVATE_KEY: HARDHAT_DEV_KEY, KEEPER_SECRET: "e2e" },
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
