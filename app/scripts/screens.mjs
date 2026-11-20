// Screenshots for design review against design/boats/brandbook.html.
//   node scripts/screens.mjs [outDir] [route ...]      (app running on :3000, local chain)
// Signs in as the local demo investor (PERSONA=manager for the demo manager), then captures each route at 390×844 and 1280×800.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [out = "screens", ...routes] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const sizes = [
  { name: "mobile", width: 390, height: 844 },
  { name: "web", width: 1280, height: 800 },
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: Number(process.env.DSF ?? 2), isMobile: s.name === "mobile", hasTouch: s.name === "mobile" });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.getByTestId(process.env.PERSONA === "manager" ? "demo-ana" : "demo-grandma").click();
  await page.waitForURL("**/home");
  for (const r of routes.length ? routes : ["/home"]) {
    await page.goto(base + r);
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const file = `${out}/${r.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "root"}-${s.name}.png`;
    await page.screenshot({ path: file, fullPage: s.name === "mobile" });
    console.log(file);
  }
  await ctx.close();
}
await browser.close();
