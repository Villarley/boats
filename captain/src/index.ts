import type { Address, Hex } from "viem";
import { boatAbi } from "@boats/sdk";
import { buildSwapCall, clients, readBoat, revertReason, valueToAmount, type DecisionMemo } from "@boats/sdk";
import { fetchOdds, type Odds } from "@boats/sdk";
import { log, txLink } from "./log.js";
import { decide, type Rule } from "./rules.js";

export type CaptainConfig = {
  rpcUrl: string;
  privateKey: Hex;
  boat: Address;
  oracle: Address;
  tokens: { usdc: Address; usyc: Address; eurc?: Address; cirbtc?: Address };
  gemini: { event: string; match: string };
  rules: Rule[];
  spreadBps: number;
  webhook?: string;
};

export function configFromEnv(env = process.env): CaptainConfig {
  const need = (k: string) => {
    const v = env[k];
    if (!v) throw new Error(`Missing env ${k} (see captain/.env.example)`);
    return v;
  };
  const usyc = need("USYC") as Address;
  const trigger = Number(env.ODDS_TRIGGER ?? "0.7");
  const fraction = Number(env.MOVE_FRACTION ?? "0.5");
  // Gemini's live "Fed decision in December?" market. Rising rates: park part of the boat in Treasuries.
  const match = env.GEMINI_CONTRACT_MATCH || "Hike 25bps";
  return {
    rpcUrl: env.RPC_URL ?? "https://rpc.testnet.arc.io",
    privateKey: need("CAPTAIN_PRIVATE_KEY") as Hex,
    boat: need("BOAT") as Address,
    oracle: need("ORACLE") as Address,
    tokens: { usdc: need("USDC") as Address, usyc, eurc: env.EURC as Address, cirbtc: env.CIRBTC as Address },
    gemini: { event: env.GEMINI_EVENT || "FED261211", match },
    // RULES_JSON overrides the default rule, e.g. [{"kind":"odds-above","threshold":0.8,"to":"0x...","targetFraction":0.3,"text":"..."}]
    rules: env.RULES_JSON ? (JSON.parse(env.RULES_JSON) as Rule[]) : [
      {
        kind: "odds-above",
        threshold: trigger,
        to: usyc,
        targetFraction: fraction,
        text: `If the odds of a Fed ${match.toLowerCase()} go above ${Math.round(trigger * 100)}%, move ${Math.round(fraction * 100)}% to Treasuries.`,
      },
    ],
    spreadBps: Number(env.SPREAD_BPS ?? "10"),
    webhook: env.LOG_WEBHOOK || undefined,
  };
}

function symbols(c: CaptainConfig) {
  const s: Record<string, string> = { [c.tokens.usdc.toLowerCase()]: "Dollars", [c.tokens.usyc.toLowerCase()]: "Treasuries" };
  if (c.tokens.eurc) s[c.tokens.eurc.toLowerCase()] = "Euros";
  if (c.tokens.cirbtc) s[c.tokens.cirbtc.toLowerCase()] = "Bitcoin";
  return s;
}

const oddsLog = (o?: Odds) => (o ? { probability: o.probability, label: o.contractLabel, event: o.eventTicker, source: o.source } : undefined);

/** One decision cycle. `rogue` makes the captain try to put everything in bitcoin, to show the contract blocking it. */
export async function runOnce(c: CaptainConfig, opts: { rogue?: boolean } = {}) {
  const { publicClient: pc, walletClient: wc, account } = clients(c.rpcUrl, c.privateKey);
  const boat = await readBoat(pc, c.boat, symbols(c));
  const at = () => new Date().toISOString();

  if (boat.state !== "Sailing") {
    await log({ at: at(), boat: c.boat, kind: "hold", message: `Boat is ${boat.state}. Nothing to trade.` }, c.webhook);
    return { action: "hold" as const };
  }

  if (opts.rogue) {
    const btc = c.tokens.cirbtc;
    if (!btc) throw new Error("Rogue mode needs CIRBTC");
    const cash = boat.holdings[0]!.value;
    const msg = `Trying to move all ${cash / 1_000_000n} dollars into Bitcoin.`;
    try {
      await pc.simulateContract({ account, address: c.boat, abi: boatAbi, functionName: "swap", args: [c.tokens.usdc, btc, cash, 0n] });
    } catch (e) {
      // Send it anyway so the failed attempt is public on the explorer.
      let hash: Hex | undefined;
      try {
        hash = await wc!.writeContract({ address: c.boat, abi: boatAbi, functionName: "swap", args: [c.tokens.usdc, btc, cash, 0n], gas: 400_000n });
        await pc.waitForTransactionReceipt({ hash });
      } catch {}
      await log({ at: at(), boat: c.boat, kind: "blocked", message: `${msg} ${revertReason(e)}`, txHash: hash, explorer: txLink(hash) }, c.webhook);
      return { action: "blocked" as const, hash };
    }
    await log({ at: at(), boat: c.boat, kind: "error", message: `${msg} The simulation did not revert: check the boat's weights.` }, c.webhook);
    return { action: "error" as const };
  }

  let odds: Odds | null = null;
  let oddsError: string | undefined;
  try {
    odds = await fetchOdds(c.gemini.event, c.gemini.match);
  } catch (e) {
    oddsError = (e as Error).message;
  }

  const d = decide({ rules: c.rules, holdings: boat.holdings, usdc: boat.usdc, odds, oddsError, spreadBps: c.spreadBps });
  if (d.action === "hold") {
    await log({ at: at(), boat: c.boat, kind: "hold", message: d.reason, odds: oddsLog(d.odds) }, c.webhook);
    return d;
  }

  const amountIn = await valueToAmount(pc, c.oracle, d.from, boat.usdc, d.amountValue);
  try {
    // The decision and the odds it used ride in the swap's calldata, so anyone can audit it on the explorer.
    const memo: DecisionMemo = {
      why: d.reason,
      signal: d.odds ? { source: "gemini-prediction-markets", event: d.odds.eventTicker, contract: d.odds.contractLabel, probability: d.odds.probability, at: d.odds.fetchedAt } : undefined,
    };
    const call = buildSwapCall(c.boat, d.from, d.to, amountIn, 0n, memo);
    await pc.call({ account, to: call.to, data: call.data }); // simulate the exact calldata that will be sent
    const hash = await wc!.sendTransaction({ account: account!, chain: wc!.chain, to: call.to, data: call.data });
    const rcpt = await pc.waitForTransactionReceipt({ hash });
    const ok = rcpt.status === "success";
    await log({ at: at(), boat: c.boat, kind: ok ? "trade" : "error", message: ok ? d.reason : `Trade failed on chain. ${d.reason}`, odds: oddsLog(d.odds), txHash: hash, explorer: txLink(hash) }, c.webhook);
    return { ...d, hash };
  } catch (e) {
    await log({ at: at(), boat: c.boat, kind: "blocked", message: `${d.reason} ${revertReason(e)}`, odds: oddsLog(d.odds) }, c.webhook);
    return { action: "blocked" as const };
  }
}
