import { appendFile } from "node:fs/promises";

export type LogEntry = {
  at: string;
  boat: string;
  kind: "hold" | "trade" | "blocked" | "error" | "keeper";
  message: string;
  odds?: { probability: number; label: string; event: string; source: string };
  txHash?: string;
  explorer?: string;
};

const EXPLORER = "https://explorer.testnet.arc.io/tx/";

export function txLink(hash?: string) {
  return hash ? `${EXPLORER}${hash}` : undefined;
}

/** Writes one JSON line to captain-log.jsonl and, if set, POSTs it to the app. Never throws. */
export async function log(entry: LogEntry, webhook?: string, file = "captain-log.jsonl") {
  const line = JSON.stringify(entry);
  console.log(`[${entry.kind}] ${entry.message}${entry.explorer ? ` ${entry.explorer}` : ""}`);
  try {
    await appendFile(file, line + "\n");
  } catch {}
  if (webhook) {
    try {
      await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: line });
    } catch (e) {
      console.warn("log webhook failed:", (e as Error).message);
    }
  }
}
