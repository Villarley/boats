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

/** Arc testnet deployment (chain 5042002), redeployed Nov 20 2026 with invite-only (private) funds. Same values as app/src/config/arc-deployment.json. */
export const arcTestnetDeployment: Deployment = {
  chainId: 5042002,
  factory: "0x115e0bebcce14481f2c4b00aac533e15efddb2fb",
  oracle: "0x712f8c439e455e928b2f84c6f389d77e93c980f0",
  adapter: "0xd1a6b1a5ccc3b5470a5a41595a186f885ea9464f",
  tokens: {
    USDC: "0x3600000000000000000000000000000000000000",
    USYC: "0x7cfe546361594b24790d5f073a76a03217f0ee6d",
    EURC: "0x579eefde3f46de5cef4c75c652eee372e4c0e808",
    cirBTC: "0x56176b92852793a93f1783eb29232fa7c899b1bc",
  },
  mocks: ["USYC", "EURC", "cirBTC"],
  boats: [
    { name: "Safe Harbor", address: "0xed438B7A67C22AA48D0F32A69584405057535d4d" },
    { name: "Westerly", address: "0x6f762E474d9aA387631f2F32013B8bDb6d0A66e5" },
    { name: "Open Sea", address: "0xb751031f927a1FD9fb9b9EEe074894aeBcb04439" },
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
