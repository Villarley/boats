import { describe, expect, it } from "vitest";
import { checkTrade, type Holding } from "../src/mandate.js";

const USDC = "0x0000000000000000000000000000000000000001" as const;
const USYC = "0x0000000000000000000000000000000000000002" as const;
const BTC = "0x0000000000000000000000000000000000000003" as const;
const MEME = "0x0000000000000000000000000000000000000004" as const;
const U = 1_000_000n;

const boat = (cash: bigint, usyc = 0n, btc = 0n): Holding[] => [
  { token: USDC, symbol: "Dollars", value: cash },
  { token: USYC, symbol: "Treasuries", value: usyc, maxWeightBps: 7000 },
  { token: BTC, symbol: "Bitcoin", value: btc, maxWeightBps: 4000 },
];

describe("checkTrade mirrors Boat.swap()", () => {
  it("allows a trade inside the cap", () => {
    const r = checkTrade(boat(11_000n * U), USDC, USDC, BTC, 4_000n * U);
    expect(r.ok).toBe(true);
  });

  it("blocks past the max weight, names the rule and offers the max", () => {
    const r = checkTrade(boat(11_000n * U), USDC, USDC, BTC, 11_000n * U);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.rule).toBe("max-weight");
    expect(r.message).toBe("Max 40% in Bitcoin. This makes it 100%.");
    expect(r.maxAllowed).toBe(4_400n * U);
    // the suggested max passes
    expect(checkTrade(boat(11_000n * U), USDC, USDC, BTC, r.maxAllowed!).ok).toBe(true);
  });

  it("brandbook example: 88% Treasuries suggests the fix", () => {
    const holdings = boat(5_700n * U, 3_300n * U, 1_000n * U); // nav 10,000
    const r = checkTrade(holdings, USDC, USDC, USYC, 5_500n * U);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("Max 70% in Treasuries. This makes it 88%.");
    expect(r.maxAllowed).toBe(3_700n * U);
  });

  it("exact cap is allowed, like the contract (> reverts, = passes)", () => {
    expect(checkTrade(boat(10_000n * U), USDC, USDC, BTC, 4_000n * U).ok).toBe(true);
    expect(checkTrade(boat(10_000n * U), USDC, USDC, BTC, 4_000n * U + 1n).ok).toBe(false);
  });

  it("accounts for the router spread in the suggestion", () => {
    const r = checkTrade(boat(10_000n * U), USDC, USDC, BTC, 9_000n * U, 30);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(checkTrade(boat(10_000n * U), USDC, USDC, BTC, r.maxAllowed!, 30).ok).toBe(true);
  });

  it("blocks assets not on the list", () => {
    const h = [...boat(1_000n * U), { token: MEME, symbol: "Meme", value: 0n, maxWeightBps: 0 }];
    const r = checkTrade(h, USDC, USDC, MEME, 10n * U);
    expect(r).toMatchObject({ ok: false, rule: "asset-not-allowed", message: "Meme isn't on this boat's list." });
    expect(checkTrade(boat(1_000n * U), USDC, USDC, MEME, 10n * U)).toMatchObject({ ok: false, rule: "asset-not-allowed" });
  });

  it("selling back to dollars is always allowed", () => {
    expect(checkTrade(boat(0n, 0n, 4_000n * U), USDC, BTC, USDC, 4_000n * U).ok).toBe(true);
  });

  it("rejects zero, same asset and overdraw", () => {
    expect(checkTrade(boat(100n * U), USDC, USDC, BTC, 0n)).toMatchObject({ rule: "zero-amount" });
    expect(checkTrade(boat(100n * U), USDC, BTC, BTC, 1n)).toMatchObject({ rule: "same-asset" });
    expect(checkTrade(boat(100n * U), USDC, USDC, BTC, 200n * U)).toMatchObject({ rule: "insufficient-balance", maxAllowed: 100n * U });
  });
});
