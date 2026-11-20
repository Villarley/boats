import { configFromEnv, runOnce } from "./index.js";

const args = new Set(process.argv.slice(2));
const config = configFromEnv();
const once = args.has("--once");
const rogue = args.has("--rogue");
const interval = Number(process.env.INTERVAL ?? "60") * 1000;

async function tick() {
  try {
    await runOnce(config, { rogue });
  } catch (e) {
    console.error("captain cycle failed:", (e as Error).message);
  }
}

await tick();
if (!once) setInterval(tick, interval);
