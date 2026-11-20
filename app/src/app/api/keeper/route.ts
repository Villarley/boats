import { NextResponse } from "next/server";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { keepBoat, listBoats } from "@boats/sdk";
import { chain, deployment, rpcUrl } from "@/lib/deployment";
import { publicClient } from "@/lib/client";
import { serverKey } from "@/lib/server/keys";
import { pushLog } from "@/lib/server/log";

/**
 * Keeper: QuickNode Stream webhook (and the "Check limits now" button).
 * checkVoyage() and returnToPort() are public, so this key only pays gas.
 */
export async function POST(req: Request) {
  const secret = process.env.KEEPER_SECRET;
  if (secret && req.headers.get("x-keeper-secret") !== secret && !req.headers.get("referer")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = serverKey("KEEPER_PRIVATE_KEY");
  if (!key) return NextResponse.json({ error: "keeper not configured" }, { status: 503 });
  const pc = publicClient();
  const wc = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(key) });
  const boats = await listBoats(pc, deployment.factory);
  const results = [];
  for (const b of boats) {
    const r = await keepBoat(pc, wc, b);
    results.push(r);
    if (r.action === "ended" || r.action === "returned") pushLog({ at: new Date().toISOString(), boat: b, kind: "keeper", message: r.message, txHash: r.txHash });
  }
  return NextResponse.json({ results }, { headers: { "cache-control": "no-store" } });
}
