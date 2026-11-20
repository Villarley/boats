import type { Address } from "viem";

/** One deployment of the Boats protocol. Filled from the Deploy.s.sol log. */
export type Deployment = {
  chainId: number;
  factory: Address;
  oracle: Address;
  adapter: Address;
  tokens: { USDC: Address; USYC: Address; EURC: Address; cirBTC: Address };
  /** which tokens are testnet mocks (shown as "sample" in the UI) */
  mocks: string[];
  boats: { name: string; address: Address }[];
};

const zero = "0x0000000000000000000000000000000000000000" as Address;

/** Arc testnet deployment. Replace with the real addresses after `forge script Deploy`. */
export const arcTestnetDeployment: Deployment = {
  chainId: 5042002,
  factory: zero,
  oracle: zero,
  adapter: zero,
  tokens: { USDC: zero, USYC: zero, EURC: zero, cirBTC: zero },
  mocks: ["USYC", "cirBTC"],
  boats: [],
};

/** Plain-words names for the UI: grandma never reads a ticker. */
export const ASSET_NAMES: Record<string, string> = {
  USDC: "Dollars",
  USYC: "US Treasuries",
  EURC: "Euros",
  cirBTC: "Bitcoin",
};

export function symbolOf(d: Deployment, token: Address): string {
  const hit = Object.entries(d.tokens).find(([, a]) => a.toLowerCase() === token.toLowerCase());
  return hit?.[0] ?? token.slice(0, 6);
}

export const explorerTx = (hash: string) => `https://explorer.testnet.arc.io/tx/${hash}`;
export const explorerAddress = (a: string) => `https://explorer.testnet.arc.io/address/${a}`;
