/**
 * The AI captain's rules, in plain words for the UI and as data for the engine.
 * The engine only proposes; the contract decides.
 */
import { checkTrade, fmtUsd, nav, type Holding } from "@boats/sdk";
import type { Odds } from "@boats/sdk";

export type Rule =
  | {
      kind: "odds-above";
      /** 0..1 */
      threshold: number;
      /** asset to move into when the odds are above the threshold */
      to: `0x${string}`;
      /** share of NAV that should sit in `to` (capped by the boat's max weight) */
      targetFraction: number;
      text: string;
    }
  | { kind: "max-weight"; token: `0x${string}`; maxBps: number; text: string };

export type Decision =
  | { action: "hold"; reason: string; odds?: Odds }
  | {
      action: "swap";
      from: `0x${string}`;
      to: `0x${string}`;
      /** USDC value to move */
      amountValue: bigint;
      reason: string;
      odds?: Odds;
    };

export function decide(args: {
  rules: Rule[];
  holdings: Holding[];
  usdc: `0x${string}`;
  odds: Odds | null;
  oddsError?: string;
  spreadBps?: number;
  /** ignore trades smaller than this (USDC base units) to avoid dust churn */
  minTrade?: bigint;
}): Decision {
  const { rules, holdings, usdc, odds, oddsError, spreadBps = 0, minTrade = 10_000_000n } = args;
  const n = nav(holdings);
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  for (const r of rules) {
    if (r.kind !== "odds-above") continue;
    if (!odds) {
      return { action: "hold", reason: `Market data unavailable${oddsError ? ` (${oddsError})` : ""}. Holding position.` };
    }
    const pct = Math.round(odds.probability * 100);
    const trig = Math.round(r.threshold * 100);
    if (odds.probability <= r.threshold) {
      return { action: "hold", reason: `Odds at ${pct}%, below the ${trig}% trigger. Holding position.`, odds };
    }
    const dst = holdings.find((h) => eq(h.token, r.to));
    if (!dst) return { action: "hold", reason: `Target asset is not on this boat. Holding.`, odds };
    const target = (n * BigInt(Math.round(r.targetFraction * 10_000))) / 10_000n;
    let want = target > dst.value ? target - dst.value : 0n;
    const cash = holdings.find((h) => eq(h.token, usdc))?.value ?? 0n;
    if (want > cash) want = cash;
    if (want < minTrade) {
      return { action: "hold", reason: `Odds at ${pct}% (above ${trig}%), already positioned in ${dst.symbol}.`, odds };
    }
    const check = checkTrade(holdings, usdc, usdc, r.to, want, spreadBps);
    if (!check.ok && check.rule === "max-weight" && check.maxAllowed && check.maxAllowed >= minTrade) {
      want = check.maxAllowed;
    } else if (!check.ok) {
      return { action: "hold", reason: `Odds at ${pct}%, but the trade would break a rule: ${check.message}`, odds };
    }
    return {
      action: "swap",
      from: usdc,
      to: r.to,
      amountValue: want,
      reason: `Odds of "${odds.contractLabel}" at ${pct}% (above ${trig}%). Moving ${fmtUsd(want)} to ${dst.symbol}.`,
      odds,
    };
  }
  return { action: "hold", reason: "No rule fired. Holding position.", odds: odds ?? undefined };
}
