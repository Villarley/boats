"use client";
import { useEffect, useState } from "react";
import type { Activity } from "@boats/sdk";

// The server sends bigints as strings; turn the amounts back into bigints.
const NUM = new Set(["amount", "startValue", "base", "fee", "amountIn", "amountOut", "finalValue", "crewPayout", "nav", "navAfter"]);
export function revive(a: Activity): Activity {
  const args = Object.fromEntries(Object.entries(a.args as Record<string, unknown>).map(([k, v]) => [k, NUM.has(k) && typeof v === "string" ? BigInt(v) : v]));
  return { ...a, blockNumber: BigInt(a.blockNumber as unknown as string), args };
}

/** Every event on every fund, newest first, polled every 10 s. */
export function useActivityFeed() {
  const [acts, setActs] = useState<Activity[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/activity")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((j: { activity: Activity[] }) => alive && setActs(j.activity.map(revive)))
        .catch(() => {});
    load();
    const id = setInterval(() => !document.hidden && load(), 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return acts;
}

/** When a fund closed itself (its "ended" event), as a unix timestamp, once the feed and block are loaded. */
export function useEndedAt(fund?: string) {
  const acts = useActivityFeed();
  const [at, setAt] = useState<number | null>(null);
  const ended = fund ? acts.find((a) => a.kind === "ended" && a.boat.toLowerCase() === fund.toLowerCase()) : undefined;
  const block = ended?.blockNumber;
  useEffect(() => {
    if (block === undefined) return;
    let alive = true;
    import("./client").then(({ publicClient }) => publicClient().getBlock({ blockNumber: block })).then((b) => alive && setAt(Number(b.timestamp))).catch(() => {});
    return () => { alive = false; };
  }, [block]);
  return at;
}

/** "NOV 18 · 2:14 PM" */
export function stamp(unix: number) {
  const d = new Date(unix * 1000);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
