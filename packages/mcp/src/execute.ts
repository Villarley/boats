import type { clients } from "@boats/sdk";
import { revertReason } from "@boats/sdk";
import { callsView, explorerTx, ToolError, type Planned } from "./tools.js";

type Clients = ReturnType<typeof clients>;

/** Validate the identity actually used for signed writes, before planning an action. */
export function executionCaller(caller: string | undefined, signer: string | undefined, dryRun?: boolean) {
  if (signer && !dryRun && caller && caller.toLowerCase() !== signer.toLowerCase()) {
    throw new ToolError("caller differs from this server's signer. Use dryRun:true for another wallet, or connect that wallet's key.");
  }
  return caller ?? signer;
}

/** Preserve unsigned-plan warnings and report every completed step of a multi-transaction action. */
export async function executePlan(p: Planned, c: Clients, dryRun?: boolean) {
  if (!p.ok) return { ...p, note: "Nothing was built or sent. Fix the problems above and try again." };
  const { publicClient: pc, walletClient: wc, account } = c;
  const warnings = p.warnings ?? [];
  if (!wc || !account || dryRun) {
    return { ok: true, signed: false, boat: p.boat, summary: p.summary, warnings, calls: callsView(p.calls), howToSend: "Send these transactions in order, from the wallet that will act, on Arc testnet (chainId 5042002). Gas is paid in USDC. Pre-checks are a snapshot; state, prices and liquidity may change before execution." };
  }
  const sent: { step: number; hash: string; status: string; explorer: string }[] = [];
  for (const call of p.calls) {
    try {
      await pc.call({ account: account.address, to: call.to, data: call.data });
      const hash = await wc.sendTransaction({ account, chain: wc.chain, to: call.to, data: call.data });
      // Keep the hash even if receipt polling fails; the agent must check it before retrying.
      sent.push({ step: sent.length + 1, hash, status: "pending", explorer: explorerTx(hash) });
      const receipt = await pc.waitForTransactionReceipt({ hash });
      sent[sent.length - 1]!.status = receipt.status;
      if (receipt.status !== "success") return { ok: false, signed: true, boat: p.boat, warnings, sent };
    } catch (e) {
      return { ok: false, signed: true, boat: p.boat, warnings, failedAtStep: sent.at(-1)?.status === "pending" ? sent.length : sent.length + 1, reason: revertReason(e), sent, note: "Earlier steps may have executed. Check all returned transaction hashes before retrying." };
    }
  }
  return { ok: true, signed: true, boat: p.boat, summary: p.summary, warnings, sent };
}
