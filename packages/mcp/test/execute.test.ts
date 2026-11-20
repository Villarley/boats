import { describe, expect, it, vi } from "vitest";
import type { clients } from "@boats/sdk";
import { executePlan, executionCaller } from "../src/execute.js";
import type { Planned } from "../src/tools.js";

const A = "0x0000000000000000000000000000000000000001";
const B = "0x0000000000000000000000000000000000000002";
const hash = `0x${"a".repeat(64)}`;
const plan: Planned = { ok: true, boat: "Test", summary: "Board", warnings: ["Caller checks were skipped."], calls: [{ to: A, data: "0x01" }, { to: A, data: "0x02" }] };
function connection() {
  return {
    publicClient: { call: vi.fn().mockResolvedValue({}), waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }) },
    walletClient: { chain: {}, sendTransaction: vi.fn().mockResolvedValue(hash) },
    account: { address: A },
  };
}
const typed = (c: unknown) => c as ReturnType<typeof clients>;

describe("MCP execution", () => {
  it("checks the signer actually sending rather than a supplied caller", () => {
    expect(() => executionCaller(B, A)).toThrow(/differs/);
    expect(executionCaller(B, A, true)).toBe(B);
    expect(executionCaller(undefined, A)).toBe(A);
    expect(executionCaller(B, undefined)).toBe(B);
  });
  it("returns warnings and never signs a dry run", async () => {
    const c = connection();
    const result = await executePlan(plan, typed(c), true);
    expect(result).toMatchObject({ ok: true, signed: false, warnings: plan.ok && plan.warnings });
    expect(c.publicClient.call).not.toHaveBeenCalled();
    expect(c.walletClient.sendTransaction).not.toHaveBeenCalled();
  });
  it("preserves completed steps when a later simulation fails", async () => {
    const c = connection();
    c.publicClient.call.mockRejectedValueOnce(new Error("simulation failed"));
    const result = await executePlan(plan, typed(c));
    expect(result).toMatchObject({ ok: false, failedAtStep: 1, sent: [] });
    expect(c.walletClient.sendTransaction).not.toHaveBeenCalled();
    c.publicClient.call.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("second step failed"));
    const partial = await executePlan(plan, typed(c));
    expect(partial).toMatchObject({ ok: false, failedAtStep: 2, sent: [{ hash, status: "success" }] });
  });
  it("returns the pending hash if receipt polling fails so the agent can avoid duplicate sends", async () => {
    const c = connection();
    c.publicClient.waitForTransactionReceipt.mockRejectedValueOnce(new Error("RPC timeout"));
    expect(await executePlan(plan, typed(c))).toMatchObject({ ok: false, failedAtStep: 1, sent: [{ hash, status: "pending" }] });
    expect(c.walletClient.sendTransaction).toHaveBeenCalledTimes(1);
  });
  it("stops after a reverted transaction", async () => {
    const c = connection();
    c.publicClient.waitForTransactionReceipt.mockResolvedValueOnce({ status: "reverted" });
    expect(await executePlan(plan, typed(c))).toMatchObject({ ok: false, sent: [{ hash, status: "reverted" }] });
    expect(c.walletClient.sendTransaction).toHaveBeenCalledTimes(1);
  });
});
