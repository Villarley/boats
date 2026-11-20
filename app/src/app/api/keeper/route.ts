import { NextResponse } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { keepBoat, listOfficialBoats } from "@boats/sdk";
import { chain, deployment, rpcUrl } from "@/lib/deployment";
import { publicClient } from "@/lib/client";
import { serverKey } from "@/lib/server/keys";
import { pushLog } from "@/lib/server/log";

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

const TRADED = "0x825f67dcf8bc9df74117166defc432f4cdf0a331eff757dd049327c83c2e02e1";

/**
 * QuickNode Stream payload ({ logs }, see docs/quicknode.md): a Traded log only needs its own boat checked.
 * A PriceUpdated log, an unknown payload or none (cron, button) checks every official boat.
 */
function boatsToCheck(official: `0x${string}`[], body: unknown): `0x${string}`[] {
  const logs = (body as { logs?: { address?: string; topics?: string[] }[] } | null)?.logs;
  if (!Array.isArray(logs) || logs.length === 0) return official;
  if (logs.some((l) => l.topics?.[0] !== TRADED)) return official;
  const hit = new Set(logs.map((l) => (l.address ?? "").toLowerCase()));
  return official.filter((b) => hit.has(b.toLowerCase()));
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
