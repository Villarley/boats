import { NextResponse } from "next/server";
import { createWalletClient, http, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_NAME, chain, deployment, rpcUrl } from "@/lib/deployment";
import { publicClient } from "@/lib/client";
import { serverKey } from "@/lib/server/keys";

const abi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

const MAX = CHAIN_NAME === "local" ? 10_000_000_000n : 200_000_000n; // $10k local, $200 testnet
const last = new Map<string, number>();

/** "Add dollars" for test networks: mints on the local chain, sends from the faucet wallet on testnet. */
export async function POST(req: Request) {
  const { address, amount } = (await req.json().catch(() => ({}))) as { address?: string; amount?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  let amt: bigint;
  try {
    amt = BigInt(amount ?? "0");
  } catch {
    return NextResponse.json({ error: "bad amount" }, { status: 400 });
  }
  if (amt <= 0n || amt > MAX) return NextResponse.json({ error: "amount out of range" }, { status: 400 });
  if (CHAIN_NAME !== "local" && Date.now() - (last.get(address) ?? 0) < 60_000) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const key = serverKey("FAUCET_PRIVATE_KEY");
  if (!key) return NextResponse.json({ error: "faucet not configured" }, { status: 503 });

  const wc = createWalletClient({ chain, transport: http(rpcUrl), account: privateKeyToAccount(key) });
  const usdc = deployment.tokens.USDC as Address;
  const hash = deployment.mocks.includes("USDC")
    ? await wc.writeContract({ address: usdc, abi, functionName: "mint", args: [address, amt] })
    : await wc.writeContract({ address: usdc, abi, functionName: "transfer", args: [address, amt] });
  await publicClient().waitForTransactionReceipt({ hash });
  last.set(address, Date.now());
  return NextResponse.json({ hash });
}
