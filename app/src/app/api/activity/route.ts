import { NextResponse } from "next/server";
import { getActivity, listBoats, type Activity } from "@boats/sdk";
import { deployment, isDeployed } from "@/lib/deployment";
import { publicClient } from "@/lib/client";

/**
 * Every event on every boat, scanned once on the server and shared by all visitors
 * (CDN-cached a few seconds). Each refresh only scans the blocks since the last one.
 */
type Cache = { boats: string; scanned: bigint; acts: Activity[]; at: number; body: string };
const g = globalThis as unknown as { __boatsActivity?: Cache; __boatsActivityBusy?: Promise<void> };
const TTL = 8_000;

const json = (acts: Activity[]) => JSON.stringify({ activity: acts.slice(0, 200) }, (_, v) => (typeof v === "bigint" ? v.toString() : v));

async function update() {
  const pc = publicClient();
  const [boats, head] = await Promise.all([listBoats(pc, deployment.factory), pc.getBlockNumber()]);
  const key = boats.join(",");
  const prev = g.__boatsActivity;
  const fresh = !prev || prev.boats !== key; // a new boat: rescan everything for it
  const from = fresh ? BigInt(deployment.startBlock ?? 0) : prev.scanned + 1n;
  const added = await getActivity(pc, boats, from, head);
  const acts = fresh ? added : [...added, ...prev.acts];
  g.__boatsActivity = { boats: key, scanned: head, acts, at: Date.now(), body: json(acts) };
}

export async function GET() {
  if (!isDeployed) return NextResponse.json({ activity: [] });
  const c = g.__boatsActivity;
  if (!c || Date.now() - c.at > TTL) {
    g.__boatsActivityBusy ??= update().catch((e) => console.error("activity", e)).finally(() => { g.__boatsActivityBusy = undefined; });
    await g.__boatsActivityBusy;
  }
  const body = g.__boatsActivity?.body;
  if (!body) return NextResponse.json({ error: "network" }, { status: 503 });
  return new NextResponse(body, { headers: { "content-type": "application/json", "cache-control": "public, s-maxage=8, stale-while-revalidate=60" } });
}
