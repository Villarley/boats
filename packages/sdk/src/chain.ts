import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { boatAbi, erc20Abi } from "./abi.js";
import type { Holding } from "./mandate.js";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: { default: { name: "Arcscan", url: "https://explorer.testnet.arc.io" } },
  // Arc testnet ships the canonical Multicall3 (docs.arc.io, contract addresses).
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
  testnet: true,
});

export const STATE = ["Open", "Sailing", "Returning", "Closed"] as const;
export type BoatState = (typeof STATE)[number];

export function clients(rpcUrl: string, privateKey?: Hex) {
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: arcTestnet, transport });
  const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
  const walletClient = account ? createWalletClient({ chain: arcTestnet, transport, account }) : undefined;
  return { publicClient, walletClient, account };
}

export async function readBoat(pc: PublicClient, boat: Address, symbols: Record<string, string>) {
  const [state, usdc, assets, navV] = await Promise.all([
    pc.readContract({ address: boat, abi: boatAbi, functionName: "state" }),
    pc.readContract({ address: boat, abi: boatAbi, functionName: "usdc" }),
    pc.readContract({ address: boat, abi: boatAbi, functionName: "assets" }),
    pc.readContract({ address: boat, abi: boatAbi, functionName: "nav" }),
  ]);
  const tokens = [usdc, ...assets] as Address[];
  const holdings: Holding[] = await Promise.all(
    tokens.map(async (t, i) => {
      const [value, maxW] = await Promise.all([
        pc.readContract({ address: boat, abi: boatAbi, functionName: "valueOf", args: [t] }),
        i === 0 ? Promise.resolve(0) : pc.readContract({ address: boat, abi: boatAbi, functionName: "maxWeightBps", args: [t] }),
      ]);
      return {
        token: t,
        symbol: symbols[t.toLowerCase()] ?? (i === 0 ? "USDC" : t.slice(0, 6)),
        value: value as bigint,
        maxWeightBps: i === 0 ? undefined : Number(maxW),
      };
    }),
  );
  return { state: STATE[Number(state)] as BoatState, usdc: usdc as Address, holdings, nav: navV as bigint };
}

/** Converts a USDC value into token base units using the boat's own balance/value ratio, else the oracle. */
export async function valueToAmount(pc: PublicClient, oracle: Address, token: Address, usdc: Address, value: bigint) {
  if (token.toLowerCase() === usdc.toLowerCase()) return value;
  const price = await pc.readContract({
    address: oracle,
    abi: [{ type: "function", name: "getPrice", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const,
    functionName: "getPrice",
    args: [token],
  });
  return (value * 10n ** 18n) / price;
}

export function revertReason(err: unknown): string {
  if (err instanceof BaseError) {
    const r = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) {
      const name = r.data?.errorName;
      const args = r.data?.args?.map(String).join(", ");
      if (name === "MandateViolation") return `Blocked by the contract: ${args}`;
      return name ? `${name}${args ? `(${args})` : ""}` : (r.reason ?? r.shortMessage);
    }
    return err.shortMessage;
  }
  return String(err);
}

export async function balanceOf(pc: PublicClient, token: Address, who: Address) {
  return pc.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [who] });
}
