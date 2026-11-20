import { describe, expect, it } from "vitest";
import { TransactionNotFoundError, TransactionReceiptNotFoundError, type PublicClient } from "viem";
import { deployment, exactMaxAllowed, parseUsd, planAction, planCreateBoat, resolveToken, txStatusTool, usd, worstCaseTool, checkTradeTool } from "../src/tools.js";

describe("helpers", () => {
  it("parses dollar amounts into USDC base units", () => {
    expect(parseUsd("5")).toBe(5_000_000n);
    expect(parseUsd("$12.50")).toBe(12_500_000n);
    expect(parseUsd(0.25)).toBe(250_000n);
    expect(() => parseUsd("-1")).toThrow();
    expect(() => parseUsd("abc")).toThrow();
    expect(() => parseUsd(0)).toThrow(/greater than zero/);
  });
  it("returns dollars as numbers with cents", () => {
    expect(usd(5_504_999n)).toBe(5.5);
    expect(usd(10_990_000n)).toBe(10.99);
  });
  it("resolves symbols and plain-words names", () => {
    expect(resolveToken(deployment, "USDC").toLowerCase()).toBe(deployment.tokens.USDC.toLowerCase());
    expect(resolveToken(deployment, "treasuries").toLowerCase()).toBe(deployment.tokens.USYC.toLowerCase());
    expect(resolveToken(deployment, "Bitcoin").toLowerCase()).toBe(deployment.tokens.cirBTC.toLowerCase());
    expect(() => resolveToken(deployment, "DOGE")).toThrow(/Unknown token/);
  });
  it("points at the live Arc deployment", () => {
    expect(deployment.chainId).toBe(5042002);
    expect(deployment.factory).not.toMatch(/^0x0{40}$/);
  });
});

// A fake chain with one official boat: $10 crew, $1 stake, all in USDC, cirBTC capped at 20%.
const BOAT = "0x00000000000000000000000000000000000000b1";
const CAPTAIN = "0x00000000000000000000000000000000000000c1";
const T = deployment.tokens;
function fakeChain(state: number, overrides: Record<string, unknown> = {}): PublicClient {
  const boat: Record<string, unknown> = {
    name: "Test", captain: CAPTAIN, state, endReason: 0, usdc: T.USDC, assets: [T.USYC, T.cirBTC], stopLossBps: 1000n, takeProfitBps: 1500n,
    endTime: 2_000_000_000n, feeBps: 2000n, crewTotal: 10_000_000n, captainStake: 1_000_000n, startValue: 11_000_000n, nav: 11_000_000n,
    finalValue: 0n, crewPayout: 0n, oracle: deployment.oracle, router: deployment.adapter,
    ...overrides,
  };
  const read = (fn: string, args?: unknown[]) => {
    if (fn === "valueOf") return String(args![0]).toLowerCase() === T.USDC.toLowerCase() ? 11_000_000n : 0n;
    if (fn === "maxWeightBps") return String(args![0]).toLowerCase() === T.cirBTC.toLowerCase() ? 2000n : 7000n;
    if (fn === "crewDeposit") return 0n;
    if (fn === "crewWithdrawn") return false;
    return boat[fn];
  };
  return {
    readContract: async ({ functionName, args }: { functionName: string; args?: unknown[] }) => (functionName === "allBoats" ? [BOAT] : functionName === "getPrice" ? 10n ** 18n : functionName === "balanceOf" ? 100_000_000n : read(functionName, args)),
    multicall: async ({ contracts, allowFailure }: { contracts: { functionName: string; args?: unknown[] }[]; allowFailure?: boolean }) =>
      contracts.map((c) => (allowFailure ? { status: "success", result: read(c.functionName, c.args) } : read(c.functionName, c.args))),
  } as unknown as PublicClient;
}

describe("planAction refuses calls that would revert", () => {
  it("doesn't stake and lock capital before discovering there is no crew", async () => {
    const p = await planAction(fakeChain(0, { crewTotal: 0n }), { action: "stake_and_sail", boat: BOAT, amountUsd: 1, caller: CAPTAIN });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.problems.join(" ")).toMatch(/No crew has boarded/);
    expect(p).not.toHaveProperty("calls");
  });
  it("can stake on an empty boat and leave boarding open", async () => {
    const p = await planAction(fakeChain(0, { crewTotal: 0n, captainStake: 0n }), { action: "stake", boat: BOAT, amountUsd: 1, caller: CAPTAIN });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.calls).toHaveLength(2);
  });
  it("can sail using the existing stake after crew joins", async () => {
    const p = await planAction(fakeChain(0), { action: "sail", boat: BOAT, caller: CAPTAIN });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.calls).toHaveLength(1);
  });
  it("won't sail without captain capital", async () => {
    const p = await planAction(fakeChain(0, { captainStake: 0n }), { action: "sail", boat: BOAT, caller: CAPTAIN });
    expect(p.ok).toBe(false);
  });
  it("keeps incomplete caller checks visible in unsigned plans", async () => {
    const p = await planAction(fakeChain(0), { action: "board", boat: BOAT, amountUsd: 1 });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.warnings?.[0]).toMatch(/checks were skipped/);
  });
  it("won't board a boat that is already Sailing", async () => {
    const p = await planAction(fakeChain(1), { action: "board", boat: BOAT, amountUsd: 5 });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.problems[0]).toMatch(/needs the boat to be Open; it is Sailing/);
  });
  it("won't build a swap that breaks the max weight", async () => {
    const p = await planAction(fakeChain(1), { action: "swap", boat: BOAT, amountUsd: 5, from: "USDC", to: "bitcoin", caller: CAPTAIN });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.problems.join(" ")).toMatch(/Max 20%/);
  });
  it("won't let a non-captain swap", async () => {
    const p = await planAction(fakeChain(1), { action: "swap", boat: BOAT, amountUsd: 1, from: "USDC", to: "bitcoin", caller: "0x00000000000000000000000000000000000000d1" });
    expect(p.ok).toBe(false);
  });
  it("builds a swap inside the mandate with a slippage cap", async () => {
    const p = await planAction(fakeChain(1), { action: "swap", boat: BOAT, amountUsd: 1, from: "USDC", to: "bitcoin", caller: CAPTAIN });
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.summary).toMatch(/1% slippage cap/);
  });
  it("refuses boats that aren't official", async () => {
    await expect(planAction(fakeChain(1), { action: "check_voyage", boat: "0x00000000000000000000000000000000000000e1" })).rejects.toThrow(/not an official Boats boat/);
  });
});

describe("read tools", () => {
  it("worst case says when a boat can't be boarded", async () => {
    const w = await worstCaseTool(fakeChain(1), { boat: BOAT, amountUsd: 5 });
    expect(w.canBoard).toBe(false);
    expect(typeof w.worstCaseLossUsd).toBe("number");
  });
  it("check_trade flags the wrong caller and state", async () => {
    const r = await checkTradeTool(fakeChain(0), { boat: BOAT, from: "USDC", to: "treasuries", amountUsd: 1, who: "0x00000000000000000000000000000000000000d1" });
    expect(r.ok).toBe(false);
    expect(r.problems?.length).toBe(2);
  });
});

describe("planCreateBoat", () => {
  const base = { name: "My boat", captain: CAPTAIN, assets: [{ token: "treasuries", maxWeightPct: 70 }], stopLossPct: 10, takeProfitPct: 15, captainFeePct: 20, days: 7 };
  it("builds a createBoat call on the official oracle and router", () => {
    const p = planCreateBoat(base);
    expect(p.ok).toBe(true);
    if (p.ok) expect(p.calls[0]!.to.toLowerCase()).toBe(deployment.factory.toLowerCase());
  });
  it("rejects configs the constructor would reject", () => {
    const p = planCreateBoat({ ...base, captainFeePct: 80, assets: [{ token: "USDC", maxWeightPct: 50 }] });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.problems.length).toBe(2);
  });
});

describe("exactMaxAllowed", () => {
  it("finds the largest amount, to the cent, that passes the max weight", () => {
    const h = [
      { token: T.USDC, symbol: "USDC", value: 11_000_000n },
      { token: T.cirBTC, symbol: "cirBTC", value: 0n, maxWeightBps: 2000 },
    ];
    const m = exactMaxAllowed(h, T.USDC, T.USDC, T.cirBTC, 10);
    expect(m).toBeGreaterThan(2_000_000n);
    expect(m % 10_000n).toBe(0n);
  });
});

describe("transaction status after a partial failure", () => {
  const hash = `0x${"a".repeat(64)}` as const;
  it("does not turn an RPC outage into a false not-found response", async () => {
    const pc = { getTransactionReceipt: async () => { throw new Error("RPC unavailable"); } } as unknown as PublicClient;
    await expect(txStatusTool(pc, { hash })).rejects.toThrow("RPC unavailable");
  });
  it("reports a known transaction without a receipt as pending", async () => {
    const pc = { getTransactionReceipt: async () => { throw new TransactionReceiptNotFoundError({ hash }); }, getTransaction: async () => ({ hash }) } as unknown as PublicClient;
    expect(await txStatusTool(pc, { hash })).toMatchObject({ status: "pending" });
  });
  it("reports not found only when the RPC actually reports a missing transaction", async () => {
    const pc = { getTransactionReceipt: async () => { throw new TransactionReceiptNotFoundError({ hash }); }, getTransaction: async () => { throw new TransactionNotFoundError({ hash }); } } as unknown as PublicClient;
    expect(await txStatusTool(pc, { hash })).toMatchObject({ status: "not found" });
  });
});
