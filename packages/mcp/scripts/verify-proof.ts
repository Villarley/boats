/** Read-only judge verification. No env file is loaded and no signer is constructed. */
import assert from "node:assert/strict";
import { createPublicClient, decodeFunctionData, http, parseEventLogs, type Hex } from "viem";
import { arcTestnet, arcTestnetDeployment as d, boatAbi, decodeSwapMemo, revertReason } from "@boats/sdk";

const pc = createPublicClient({ chain: arcTestnet, transport: http(process.env.BOATS_RPC_URL || arcTestnet.rpcUrls.default.http[0], { retryCount: 4, timeout: 20_000 }) });
const westerly = d.boats.find(b => b.name === "Westerly")!.address;
const finished = "0x7281C2b57894d9061B83A316426fC6149C729160";
const proofs = [
  { name: "Gemini-driven swap with decision memo", hash: "0x8762611513bddaf380a5dab13eea3c470b761fd57f7c9e5bd84b9b0283d5fc41", boat: westerly, fn: "swap", status: "success" },
  { name: "Rogue swap rejected", hash: "0x748ab0dbcdb8f122e27c3dff303eb268950f194111bb804e731ad348ee186ee6", boat: westerly, fn: "swap", status: "reverted" },
  { name: "Take profit triggered", hash: "0x2248e6f6ce95e912017c645bdee0f4fcf8be8db26f1552927f682157c06491f8", boat: finished, fn: "checkVoyage", status: "success" },
  { name: "Returned to USDC", hash: "0xe5f95b1ff9ab4f9fc54f51a5802cbdea2deff90c1144b144e1a2a65561f882e2", boat: finished, fn: "returnToPort", status: "success" },
  { name: "Crew payout", hash: "0x87a3d5ffd2b045ba0aa702d64247a4b2716211a98234501e330b811d5f88954e", boat: finished, fn: "withdraw", status: "success" },
] as const;

const results: Record<string, unknown>[] = [];
try {
  assert.equal(await pc.getChainId(), d.chainId, "Wrong chain");
  for (const proof of proofs) {
    try {
      const hash = proof.hash as Hex;
      const tx = await pc.getTransaction({ hash });
      const receipt = await pc.getTransactionReceipt({ hash });
      assert.equal(tx.to?.toLowerCase(), proof.boat.toLowerCase(), "Unexpected target");
      assert.equal(receipt.status, proof.status, "Unexpected transaction status");
      const decoded = decodeFunctionData({ abi: boatAbi, data: tx.input });
      assert.equal(decoded.functionName, proof.fn, "Unexpected method");
      const detail: Record<string, unknown> = {};
      if (proof === proofs[0]) {
        const memo = decodeSwapMemo(tx.input);
        assert.equal(typeof memo?.why, "string", "Missing decision memo");
        assert.equal(memo?.signal?.source, "gemini-prediction-markets");
        assert.equal(memo?.signal?.event, "FED261211");
        assert.equal(memo?.signal?.contract, "Hike 25bps");
        assert.equal(memo?.signal?.probability, 0.91);
        assert.equal(decoded.functionName, "swap");
        if (decoded.functionName === "swap") {
          assert.equal(decoded.args[0].toLowerCase(), d.tokens.USDC.toLowerCase());
          assert.equal(decoded.args[1].toLowerCase(), d.tokens.USYC.toLowerCase());
          detail.amountInUsdcBaseUnits = decoded.args[2].toString();
        }
        detail.memo = memo;
        detail.provenance = "The transaction proves what the captain recorded. Gemini does not cryptographically attest this memo.";
      }
      if (proof === proofs[1] && decoded.functionName === "swap") {
        let reason = "";
        try {
          await pc.simulateContract({ account: tx.from, address: proof.boat, abi: boatAbi, functionName: "swap", args: decoded.args, blockNumber: receipt.blockNumber - 1n });
        } catch (e) { reason = revertReason(e); }
        assert.match(reason, /max weight/i, "Historical replay must fail specifically on the mandate's max weight");
        detail.replayReason = reason;
      }
      if (proof === proofs[2]) {
        const event = parseEventLogs({ abi: boatAbi, logs: receipt.logs, eventName: "VoyageEnded" }).find(x => x.address.toLowerCase() === proof.boat.toLowerCase());
        assert.equal(event?.args.reason, 2, "Voyage must end at take profit");
      }
      if (proof === proofs[3]) {
        assert.ok(parseEventLogs({ abi: boatAbi, logs: receipt.logs, eventName: "ReturnedToPort" }).some(x => x.address.toLowerCase() === proof.boat.toLowerCase()));
      }
      if (proof === proofs[4]) {
        const event = parseEventLogs({ abi: boatAbi, logs: receipt.logs, eventName: "CrewWithdrawn" }).find(x => x.address.toLowerCase() === proof.boat.toLowerCase());
        assert.ok(event, "Missing crew payout event");
        const principal = await pc.readContract({ address: proof.boat, abi: boatAbi, functionName: "crewDeposit", args: [event.args.crew] });
        assert.ok(principal > 0n);
        const returnPct = Number((event.args.amount - principal) * 100_000n / principal) / 1000;
        assert.equal(Math.round(returnPct * 10) / 10, 9.9, "Payout must match the submitted +9.9% example");
        detail.principalUsdcBaseUnits = principal.toString();
        detail.payoutUsdcBaseUnits = event.args.amount.toString();
        detail.returnPct = returnPct;
      }
      results.push({ name: proof.name, ok: true, hash, block: receipt.blockNumber.toString(), status: receipt.status, ...detail });
    } catch (e) {
      results.push({ name: proof.name, ok: false, hash: proof.hash, error: (e as Error).message.split("\n")[0] });
    }
  }
} catch (e) {
  results.push({ name: "Arc connection", ok: false, error: (e as Error).message.split("\n")[0] });
}
const passed = results.filter(r => r.ok).length;
console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), chainId: d.chainId, readOnly: true, passed, total: proofs.length, results }, null, 2));
if (passed !== proofs.length) process.exitCode = 1;
