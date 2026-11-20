import { describe, expect, it } from "vitest";
import type { Activity } from "@boats/sdk";
import { investedSeries } from "./history";

const NOW = 1_800_000_000;
const ME = "0x00000000000000000000000000000000000000aa";
const ev = (kind: Activity["kind"], boat: string, at: number, args: Record<string, unknown>) =>
  ({ kind, boat, txHash: "0x", blockNumber: 1n, args, at }) as unknown as Activity;

describe("investedSeries", () => {
  it("steps up when the account invests and ends at today's value", () => {
    const acts = [
      ev("boarded", "0xF1", NOW - 3 * 3600, { crew: ME, amount: 10_000_000n }),
      ev("boarded", "0xF2", NOW - 20 * 3600, { crew: ME, amount: 5_000_000n }),
      ev("boarded", "0xF1", NOW - 3600, { crew: "0xother", amount: 99_000_000n }), // someone else
    ];
    const s = investedSeries(acts, ME, 15.4, "1D", NOW);
    expect(s[0]).toBe(0);
    expect(Math.max(...s.slice(0, -1))).toBe(15);
    expect(s.at(-1)).toBe(15.4);
    expect(new Set(s).size).toBeGreaterThan(2); // not flat
  });

  it("a withdrawal takes that fund back to zero", () => {
    const acts = [
      ev("boarded", "0xF1", NOW - 5 * 86400, { crew: ME, amount: 20_000_000n }),
      ev("withdrawn", "0xF1", NOW - 86400, { crew: ME, amount: 21_000_000n }),
    ];
    const s = investedSeries(acts, ME, 0, "1W", NOW);
    expect(Math.max(...s)).toBe(20);
    expect(s.at(-2)).toBe(0);
  });

  it("'All' starts just before the first investment", () => {
    const acts = [ev("boarded", "0xF1", NOW - 40 * 86400, { crew: ME, amount: 1_000_000n })];
    const s = investedSeries(acts, ME, 1, "All", NOW);
    expect(s[0]).toBe(0);
    expect(s[3]).toBe(1);
  });
});
