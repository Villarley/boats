import { describe, expect, it } from "vitest";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseEventLogs } from "viem";
import { boatAbi, factoryAbi } from "../src/abi.js";
import { buildBoardCalls, buildCreateBoatCall, buildInviteCall, buildSwapCall, type BoatConfigInput } from "../src/calls.js";
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
  it("invite encodes the captain's whole list in one call", () => {
    const A = "0x00000000000000000000000000000000000000a1" as const;
    const B = "0x00000000000000000000000000000000000000a2" as const;
    const c = buildInviteCall(BOAT, [A, B]);
    expect(c.to).toBe(BOAT);
    const d = decodeFunctionData({ abi: boatAbi, data: c.data });
    expect(d.functionName).toBe("invite");
    expect((d.args![0] as string[]).map((x) => x.toLowerCase())).toEqual([A, B]);
  });
  it("create boat defaults to public and passes inviteOnly through", () => {
    const cfg: BoatConfigInput = {
      name: "Private Harbor", captain: USDC, usdc: USDC, oracle: USDC, router: USDC, assets: [], maxWeightBps: [],
      stopLossBps: 1_000, takeProfitBps: 1_500, endTime: 2_000_000_000n, feeBps: 2_000, vestingDuration: 0n,
    };
    const config = (data: `0x${string}`) => (decodeFunctionData({ abi: factoryAbi, data }).args![0] as { inviteOnly: boolean; name: string });
    expect(config(buildCreateBoatCall(BOAT, cfg).data)).toMatchObject({ name: "Private Harbor", inviteOnly: false });
    expect(config(buildCreateBoatCall(BOAT, { ...cfg, inviteOnly: true }).data).inviteOnly).toBe(true);
  });
  it("Invited logs decode with the boat ABI", () => {
    const who = "0x00000000000000000000000000000000000000a1" as const;
    const topics = encodeEventTopics({ abi: boatAbi, eventName: "Invited", args: { who } });
    const [l] = parseEventLogs({ abi: boatAbi, logs: [{ address: BOAT, topics: topics as [`0x${string}`], data: encodeAbiParameters([], []), blockHash: "0x00", blockNumber: 1n, logIndex: 0, transactionHash: "0x00", transactionIndex: 0, removed: false }] });
    expect(l!.eventName).toBe("Invited");
    expect((l!.args as { who: string }).who.toLowerCase()).toBe(who);
  });
  it("errors are human, never a hash", () => {
    expect(friendlyError(new Error("NotAllowedError: user cancelled"))).toBe("You cancelled. Your money hasn't moved.");
    expect(friendlyError({ shortMessage: 'reverted with MandateViolation("max weight exceeded")' })).toMatch(/contract said no/);
    expect(friendlyError({ shortMessage: "reverted with NotInvited()" })).toMatch(/invite-only/);
    expect(friendlyError(new Error("0xdeadbeef something"))).toBe("Your money hasn't moved. Try again.");
  });
});
