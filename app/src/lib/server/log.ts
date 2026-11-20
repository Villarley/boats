import "server-only";

export type Entry = { at: string; boat: string; kind: "hold" | "trade" | "blocked" | "error" | "keeper"; message: string; txHash?: string; odds?: unknown };
const g = globalThis as unknown as { __boatsLog?: Entry[] };
const store = (g.__boatsLog ??= []);

export function pushLog(e: Entry) {
  store.unshift(e);
  if (store.length > 200) store.length = 200;
}
export function readLog(boat?: string | null) {
  return boat ? store.filter((e) => e.boat.toLowerCase() === boat.toLowerCase()) : store;
}
