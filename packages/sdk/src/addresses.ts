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

/** Arc testnet deployment (chain 5042002), live since Nov 20 2026. Same values as app/src/config/arc-deployment.json. */
export const arcTestnetDeployment: Deployment = {
  chainId: 5042002,
  factory: "0x90acf1bb09a7b71c276187a7791e0593dfc68e74",
  oracle: "0xec5c4538335dc7712ae98660574b071232272093",
  adapter: "0x0cca2f532467984014445bef61b592a1eaec9cf0",
  tokens: {
    USDC: "0x3600000000000000000000000000000000000000",
    USYC: "0xc1401fecd029e1f3a528cc02535e98f95873fac1",
    EURC: "0x1a5dc3284fc658472fe2a7eaef3c87f0c7575000",
    cirBTC: "0x1f99f14b0704bd2551129385867a7f477d2b1e5e",
  },
  mocks: ["USYC", "EURC", "cirBTC"],
  boats: [
    { name: "Safe Harbor", address: "0x89376Bb6bE0824A4bCD832C86C8Fac483B6Eb978" },
    { name: "Westerly", address: "0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359" },
    { name: "Open Sea", address: "0xC2FFFAAA021f4214E6e685e883Cc06E0601e5c29" },
  ],
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

export const explorerTx = (hash: string) => `https://testnet.arcscan.app/tx/${hash}`;
export const explorerAddress = (a: string) => `https://testnet.arcscan.app/address/${a}`;
