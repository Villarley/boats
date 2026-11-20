import { NextResponse } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { keepBoat, listOfficialBoats } from "@boats/sdk";
import { chain, deployment, rpcUrl } from "@/lib/deployment";
import { publicClient } from "@/lib/client";
import { serverKey } from "@/lib/server/keys";
import { pushLog } from "@/lib/server/log";
import { boatsToCheck } from "@/lib/keeper-scope";

/**
 * Keeper: QuickNode Stream webhook (and the "Check limits now" button).
 * checkVoyage() and returnToPort() are public, so this key only pays gas.
 */
const g = globalThis as unknown as { __keeperLastPublic?: number };
const PUBLIC_EVERY_MS = 30_000;

/** The in-app "Check limits now" button: a same-origin browser request, at most once per 30 s. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.KEEPER_SECRET;
  const authed = !!secret && req.headers.get("x-keeper-secret") === secret; // fail closed if the secret is unset
  if (!authed) {
    if (!sameOrigin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const now = Date.now();
    if (now - (g.__keeperLastPublic ?? 0) < PUBLIC_EVERY_MS) {
      return NextResponse.json({ error: "checked a moment ago, try again in 30 seconds" }, { status: 429 });
    }
    g.__keeperLastPublic = now;
  }
  const key = serverKey("KEEPER_PRIVATE_KEY");
  if (!key) return NextResponse.json({ error: "keeper not configured" }, { status: 503 });
  const pc = publicClient();
  const wc = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(key) });
  const official = await listOfficialBoats(pc, deployment);
  const boats = boatsToCheck(official, await req.json().catch(() => null));
  const results = [];
  for (const b of boats) {
    const r = await keepBoat(pc, wc, b);
    results.push(r);
    if (r.action === "ended" || r.action === "returned") pushLog({ at: new Date().toISOString(), boat: b, kind: "keeper", message: r.message, txHash: r.txHash });
  }
  return NextResponse.json({ results }, { headers: { "cache-control": "no-store" } });
}
