import "server-only";
import { deployment } from "@/lib/deployment";

export type Entry = { at: string; boat: string; kind: "hold" | "trade" | "blocked" | "error" | "keeper"; message: string; txHash?: string; odds?: unknown };
const g = globalThis as unknown as { __boatsLog?: Entry[] };
const store = (g.__boatsLog ??= []);
// Real on-chain decisions from the deploy, so the log is never empty on a cold serverless instance.
const seeded: Entry[] = deployment.demo?.log ?? [];

export function pushLog(e: Entry) {
  store.unshift(e);
  if (store.length > 200) store.length = 200;
}
export function readLog(boat?: string | null) {
  const seen = new Set(store.map((e) => e.txHash).filter(Boolean));
  const all = [...store, ...seeded.filter((e) => !e.txHash || !seen.has(e.txHash))];
  return boat ? all.filter((e) => e.boat.toLowerCase() === boat.toLowerCase()) : all;
}
