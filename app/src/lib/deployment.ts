import type { Address } from "viem";
import { defineChain } from "viem";
import { arcTestnet, type Deployment } from "@boats/sdk";
import local from "@/config/local-deployment.json";
import arc from "@/config/arc-deployment.json";

export type AppDeployment = Deployment & {
  startBlock: number;
  /** Boats on the factory the app doesn't list (e.g. a duplicate demo run). */
  hidden?: string[];
  demo: { ana?: Address; grandma?: Address; aiCaptain?: Address; blocked?: { message: string; txHash: string }[]; log?: { at: string; boat: string; kind: "trade" | "blocked" | "hold"; message: string; txHash?: string }[] };
};

export const CHAIN_NAME = (process.env.NEXT_PUBLIC_CHAIN ?? "local") as "local" | "arc";
export const deployment = (CHAIN_NAME === "arc" ? arc : local) as unknown as AppDeployment;
const HIDDEN = new Set((deployment.hidden ?? []).map((a) => a.toLowerCase()));
export const isListed = (a: string) => !HIDDEN.has(a.toLowerCase());
export const isDeployed = deployment.factory !== "0x0000000000000000000000000000000000000000";

export const localChain = defineChain({
  id: 31337,
  name: "Local",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

export const chain = CHAIN_NAME === "arc" ? arcTestnet : localChain;
export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0]!;
export const explorer = CHAIN_NAME === "arc" ? "https://testnet.arcscan.app" : null;

export function symbolOf(token: string): string {
  const hit = Object.entries(deployment.tokens).find(([, a]) => a.toLowerCase() === token.toLowerCase());
  return hit?.[0] ?? "?";
}
