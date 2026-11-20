import { describe, expect, it } from "vitest";
import { decodeFunctionData } from "viem";
import { boatAbi } from "../src/abi.js";
import { buildSwapCall } from "../src/calls.js";
import { decodeSwapMemo } from "../src/memo.js";

const A = "0x0000000000000000000000000000000000000001";
const B = "0x0000000000000000000000000000000000000002";
const BOAT = "0x0000000000000000000000000000000000000003";

describe("decision memo", () => {
  const memo = { why: "Hike 25bps at 91% (above 70%): move half to Treasuries", signal: { source: "gemini", event: "FED261211", contract: "Hike 25bps", probability: 0.91 } };
  it("round-trips through swap calldata", () => {
    const c = buildSwapCall(BOAT, A, B, 5_000_000n, 1n, memo);
    expect(decodeSwapMemo(c.data)).toEqual(memo);
  });
  it("leaves the swap arguments intact (the contract ignores the tail)", () => {
    const c = buildSwapCall(BOAT, A, B, 5_000_000n, 1n, memo);
    const d = decodeFunctionData({ abi: boatAbi, data: c.data });
    expect(d.functionName).toBe("swap");
    expect(d.args).toEqual([A, B, 5_000_000n, 1n]);
  });
  it("returns null for a plain swap", () => {
    expect(decodeSwapMemo(buildSwapCall(BOAT, A, B, 1n).data)).toBeNull();
  });
});
