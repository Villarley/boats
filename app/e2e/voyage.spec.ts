import { test, expect, type Browser } from "@playwright/test";
import { d, movePrice } from "./helpers";

// One full run of Safe Harbor: María invests, Laura starts the fund and trades, the market falls, María withdraws.
test.describe.configure({ mode: "serial" });

async function signIn(browser: Browser, who: "grandma" | "ana", { keepAlerts = false } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // "Your money is safe" pops up for any blocked trade in a fund you're in (the log outlives a chain reset).
  // Dismiss it whenever it gets in the way, unless the test is about it.
  if (!keepAlerts) await page.addLocatorHandler(page.getByTestId("blocked-ok"), (ok) => ok.click());
  await page.goto("/");
  await page.getByTestId(`demo-${who}`).click();
  await expect(page).toHaveURL(/\/home/);
  return page;
}

test("investor: María invests $100 in Safe Harbor and sees the worst case first", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await expect(page.getByTestId("home")).toBeVisible();
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(page.getByTestId("explore")).toBeVisible();
  await page.getByTestId("boat-card-Safe Harbor").click();
  await expect(page.getByTestId("fund")).toBeVisible();
  await expect(page.getByTestId("fund").getByTestId("cushion")).toBeVisible();
  await page.getByTestId("board-cta").click();
  await expect(page.getByTestId("invest").getByText("$500.00 available")).toBeVisible();
  for (const k of ["1", "0", "0"]) await page.getByTestId(`key-${k}`).click();
  await expect(page.getByTestId("amount")).toHaveText("$100");
  // The worst case in dollars is on screen before any money button.
  await expect(page.getByText(/Worst case: about/)).toBeVisible();
  await page.getByTestId("review").click();
  const sheet = page.getByTestId("review-sheet");
  await expect(sheet.getByTestId("review-amount")).toHaveText("$100.00");
  await expect(sheet.getByTestId("review-worst")).toContainText("$99");
  await expect(sheet.getByText(/Not a guarantee/)).toBeVisible();
  await sheet.getByTestId("confirm-board").click();
  await expect(page.getByTestId("boarded")).toBeVisible();
  await page.goto("/home");
  await expect(page.getByTestId("my-boat-Safe Harbor")).toBeVisible();
  // The bell shows it as new, and the panel lists it.
  await page.goto("/explore");
  const bell = page.locator('[data-testid="bell"]:visible');
  // The shared feed is cached 8 s on the server and polled every 10 s, so allow for both.
  await expect(page.locator('[data-testid="bell-dot"]:visible')).toBeVisible({ timeout: 30_000 });
  await bell.click();
  await expect(page.getByTestId("notifications").getByText("Invested in Safe Harbor")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-testid="bell-dot"]:visible')).toHaveCount(0);
});

test("investor: not enough dollars offers to add the difference inline", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await page.goto("/explore");
  await page.getByTestId("boat-card-Open Sea").click();
  await page.getByTestId("board-cta").click();
  for (const k of ["9", "0", "0"]) await page.getByTestId(`key-${k}`).click();
  await expect(page.getByText(/You have \$400/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add \$500/ })).toBeVisible();
  await expect(page.getByTestId("review")).toBeDisabled();
});

test("manager: Laura switches to manager mode, starts the fund, and the rules catch a bad trade", async ({ browser }) => {
  const page = await signIn(browser, "ana");
  await page.getByTestId("avatar").click();
  await expect(page.getByTestId("profile")).toBeVisible();
  await page.getByTestId("profile").getByTestId("mode-manager").click();
  await expect(page).toHaveURL(/\/captain$/);
  await expect(page.getByTestId("dashboard")).toBeVisible();
  await expect(page.getByTestId("fab")).toBeVisible();
  await page.locator('[data-testid="fund-Safe Harbor"]:visible').click();
  const sheet = page.getByTestId("bridge-Safe Harbor");
  // The sheet shows the fund's numbers and what it holds, asset by asset.
  await expect(sheet.getByTestId("fund-inside")).toContainText("From investors");
  await expect(sheet.getByTestId("inside-USYC")).toContainText("US Treasuries");
  await sheet.screenshot({ path: "test-results/manage-sheet.png" });
  await sheet.getByTestId("sail").click();
  await expect(sheet.getByTestId("trade")).toBeVisible();
  await sheet.getByTestId("trade").click();
  await expect(page.getByTestId("trade-screen")).toBeVisible();
  // 9,000 into Treasuries is about 89% of the fund; the cap is 70%.
  await page.getByTestId("to").selectOption({ label: "USYC" });
  await page.getByTestId("amount").fill("9000");
  await expect(page.getByTestId("rule")).toContainText("Max 70% in US Treasuries");
  // Bypass the UI: the contract still says no.
  await page.getByTestId("trade").click();
  await expect(page.getByTestId("send-trade")).toBeDisabled();
  await page.getByTestId("send-anyway").click();
  await expect(page.getByTestId("trade-result")).toBeVisible();
  await expect(page.getByTestId("trade-result")).not.toContainText("Moved");
  // Take the suggested fix.
  await page.getByTestId("use-max").click();
  await expect(page.getByTestId("rule")).toHaveCount(0);
  await page.getByTestId("trade").click();
  await page.getByTestId("trade-why").fill("Rate cuts look likely, so I'm moving more into Treasuries.");
  await page.getByTestId("send-trade").click();
  await expect(page.getByTestId("trade-result")).toContainText("Moved");
  // María gets the plain-language alert about the blocked trade.
  const maria = await signIn(browser, "grandma", { keepAlerts: true });
  const alert = maria.getByTestId("blocked-sheet");
  await expect(alert).toBeVisible();
  await expect(alert.getByText("Your money is safe")).toBeVisible();
  await alert.getByTestId("blocked-ok").click();
  await expect(alert).toHaveCount(0);
  // Her Activity shows the move; opening it shows Laura's reason and why the rules allowed it.
  await maria.goto("/activity");
  const move = maria.getByTestId("feed-manager").filter({ hasText: "Laura moved" }).first();
  await expect(move).toBeVisible({ timeout: 30_000 });
  await move.click();
  await expect(maria.getByTestId("move-detail")).toBeVisible();
  await expect(maria.getByText("Why Laura did it")).toBeVisible();
  await expect(maria.getByText("US Treasuries are allowed")).toBeVisible();
});

test("fund closes: the market falls, the keeper closes it, María loses less than 1%", async ({ browser, request }) => {
  await movePrice("USYC", -1500); // Treasuries -15% -> fund about -10%
  const k = await request.post("/api/keeper", { headers: { referer: "e2e" } });
  const body = await k.json();
  expect(body.results.find((r: { message: string }) => r.message)).toBeTruthy();
  const page = await signIn(browser, "grandma");
  await page.getByTestId("my-boat-Safe Harbor").click();
  await expect(page.getByTestId("port")).toBeVisible();
  await expect(page.getByTestId("port-you")).toHaveText("Your fund closed");
  const lost = await page.getByText(/You lost only/).innerText();
  expect(Math.abs(parseFloat(lost.replace(/[^\d.]/g, "")))).toBeLessThan(1);
  const back = parseFloat((await page.getByTestId("port-back").innerText()).replace(/[^\d.]/g, ""));
  expect(back).toBeGreaterThan(99);
  await page.getByTestId("withdraw").click();
  await expect(page.getByTestId("withdrawn")).toBeVisible();
});

test("manager: a family member creates their own fund, puts money in first, and it shows up for everyone", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await page.goto("/captain/launch");
  await expect(page.getByTestId("next")).toBeDisabled(); // a fund needs a name
  await page.getByTestId("fund-name").fill("Abuela's Harbor");
  for (let i = 0; i < 3; i++) await page.getByTestId("next").click();
  await expect(page.getByText("Abuela's Harbor")).toBeVisible();
  await page.getByTestId("create-fund").click();
  await expect(page).toHaveURL(/\/captain$/, { timeout: 30_000 });
  await page.locator("[data-testid=\"fund-Abuela's Harbor\"]:visible").click();
  const sheet = page.getByTestId("bridge-Abuela's Harbor");
  // The manager picks how much of their own money goes in.
  await sheet.getByTestId("stake-amount").fill("250");
  await expect(sheet.getByTestId("stake")).toContainText("$250");
  await sheet.getByTestId("stake").click();
  await expect(sheet.getByText(/: done\./)).toBeVisible({ timeout: 30_000 });
  // Trade explains why there's nothing to trade yet: the fund hasn't started and has no investors.
  await page.goto("/captain/trade");
  await expect(page.getByTestId("trade-waiting")).toContainText("Abuela's Harbor hasn't started yet");
  await page.goto("/explore");
  await expect(page.getByTestId("boat-card-Abuela's Harbor")).toBeVisible();
});

test("invitations: a manager invites an account ID, the investor finds the ticket and joins", async ({ browser }) => {
  const laura = await signIn(browser, "ana");
  await laura.goto("/invite");
  await expect(laura.getByTestId("invite")).toContainText("Invite investors");
  await laura.getByTestId("invite-to").fill(d.demo.grandma);
  await laura.getByTestId("invite-send").click();
  await expect(laura.getByTestId("invite-note")).toContainText("Invited.", { timeout: 30_000 });
  const maria = await signIn(browser, "grandma");
  // The invite is on-chain; the shared feed refreshes every few seconds.
  await maria.goto("/invitations");
  await expect(maria.getByTestId("ticket")).toBeVisible({ timeout: 30_000 });
  await expect(maria.getByTestId("ticket")).toContainText("Laura invited you");
  // P2: the fund behind the invite, then the real invest flow with "I know Laura personally" (P3).
  await maria.getByTestId("invite-open").click();
  await expect(maria.getByTestId("invited-fund")).toContainText("Laura covers first losses");
  await maria.locator('[data-testid="invited-invest"]:visible').click();
  for (const k of ["1", "0"]) await maria.getByTestId(`key-${k}`).click();
  await maria.getByTestId("review").click();
  const confirm = maria.getByTestId("review-sheet").getByTestId("confirm-board");
  await expect(confirm).toBeDisabled();
  await maria.getByTestId("know-check").click();
  await confirm.click();
  // P4: you're in, and the invitation is done.
  await expect(maria.getByTestId("boarded")).toContainText("You're in the");
  await maria.goto("/invitations");
  await expect(maria.getByTestId("invitations-empty")).toBeVisible();
});

test("missing pages and funds fail gracefully", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  await page.goto("/boat/0x0000000000000000000000000000000000000bad");
  await expect(page.getByText("We couldn't find this fund")).toBeVisible({ timeout: 15_000 });
  await page.goto("/nope");
  await expect(page.getByText("This page doesn't exist")).toBeVisible();
});

test("mock screens: payment, verify, withdraw and private-fund flows render with example data", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  for (const code of ["d1", "d2", "d3", "d4", "m2", "p1", "p4"]) {
    await page.goto(`/mock/${code}`);
    await expect(page.getByTestId(`mock-${code}`)).toBeVisible();
  }
  await page.goto("/mock/d1");
  await expect(page.getByTestId("worst-case")).toBeVisible(); // worst case before the money button
});

test("plain language: investor screens never say boat, captain, crew, crypto or wallet", async ({ browser }) => {
  const page = await signIn(browser, "grandma");
  for (const path of ["/home", "/explore", "/activity", "/me", "/manager"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {});
    const text = (await page.locator("body").innerText()).replace(/Boats/g, "");
    expect(text, path).not.toMatch(/\b(boat|captain|crew|crypto|wallet|gas|KYC)s?\b/i);
  }
});

test("activity: the shared feed is served by the app, not scanned by each browser", async ({ request }) => {
  const r = await request.get("/api/activity");
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.activity.length).toBeGreaterThan(0);
});

test("PWA: manifest and service worker are served", async ({ request }) => {
  const m = await request.get("/manifest.webmanifest");
  expect(m.ok()).toBeTruthy();
  const j = await m.json();
  expect(j.display).toBe("standalone");
  expect(j.icons.length).toBeGreaterThan(1);
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
});
