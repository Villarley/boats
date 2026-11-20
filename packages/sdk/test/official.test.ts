import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { listOfficialBoats } from "../src/reads.js";

const d = {
  factory: "0x00000000000000000000000000000000000000f0",
  oracle: "0x00000000000000000000000000000000000000aa",
  adapter: "0x00000000000000000000000000000000000000bb",
  tokens: { USDC: "0x00000000000000000000000000000000000000cc" },
} as const;

const good = "0x0000000000000000000000000000000000000001";
const evilRouter = "0x0000000000000000000000000000000000000002";
const evilOracle = "0x0000000000000000000000000000000000000003";

const config: Record<string, [string, string, string]> = {
  [good]: [d.oracle, d.adapter, d.tokens.USDC],
  [evilRouter]: [d.oracle, "0x00000000000000000000000000000000000000ee", d.tokens.USDC],
  [evilOracle]: ["0x00000000000000000000000000000000000000ee", d.adapter, d.tokens.USDC],
};

const pc = {
  readContract: async () => [good, evilRouter, evilOracle],
  multicall: async ({ contracts }: { contracts: { address: string; functionName: string }[] }) =>
    contracts.map((c) => {
      const i = { oracle: 0, router: 1, usdc: 2 }[c.functionName]!;
      return { status: "success", result: config[c.address]![i]!.toUpperCase().replace("0X", "0x") };
    }),
} as unknown as PublicClient;

describe("listOfficialBoats", () => {
  it("drops boats created with a foreign router or oracle", async () => {
    expect(await listOfficialBoats(pc, d)).toEqual([good]);
  });
});
