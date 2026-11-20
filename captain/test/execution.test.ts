import { describe, expect, it, vi } from "vitest";
import { decodeFunctionData } from "viem";

const mocks = vi.hoisted(() => ({ send: vi.fn(), call: vi.fn() }));
vi.mock("../src/log.js", () => ({ log: vi.fn(), txLink: (hash: string) => hash }));
vi.mock("@boats/sdk", async (load) => {
  const actual = await load<typeof import("@boats/sdk")>();
  const usdc = actual.arcTestnetDeployment.tokens.USDC;
  const usyc = actual.arcTestnetDeployment.tokens.USYC;
  return {
    ...actual,
    clients: () => ({ publicClient: { call: mocks.call, waitForTransactionReceipt: async () => ({ status: "success" }) }, walletClient: { sendTransaction: mocks.send, chain: actual.arcTestnet }, account: { address: "0x0000000000000000000000000000000000000001" } }),
    readBoat: async () => ({ state: "Sailing", usdc, holdings: [{ token: usdc, symbol: "Dollars", value: 10_000_000n }, { token: usyc, symbol: "Treasuries", value: 0n, maxWeightBps: 7000 }] }),
    fetchOdds: async () => ({ eventTicker: "FED261211", eventTitle: "Fed", contractLabel: "Hike 25bps", probability: 0.91, source: "bestBid/bestAsk mid", quote: { bestBid: "0.90", bestAsk: "0.92", spreadBps: 200 }, fetchedAt: new Date().toISOString() }),
    valueToAmount: async (_pc: unknown, _oracle: unknown, _token: unknown, _usdc: unknown, value: bigint) => value,
  };
});
import { arcTestnetDeployment, boatAbi, decodeSwapMemo } from "@boats/sdk";
import { configFromEnv, runOnce } from "../src/index.js";

describe("captain execution", () => {
  it("simulates and sends the same memo-bearing calldata with a nonzero 1% slippage floor", async () => {
    mocks.send.mockResolvedValue(`0x${"a".repeat(64)}`);
    const config = configFromEnv({ CAPTAIN_PRIVATE_KEY: `0x${"1".repeat(64)}`, BOAT: arcTestnetDeployment.boats[1]!.address, ORACLE: arcTestnetDeployment.oracle, ...arcTestnetDeployment.tokens });
    expect((await runOnce(config)).action).toBe("swap");
    const sent = mocks.send.mock.calls[0]![0];
    const simulated = mocks.call.mock.calls[0]![0];
    expect(simulated.data).toBe(sent.data);
    const decoded = decodeFunctionData({ abi: boatAbi, data: sent.data });
    expect(decoded.args?.[3]).toBe(4_950_000n);
    expect(decodeSwapMemo(sent.data)?.signal).toMatchObject({ event: "FED261211", probability: 0.91 });
  });
});
