import { describe, expect, it } from "vitest";
import { portSummary, waterfall, worstCaseCrewLossBps, worstCaseIfBoarding } from "../src/waterfall.js";

const U = 1_000_000n;
const C = 10_000n * U, K = 1_000n * U;

describe("waterfall matches Boat.waterfall()", () => {
  it("market -6%: captain absorbs it all", () => {
    expect(waterfall(C, K, 10_340n * U, 2000)).toEqual({ crew: 10_000n * U, captainBase: 340n * U, fee: 0n });
  });
  it("stop loss -10%: grandma loses 1%", () => {
    expect(waterfall(C, K, 9_900n * U, 2000)).toEqual({ crew: 9_900n * U, captainBase: 0n, fee: 0n });
  });
  it("take profit +15%: crew +12%, captain fee 300", () => {
    expect(waterfall(C, K, 12_650n * U, 2000)).toEqual({ crew: 11_200n * U, captainBase: 1_150n * U, fee: 300n * U });
  });
  it("conserves value for any outcome", () => {
    for (const v of [0n, 1n, 5_000n * U, 10_999n * U, 11_000n * U, 11_001n * U, 50_000n * U]) {
      const s = waterfall(C, K, v, 2000);
      expect(s.crew + s.captainBase + s.fee).toBe(v);
    }
  });
});

describe("worst case copy", () => {
  it("-10% floor with a 10% stake is -1% for the crew", () => {
    expect(worstCaseCrewLossBps(C, K, 1000)).toBe(100);
  });
  it("boarding dilutes the cushion and the review screen shows it", () => {
    const w = worstCaseIfBoarding(C, K, 10_000n * U, 1000); // crew doubles to 20k, stake stays 1k
    expect(w.bps).toBe(550); // 21k * 0.9 = 18.9k -> crew loses 1.1k of 20k
    expect(w.dollars).toBe(550n * U);
  });
  it("port summary: market vs you", () => {
    expect(portSummary(11_000n * U, 9_900n * U, 9_000n * U, 8_910n * U)).toEqual({ boatBps: -1000, youBps: -100, youDelta: -90n * U });
  });
});
