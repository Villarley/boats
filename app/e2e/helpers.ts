import { createWalletClient, http, createPublicClient, defineChain, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployment from "../src/config/local-deployment.json";

const chain = defineChain({ id: 31337, name: "Local", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } });
const owner = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const pc = createPublicClient({ chain, transport: http() });
const wc = createWalletClient({ chain, transport: http(), account: owner });
const oracleAbi = [
  { type: "function", name: "price", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "setPrice", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
] as const;

export const d = deployment as unknown as { oracle: Address; tokens: Record<string, Address>; boats: { name: string; address: Address }[] };

/** Moves a token's oracle price by `bps` (e.g. -1500), like script/MovePrices.s.sol. */
export async function movePrice(symbol: string, bps: number) {
  const token = d.tokens[symbol]!;
  const p = await pc.readContract({ address: d.oracle, abi: oracleAbi, functionName: "price", args: [token] });
  const next = (p * BigInt(10_000 + bps)) / 10_000n;
  const hash = await wc.writeContract({ address: d.oracle, abi: oracleAbi, functionName: "setPrice", args: [token, next] });
  await pc.waitForTransactionReceipt({ hash });
}
