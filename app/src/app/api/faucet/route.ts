import { NextResponse } from "next/server";
import { createWalletClient, http, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_NAME, chain, deployment, rpcUrl } from "@/lib/deployment";
import { publicClient } from "@/lib/client";
import { serverKey } from "@/lib/server/keys";

const abi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const MAX = 10_000_000_000n; // $10k on the local chain
// Arc testnet: a fixed drip of real Circle testnet USDC (also the gas token), only to near-empty wallets.
const DRIP = BigInt(Math.round(Number(process.env.FAUCET_DRIP_USD ?? "5") * 1e6));
const last = new Map<string, number>();

// Circle's own testnet faucet API (server-side key). Circle sends its fixed drip straight to the
// person's address, so our faucet wallet never runs dry. Needs a Circle account upgraded to
// mainnet; until then Circle answers 403 and we fall back to our faucet wallet.
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
async function circleDrip(address: string): Promise<boolean> {
  if (!CIRCLE_API_KEY || CHAIN_NAME !== "arc") return false;
  try {
    const r = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: { authorization: `Bearer ${CIRCLE_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ address, blockchain: "ARC-TESTNET", usdc: true }),
    });
    if (!r.ok) console.warn("circle faucet", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.warn("circle faucet", e);
    return false;
  }
}

/** Whether this deployment can hand out test dollars (the UI falls back to Circle's faucet if not). */
export async function GET() {
  return NextResponse.json({ enabled: Boolean(serverKey("FAUCET_PRIVATE_KEY") || (CIRCLE_API_KEY && CHAIN_NAME === "arc")), drip: CHAIN_NAME === "local" ? null : DRIP.toString() });
}

/** "Add dollars" for test networks: mints on the local chain, drips from the faucet wallet on testnet. */
export async function POST(req: Request) {
  const { address, amount } = (await req.json().catch(() => ({}))) as { address?: string; amount?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  const key = serverKey("FAUCET_PRIVATE_KEY");
  if (!key && !(CIRCLE_API_KEY && CHAIN_NAME === "arc")) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });
  const pc = publicClient();
  const usdc = deployment.tokens.USDC as Address;

  let amt: bigint;
  if (CHAIN_NAME === "local") {
    try {
      amt = BigInt(amount ?? "0");
    } catch {
      return NextResponse.json({ error: "bad amount" }, { status: 400 });
    }
    if (amt <= 0n || amt > MAX) return NextResponse.json({ error: "amount out of range" }, { status: 400 });
  } else {
    // Any amount up to the drip (default: the whole drip), once an hour, to wallets under the drip.
    let want = DRIP;
    try {
      if (amount) want = BigInt(amount);
    } catch {
      return NextResponse.json({ error: "bad amount" }, { status: 400 });
    }
    if (want <= 0n) return NextResponse.json({ error: "amount out of range" }, { status: 400 });
    if (Date.now() - (last.get(address.toLowerCase()) ?? 0) < 60 * 60_000) return NextResponse.json({ error: "already sent" }, { status: 429 });
    const bal = await pc.readContract({ address: usdc, abi, functionName: "balanceOf", args: [address] });
    if (bal >= DRIP) return NextResponse.json({ error: "you already have dollars" }, { status: 429 });
    amt = want > DRIP ? DRIP : want;
    // Circle first: its drip (fixed amount, no tx hash returned) lands in a few seconds.
    if (await circleDrip(address)) {
      last.set(address.toLowerCase(), Date.now());
      return NextResponse.json({ hash: null, amount: null, via: "circle" });
    }
    if (!key) return NextResponse.json({ error: "faucet empty" }, { status: 503 });
  }
  if (!key) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });

  const wc = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(key) });
  last.set(address.toLowerCase(), Date.now());
  try {
    const hash = deployment.mocks.includes("USDC")
      ? await wc.writeContract({ address: usdc, abi, functionName: "mint", args: [address, amt] })
      : await wc.writeContract({ address: usdc, abi, functionName: "transfer", args: [address, amt] });
    await pc.waitForTransactionReceipt({ hash });
    return NextResponse.json({ hash, amount: amt.toString() });
  } catch (e) {
    last.delete(address.toLowerCase());
    console.error("faucet", e);
    return NextResponse.json({ error: "faucet empty" }, { status: 503 });
  }
}
