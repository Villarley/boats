import { describe, expect, it } from "vitest";
import { decide, type Rule } from "../src/rules";
import type { Holding } from "@boats/sdk";
import type { Odds } from "@boats/sdk";

const USDC = "0x0000000000000000000000000000000000000001" as const;
const USYC = "0x0000000000000000000000000000000000000002" as const;
const U = 1_000_000n;
const rules: Rule[] = [{ kind: "odds-above", threshold: 0.7, to: USYC, targetFraction: 0.5, text: "" }];
const holdings = (cash: bigint, usyc = 0n, cap = 6000): Holding[] => [
  { token: USDC, symbol: "Dollars", value: cash },
  { token: USYC, symbol: "Treasuries", value: usyc, maxWeightBps: cap },
];
const odds = (p: number): Odds => ({ eventTicker: "FED", eventTitle: "", contractLabel: "Cut 25bps", probability: p, source: "lastTradePrice", fetchedAt: "" });

describe("AI captain decisions", () => {
  it("holds below the trigger and says the number", () => {
    const d = decide({ rules, holdings: holdings(10_000n * U), usdc: USDC, odds: odds(0.34) });
    expect(d).toMatchObject({ action: "hold", reason: "Odds at 34%, below the 70% trigger. Holding position." });
  });
  it("moves half to Treasuries above the trigger", () => {
    const d = decide({ rules, holdings: holdings(10_000n * U), usdc: USDC, odds: odds(0.72) });
    expect(d).toMatchObject({ action: "swap", from: USDC, to: USYC, amountValue: 5_000n * U });
  });
  it("does not churn once positioned", () => {
    const d = decide({ rules, holdings: holdings(5_000n * U, 5_000n * U), usdc: USDC, odds: odds(0.8) });
    expect(d.action).toBe("hold");
  });
  it("shrinks the trade to the boat's cap instead of breaking it", () => {
    const d = decide({ rules: [{ ...rules[0]!, targetFraction: 0.9 } as Rule], holdings: holdings(10_000n * U), usdc: USDC, odds: odds(0.9) });
    expect(d).toMatchObject({ action: "swap", amountValue: 6_000n * U });
  });
  it("holds when market data is down", () => {
    const d = decide({ rules, holdings: holdings(10_000n * U), usdc: USDC, odds: null, oddsError: "Gemini 503" });
    expect(d).toMatchObject({ action: "hold", reason: "Market data unavailable (Gemini 503). Holding position." });
  });
});
