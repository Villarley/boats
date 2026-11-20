/**
 * Keeper: called by the QuickNode Stream webhook (app/api/keeper) on every PriceUpdated / Traded event,
 * and by the "check now" button. checkVoyage() and returnToPort() are public, so any key can run this;
 * it only pays gas.
 */
import type { Address, Hex, PublicClient, WalletClient } from "viem";
import { boatAbi } from "./abi.js";
import { STATE, clients, revertReason } from "./chain.js";

export type KeeperResult = { boat: Address; state: string; action: "none" | "ended" | "returned" | "error"; txHash?: Hex; message: string };

export async function keepBoat(pc: PublicClient, wc: WalletClient, boat: Address): Promise<KeeperResult> {
  const account = wc.account!;
  const state = STATE[Number(await pc.readContract({ address: boat, abi: boatAbi, functionName: "state" }))]!;
  try {
    if (state === "Sailing") {
      const { result, request } = await pc.simulateContract({ account, address: boat, abi: boatAbi, functionName: "checkVoyage" });
      if (!result) return { boat, state, action: "none", message: "Inside the limits." };
      const hash = await wc.writeContract(request);
      await pc.waitForTransactionReceipt({ hash });
      // Bring it straight back to port in the same run.
      const back = await keepBoat(pc, wc, boat);
      return { ...back, action: back.action === "returned" ? "returned" : "ended", txHash: back.txHash ?? hash, message: `Limit reached. ${back.message}` };
    }
    if (state === "Returning") {
      const { request } = await pc.simulateContract({ account, address: boat, abi: boatAbi, functionName: "returnToPort" });
      const hash = await wc.writeContract(request);
      await pc.waitForTransactionReceipt({ hash });
      return { boat, state: "Closed", action: "returned", txHash: hash, message: "Back in port. Crew can withdraw." };
    }
    return { boat, state, action: "none", message: `Boat is ${state}.` };
  } catch (e) {
    return { boat, state, action: "error", message: revertReason(e) };
  }
}

export async function runKeeper(boats: Address[], opts: { rpcUrl?: string; privateKey: Hex }) {
  const { publicClient, walletClient } = clients(opts.rpcUrl ?? "https://rpc.testnet.arc.io", opts.privateKey);
  const out: KeeperResult[] = [];
  for (const b of boats) out.push(await keepBoat(publicClient, walletClient!, b)); // sequential: one nonce at a time
  return out;
}
