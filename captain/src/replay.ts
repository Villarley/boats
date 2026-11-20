/** Offline decision audit. Uses the production parser, captain and mandate checker. No RPC or signer. */
import { strict as assert } from "node:assert";
import { arcTestnetDeployment, checkTrade, parseEventOdds, type Holding } from "@boats/sdk";
import { decide, type Rule } from "./rules.js";

const { USDC, USYC, cirBTC } = arcTestnetDeployment.tokens;
const now = new Date("2026-11-20T12:00:00.000Z");
const holdings: Holding[] = [
  { token: USDC, symbol: "USDC", value: 10_000_000n },
  { token: USYC, symbol: "USYC", value: 0n, maxWeightBps: 7000 },
  { token: cirBTC, symbol: "cirBTC", value: 0n, maxWeightBps: 2000 },
];
const rule: Rule = { kind: "odds-above", threshold: 0.7, to: USYC, targetFraction: 0.5, text: "Fed hike odds above 70%: target 50% mock Treasuries." };
const event = (bid: string | null, ask: string | null, marketState = "open") => ({
  ticker: "FED261211", title: "Fed decision in December?", status: "active",
  contracts: [{ label: "Hike 25bps", status: "active", marketState, instrumentSymbol: "SYNTHETIC-FED-HIKE", prices: { bestBid: bid, bestAsk: ask } }],
});

const scenarios = [
  { id: "above-trigger", ev: event("0.90", "0.92"), expected: "swap" },
  { id: "below-trigger", ev: event("0.58", "0.62"), expected: "hold" },
  { id: "missing-data", ev: null, expected: "hold" },
  { id: "one-sided", ev: event(null, "0.91"), expected: "hold" },
  { id: "wide-spread", ev: event("0.72", "0.98"), expected: "hold" },
  { id: "closed-market", ev: event("0.90", "0.92", "closed"), expected: "hold" },
  { id: "stale-snapshot", ev: event("0.90", "0.92"), stale: true, expected: "hold" },
];
const results = scenarios.map(s => {
  const odds = s.ev ? parseEventOdds(s.ev, "Hike 25bps", new Date(now.getTime() - (s.stale ? 180_000 : 0))) : null;
  const d = decide({ rules: [rule], holdings, usdc: USDC, odds, now: now.getTime(), spreadBps: 10 });
  assert.equal(d.action, s.expected, s.id);
  if (d.action === "swap") {
    assert.equal(d.amountValue, 5_000_000n);
    assert.equal(checkTrade(holdings, USDC, d.from, d.to, d.amountValue, 10).ok, true);
  }
  return { id: s.id, passed: true, expected: s.expected, ...d };
});
const hostile = checkTrade(holdings, USDC, USDC, cirBTC, 10_000_000n, 10);
assert.equal(hostile.ok, false);
assert.equal(hostile.rule, "max-weight");

console.log(JSON.stringify({
  schemaVersion: "1.0", mode: "offline-synthetic-fixtures", networkCalls: 0, transactionsSent: 0,
  description: "Behavioral replay, not a backtest or return forecast. Historical Arc contract reverts are checked separately by verify:proof.",
  passed: results.length + 1, total: results.length + 1,
  scenarios: [...results, { id: "hostile-overweight-proposal", passed: true, expected: "blocked-by-sdk", result: hostile }],
}, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
