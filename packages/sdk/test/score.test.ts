import { describe, expect, it } from "vitest";
import { score } from "../src/score.js";

const U = 1_000_000n;

describe("seaworthiness score", () => {
  it("Safe Harbor style boat scores high with a neutral new captain", () => {
    const s = score({
      crewTotal: 9_000n * U,
      captainStake: 1_000n * U,
      stopLossBps: 1000,
      assets: [
        { symbol: "US Treasuries", maxWeightBps: 7000, risk: "low" },
        { symbol: "Euros", maxWeightBps: 3000, risk: "low" },
        { symbol: "Bitcoin", maxWeightBps: 1000, risk: "high" },
      ],
      track: [],
    });
    expect(s.factors.map((f) => f.points)).toEqual([30, 20, 13, 10, 10]);
    expect(s.total).toBe(83);
    expect(s.factors[4]!.why).toMatch(/New captain/);
  });
  it("thin stake, wide floor and lots of bitcoin score low and say why", () => {
    const s = score({
      crewTotal: 19_000n * U,
      captainStake: 1_000n * U,
      stopLossBps: 2500,
      assets: [{ symbol: "Bitcoin", maxWeightBps: 8000, risk: "high" }],
      track: [-500, -200],
    });
    expect(s.total).toBeLessThan(40);
    expect(s.factors[0]!.why).toContain("5%");
    expect(s.factors[2]!.why).toContain("Bitcoin up to 80%");
  });
  it("uses the target crew before anyone boards", () => {
    const s = score({ crewTotal: 0n, captainStake: 1_000n * U, targetCrew: 9_000n * U, stopLossBps: 1000, assets: [], track: [] });
    expect(s.factors[0]!.points).toBe(30);
  });
});
