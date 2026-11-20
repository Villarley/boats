import { test, expect, type Browser } from "@playwright/test";
import { movePrice } from "./helpers";

// One full voyage on Safe Harbor: grandma boards, Ana sails and trades, the market falls, grandma withdraws.
test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: "grandma" | "ana") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByTestId(`demo-${who}`).click();
  await expect(page).toHaveURL(/\/home/);
  return page;
}

test("crew: grandma boards Safe Harbor with $100 and sees the worst case first", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await expect(page.getByTestId("cash")).toHaveText("$500.00");
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pick a boat." })).toBeVisible();
  await page.getByTestId("boat-card-Safe Harbor").click();
  await expect(page.getByText(/Worst case: you lose about/)).toBeVisible();
  await expect(page.getByText("Seaworthiness")).toBeVisible();
  await page.getByTestId("board-cta").click();
  for (const k of ["1", "0", "0"]) await page.getByTestId(`key-${k}`).click();
  await expect(page.getByTestId("amount")).toHaveText("$100");
  await page.getByTestId("review").click();
  await expect(page.getByTestId("review-amount")).toHaveText("$100.00");
  await expect(page.getByTestId("review-worst")).toContainText("$99");
  await expect(page.getByText(/Locked until/)).toBeVisible();
  await page.getByTestId("confirm-board").click();
  await expect(page.getByTestId("boarded")).toBeVisible();
  await page.goto("/home");
  await expect(page.getByTestId("my-boat-Safe Harbor")).toBeVisible();
});

test("crew: not enough dollars offers to add the difference inline", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await page.goto("/explore");
  await page.getByTestId("boat-card-Open Sea").click();
  await page.getByTestId("board-cta").click();
  for (const k of ["9", "0", "0"]) await page.getByTestId(`key-${k}`).click();
  await expect(page.getByText(/You have \$400/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add \$500/ })).toBeVisible();
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("captain: Ana unlocks captain mode, sets sail, and the ticket catches a rule break", async ({ browser }) => {
  const page = await signIn(browser, "ana");
  await page.getByRole("link", { name: "Me", exact: true }).click();
  await page.getByTestId("captain-mode").click();
  await expect(page).toHaveURL(/\/captain$/);
  await expect(page.getByRole("link", { name: "Bridge", exact: true })).toBeVisible();
  const card = page.getByTestId("bridge-Safe Harbor");
  await card.getByTestId("sail").click();
  await expect(card.getByTestId("trade")).toBeVisible();
  await card.getByTestId("trade").click();
  await expect(page.getByRole("heading", { name: "Trade" })).toBeVisible();
  // 9,000 into Treasuries is 89% of the boat; the cap is 70%.
  await page.getByTestId("to").selectOption({ label: "US Treasuries (max 70%)" });
  for (const k of ["9", "0", "0", "0"]) await page.getByTestId(`key-${k}`).click();
  await expect(page.getByTestId("rule")).toContainText("Max 70% in US Treasuries");
  await expect(page.getByTestId("send-trade")).toHaveCount(0);
  // Bypass the UI: the contract still says no.
  await page.getByTestId("send-anyway").click();
  await expect(page.getByTestId("trade-result")).toContainText("contract said no");
  // Take the suggested fix.
  await page.getByTestId("use-max").click();
  await page.getByTestId("send-trade").click();
  await expect(page.getByTestId("trade-result")).toContainText("Moved");
});

test("voyage ends: the market falls, the keeper brings the boat back, grandma loses less than 1%", async ({ browser, request }) => {
  await movePrice("USYC", -1500); // Treasuries -15% -> boat about -10%
  const k = await request.post("/api/keeper", { headers: { referer: "e2e" } });
  const body = await k.json();
  const safe = body.results.find((r: { message: string; boat: string }) => r.message);
  expect(safe).toBeTruthy();
  const page = await signIn(browser, "grandma");
  await page.getByTestId("my-boat-Safe Harbor").click();
  await expect(page.getByTestId("port")).toBeVisible();
  await expect(page.getByText("That's all you lost.")).toBeVisible();
  const you = await page.getByTestId("port-you").innerText();
  const pctLost = Math.abs(parseFloat(you.replace("−", "-").replace("%", "")));
  expect(pctLost).toBeLessThan(1);
  await page.getByTestId("withdraw").click();
  await expect(page.getByTestId("withdrawn")).toBeVisible();
});

test("PWA: manifest and service worker are served", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBeTruthy();
  const j = await m.json();
  expect(j.display).toBe("standalone");
  expect(j.icons.length).toBeGreaterThan(1);
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
});
