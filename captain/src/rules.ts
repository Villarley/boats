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
  /** ignore trades smaller than this (USDC base units) to avoid dust churn. Default: $10 or 2% of NAV, whichever is smaller. */
  minTrade?: bigint;
  /** Age of the fetched snapshot, not the age of the exchange's last trade. */
  maxOddsAgeMs?: number;
  /** Maximum YES bid/ask width in probability bps; default 500 = 5 percentage points. */
  maxQuoteSpreadBps?: number;
  now?: number;
}): Decision {
  const { rules, holdings, usdc, odds, oddsError, spreadBps = 0 } = args;
  const n = nav(holdings);
  const minTrade = args.minTrade ?? (n / 50n < 10_000_000n ? n / 50n : 10_000_000n);
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  for (const r of rules) {
    if (r.kind !== "odds-above") continue;
    if (!odds) {
      return { action: "hold", reason: `Market data unavailable${oddsError ? ` (${oddsError})` : ""}. Holding position.` };
    }
    const age = (args.now ?? Date.now()) - Date.parse(odds.fetchedAt);
    if (!Number.isFinite(odds.probability) || odds.probability < 0 || odds.probability > 1 || !Number.isFinite(age) || age < -30_000 || age > (args.maxOddsAgeMs ?? 120_000)) {
      return { action: "hold", reason: "Market snapshot is invalid or stale. Holding position.", odds };
    }
    if (!Number.isFinite(r.threshold) || r.threshold < 0 || r.threshold > 1 || !Number.isFinite(r.targetFraction) || r.targetFraction <= 0 || r.targetFraction > 1) {
      return { action: "hold", reason: "Rule has an invalid threshold or target fraction. Holding position.", odds };
    }
    const q = odds.quote;
    const bid = q?.bestBid == null || !q.bestBid.trim() ? NaN : Number(q.bestBid);
    const ask = q?.bestAsk == null || !q.bestAsk.trim() ? NaN : Number(q.bestAsk);
    const maxWidth = args.maxQuoteSpreadBps ?? 500;
    // Recompute from the prices rather than trusting caller-supplied spread metadata.
    if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid < 0 || ask > 1 || ask < bid || Math.abs(odds.probability - (bid + ask) / 2) > 1e-9 || !Number.isFinite(maxWidth) || maxWidth < 0 || (ask - bid) * 10_000 > maxWidth + 1e-9) {
      return { action: "hold", reason: "Market needs a valid two-sided quote within the spread limit. Holding position.", odds };
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
