import { describe, expect, it } from "vitest";
import { decodeFunctionData } from "viem";
import { boatAbi } from "../src/abi.js";
import { buildBoardCalls, buildSwapCall } from "../src/calls.js";
import { friendlyError } from "../src/wallet.js";

const BOAT = "0x00000000000000000000000000000000000000b0" as const;
const USDC = "0x0000000000000000000000000000000000000001" as const;

describe("calldata builders", () => {
  it("board = approve exact amount + board, ready for one user operation", () => {
    const [a, b] = buildBoardCalls(BOAT, USDC, 100_000_000n);
    expect(a!.to).toBe(USDC);
    expect(a!.data.slice(0, 10)).toBe("0x095ea7b3"); // approve
    expect(b!.to).toBe(BOAT);
    expect(decodeFunctionData({ abi: boatAbi, data: b!.data })).toMatchObject({ functionName: "board", args: [100_000_000n] });
  });
  it("swap encodes the mandate-checked call", () => {
    const c = buildSwapCall(BOAT, USDC, BOAT, 5n, 4n);
    const d = decodeFunctionData({ abi: boatAbi, data: c.data });
    expect(d.functionName).toBe("swap");
    expect((d.args as unknown as unknown[]).map((x) => (typeof x === "string" ? x.toLowerCase() : x))).toEqual([USDC, BOAT, 5n, 4n]);
  });
  it("errors are human, never a hash", () => {
    expect(friendlyError(new Error("NotAllowedError: user cancelled"))).toBe("You cancelled. Your money hasn't moved.");
    expect(friendlyError({ shortMessage: 'reverted with MandateViolation("max weight exceeded")' })).toMatch(/contract said no/);
    expect(friendlyError(new Error("0xdeadbeef something"))).toBe("Your money hasn't moved. Try again.");
  });
});
