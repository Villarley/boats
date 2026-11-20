#!/usr/bin/env -S npx tsx
/**
 * Boats MCP server (stdio). Gives any AI agent the same powers our AI captain has, and no more:
 * read boats, pre-check a trade against the on-chain mandate, read Gemini prediction-market odds,
 * and build or send the calls a captain, a crew member or a keeper can make.
 *
 *   BOATS_RPC_URL      Arc testnet RPC (default https://rpc.testnet.arc.io)
 *   BOATS_PRIVATE_KEY  optional. Without it, write tools return unsigned calls for your own wallet.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Address, Hex } from "viem";
import { clients, revertReason } from "@boats/sdk";
import {
  buildAction,
  callsView,
  checkTradeTool,
  deployment,
  explorerTx,
  getBoatTool,
  listBoatsTool,
  oddsTool,
  positionTool,
  worstCaseTool,
  type Action,
} from "./tools.js";

const rpcUrl = process.env.BOATS_RPC_URL || "https://rpc.testnet.arc.io";
const key = process.env.BOATS_PRIVATE_KEY as Hex | undefined;
const { publicClient: pc, walletClient: wc, account } = clients(rpcUrl, key);

const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "an 0x address");
const dollars = z.union([z.string(), z.number()]).describe('Dollar amount, e.g. "5" or "12.50"');
const ok = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] });
const wrap = <A,>(fn: (a: A) => Promise<unknown>) => async (a: A) => {
  try {
    return ok(await fn(a));
  } catch (e) {
    return fail(e);
  }
};

const server = new McpServer({ name: "boats", version: "0.1.0" });

server.registerTool(
  "boats_deployment",
  { description: "Chain, contract and token addresses of the live Boats deployment on Arc testnet, plus whether this server can sign.", inputSchema: {} },
  wrap(async () => ({ ...deployment, rpcUrl, signer: account?.address ?? null, explorer: "https://testnet.arcscan.app" })),
);

server.registerTool(
  "boats_list",
  { description: "List official boats (funds) with state, captain, value, change since sailing, stop loss, take profit, fee and holdings with max weights.", inputSchema: {} },
  wrap(async () => listBoatsTool(pc)),
);

server.registerTool(
  "boats_get",
  { description: "Read one boat in full. Refuses boats that don't use the official oracle and router.", inputSchema: { boat: addr } },
  wrap(async ({ boat }: { boat: string }) => getBoatTool(pc, boat as Address)),
);

server.registerTool(
  "boats_check_trade",
  {
    description:
      "Dry-run a captain trade against the boat's mandate (same rule as Boat.swap()). Returns ok, or the rule broken, a plain-words reason and the max allowed amount. Call this before boats_act swap.",
    inputSchema: { boat: addr, from: z.string().describe("USDC, USYC, EURC, cirBTC or address"), to: z.string(), amountUsd: dollars },
  },
  wrap(async (a: { boat: string; from: string; to: string; amountUsd: string | number }) => checkTradeTool(pc, { ...a, boat: a.boat as Address })),
);

server.registerTool(
  "boats_worst_case",
  { description: "Before boarding: the crew's target worst-case loss in dollars for a deposit, given the captain's first-loss stake and the stop loss.", inputSchema: { boat: addr, amountUsd: dollars } },
  wrap(async (a: { boat: string; amountUsd: string | number }) => worstCaseTool(pc, { ...a, boat: a.boat as Address })),
);

server.registerTool(
  "boats_position",
  { description: "A wallet's position in a boat: deposit, current value after the first-loss waterfall, and what it can withdraw.", inputSchema: { boat: addr, who: addr } },
  wrap(async (a: { boat: string; who: string }) => positionTool(pc, { boat: a.boat as Address, who: a.who as Address })),
);

server.registerTool(
  "boats_odds",
  {
    description: "Live odds from Gemini Prediction Markets (public API). Default: event FED261211 'Fed decision in December?', contract 'Hike 25bps'. Probability is the YES price.",
    inputSchema: { event: z.string().optional(), match: z.string().optional().describe("Substring of the contract label") },
  },
  wrap(oddsTool),
);

const actions = ["board", "withdraw", "stake_and_sail", "swap", "check_voyage", "return_to_port", "claim_captain"] as const;

server.registerTool(
  "boats_act",
  {
    description: [
      "Do something on a boat. Crew: board (amountUsd), withdraw. Captain: stake_and_sail (amountUsd), swap (from, to, amountUsd), claim_captain. Anyone: check_voyage, return_to_port.",
      "Without BOATS_PRIVATE_KEY (or with dryRun) it returns unsigned {to, data} calls to send from your own wallet in order.",
      "With a key it simulates each call first and stops on a revert, returning the contract's reason (e.g. MandateViolation: max weight).",
      "A captain can never withdraw crew money: swap is the only power, and the contract enforces the mandate.",
    ].join(" "),
    inputSchema: {
      action: z.enum(actions),
      boat: addr,
      amountUsd: dollars.optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      minOutUsd: dollars.optional(),
      dryRun: z.boolean().optional(),
    },
  },
  wrap(async (a: { action: Action; boat: string; amountUsd?: string | number; from?: string; to?: string; minOutUsd?: string | number; dryRun?: boolean }) => {
    const calls = await buildAction(pc, { ...a, boat: a.boat as Address });
    if (!wc || !account || a.dryRun) return { signed: false, calls: callsView(calls), note: "Send these calls in order from the captain's or crew member's wallet." };
    const sent = [];
    for (const c of calls) {
      try {
        await pc.call({ account: account.address, to: c.to, data: c.data });
      } catch (e) {
        return { signed: true, reverted: true, at: sent.length, reason: revertReason(e), sent };
      }
      const hash = await wc.sendTransaction({ account, chain: wc.chain, to: c.to, data: c.data });
      const r = await pc.waitForTransactionReceipt({ hash });
      sent.push({ hash, status: r.status, explorer: explorerTx(hash) });
      if (r.status !== "success") return { signed: true, reverted: true, sent };
    }
    return { signed: true, sent };
  }),
);

await server.connect(new StdioServerTransport());
