#!/usr/bin/env -S npx tsx
/**
 * Boats MCP server (stdio). Gives any AI agent the same powers our AI captain has, and no more:
 * read boats, judge risk before boarding, dry-run a trade against the on-chain mandate, read Gemini
 * prediction-market odds, and build or send the calls a captain, a crew member or a keeper can make.
 *
 *   BOATS_RPC_URL      Arc testnet RPC (default https://rpc.testnet.arc.io)
 *   BOATS_PRIVATE_KEY  optional. Without it, write tools return checked, unsigned calls for your own wallet.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getAddress, type Hex } from "viem";
import { clients, revertReason, type Call } from "@boats/sdk";
import {
  activityTool,
  callsView,
  checkTradeTool,
  deployment,
  explorerTx,
  getBoatTool,
  listBoatsTool,
  myPositionsTool,
  oddsContractsTool,
  oddsTool,
  planAction,
  planCreateBoat,
  positionTool,
  scoreTool,
  ToolError,
  txStatusTool,
  worstCaseTool,
  type Action,
  type Planned,
} from "./tools.js";

const rpcUrl = process.env.BOATS_RPC_URL || "https://rpc.testnet.arc.io";
const key = process.env.BOATS_PRIVATE_KEY as Hex | undefined;
const { publicClient: pc, walletClient: wc, account } = clients(rpcUrl, key);

const addr = (what: string) => z.string().regex(/^0x[0-9a-fA-F]{40}$/, "an 0x address").describe(what);
const boatArg = addr("Boat address, from boats_list");
const dollars = (what: string) => z.union([z.string(), z.number()]).describe(`${what}, in US dollars (USDC value), e.g. 5 or "12.50"`);
const token = (what: string) => z.string().describe(`${what}: USDC, USYC, EURC, cirBTC, or dollars / treasuries / euros / bitcoin, or a token address`);

const text = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2);
const ok = (v: unknown) => ({ content: [{ type: "text" as const, text: text(v) }] });
const fail = (e: unknown) => {
  // Keep tool errors short and actionable; never dump a raw RPC stack to the agent.
  const msg = e instanceof ToolError ? e.message : `RPC or contract error: ${revertReason(e) || (e instanceof Error ? e.message.split("\n")[0] : String(e))}`;
  return { isError: true, content: [{ type: "text" as const, text: msg }] };
};
const wrap = <A,>(fn: (a: A) => Promise<unknown>) => async (a: A) => {
  try {
    return ok(await fn(a));
  } catch (e) {
    return fail(e);
  }
};

/** Sends checked calls when a key is configured (simulating each first), else returns them unsigned. */
async function execute(p: Planned, dryRun?: boolean) {
  if (!p.ok) return { ok: false, boat: p.boat, problems: p.problems, note: "Nothing was built or sent. Fix the problems above and try again." };
  const calls: Call[] = p.calls;
  if (!wc || !account || dryRun) {
    return { ok: true, signed: false, boat: p.boat, summary: p.summary, calls: callsView(calls), howToSend: "Send these transactions in order, from the wallet that will act, on Arc testnet (chainId 5042002). Gas is paid in USDC." };
  }
  const sent = [];
  for (const c of calls) {
    try {
      await pc.call({ account: account.address, to: c.to, data: c.data });
    } catch (e) {
      return { ok: false, signed: true, boat: p.boat, revertedAtStep: sent.length + 1, reason: revertReason(e), sent };
    }
    const hash = await wc.sendTransaction({ account, chain: wc.chain, to: c.to, data: c.data });
    const r = await pc.waitForTransactionReceipt({ hash });
    sent.push({ step: sent.length + 1, hash, status: r.status, explorer: explorerTx(hash) });
    if (r.status !== "success") return { ok: false, signed: true, boat: p.boat, sent };
  }
  return { ok: true, signed: true, boat: p.boat, summary: p.summary, sent };
}

const server = new McpServer(
  { name: "boats", version: "0.2.0" },
  {
    instructions: [
      "Boats: funds ('boats') on Arc testnet where a captain (human or AI) can only swap inside an on-chain mandate, stakes first-loss money, and every voyage ends at a stop loss, take profit or date.",
      "Typical flows. Crew: boats_list -> boats_score + boats_worst_case -> boats_act board -> later boats_my_positions -> boats_act withdraw.",
      "Captain: boats_create -> boats_act stake_and_sail -> boats_odds -> boats_check_trade -> boats_act swap -> boats_act claim_captain.",
      "Money is in US dollars (fields ending in Usd); percentages are positive numbers (fields ending in Pct). Write tools check state, role and mandate before returning calls.",
    ].join("\n"),
  },
);

server.registerTool(
  "boats_deployment",
  { description: "Chain id, RPC, explorer, contract and token addresses of the live Boats deployment on Arc testnet, and whether this server can sign (signer).", inputSchema: {} },
  wrap(async () => ({
    chainId: deployment.chainId,
    factory: getAddress(deployment.factory),
    oracle: getAddress(deployment.oracle),
    router: getAddress(deployment.adapter),
    tokens: Object.fromEntries(Object.entries(deployment.tokens).map(([k, v]) => [k, getAddress(v)])),
    testnetMocks: deployment.mocks,
    boats: "Call boats_list for the current official boats.",
    rpcUrl,
    explorer: "https://testnet.arcscan.app",
    faucet: "https://faucet.circle.com",
    signer: account?.address ?? null,
  })),
);

server.registerTool(
  "boats_list",
  { description: "List official boats with state, what each role can do now (allowedActions), value, stop loss, take profit, captain fee, end date and holdings with current and max weights.", inputSchema: {} },
  wrap(async () => listBoatsTool(pc)),
);

server.registerTool(
  "boats_get",
  { description: "Read one boat in full (same fields as boats_list). Refuses addresses that aren't official boats.", inputSchema: { boat: boatArg } },
  wrap(async ({ boat }: { boat: string }) => getBoatTool(pc, boat)),
);

server.registerTool(
  "boats_score",
  { description: "Seaworthiness score 0-100 of a boat with points and a plain-words reason for each factor (captain's stake, floor, asset risk, concentration, track record).", inputSchema: { boat: boatArg } },
  wrap(async ({ boat }: { boat: string }) => scoreTool(pc, { boat })),
);

server.registerTool(
  "boats_worst_case",
  { description: "Before boarding: can this boat be boarded now, and the crew's target worst-case loss in dollars and percent for a deposit, after the captain's first-loss stake.", inputSchema: { boat: boatArg, amountUsd: dollars("Deposit") } },
  wrap(async (a: { boat: string; amountUsd: string | number }) => worstCaseTool(pc, a)),
);

server.registerTool(
  "boats_check_trade",
  {
    description:
      "Dry-run a captain's swap against the boat's mandate (the same rule Boat.swap() enforces). Returns ok, or the problems in plain words, the broken rule and the max allowed amount. Pass `who` to also check the caller is the captain.",
    inputSchema: { boat: boatArg, from: token("Asset to sell"), to: token("Asset to buy"), amountUsd: dollars("Value to move"), who: addr("Caller address (optional)").optional() },
  },
  wrap(async (a: { boat: string; from: string; to: string; amountUsd: string | number; who?: string }) => checkTradeTool(pc, a)),
);

server.registerTool(
  "boats_position",
  { description: "A wallet's position in one boat: crew deposit, value now after the first-loss waterfall, whether it can withdraw, and captain stake if it is the captain.", inputSchema: { boat: boatArg, who: addr("Wallet address") } },
  wrap(async (a: { boat: string; who: string }) => positionTool(pc, a)),
);

server.registerTool(
  "boats_my_positions",
  { description: "Every official boat where a wallet is crew or captain, with values, plus the wallet's USDC balance.", inputSchema: { who: addr("Wallet address") } },
  wrap(async (a: { who: string }) => myPositionsTool(pc, a)),
);

server.registerTool(
  "boats_activity",
  { description: "Recent on-chain events (boarded, sailed, swapped, ended, returned, withdrew, claimed), newest first, with explorer links. Optionally for one boat.", inputSchema: { boat: boatArg.optional(), limit: z.number().int().min(1).max(100).optional().describe("Max events, default 20") } },
  wrap(async (a: { boat?: string; limit?: number }) => activityTool(pc, a)),
);

server.registerTool(
  "boats_odds",
  {
    description: "Live odds of one contract on Gemini Prediction Markets (public API). Default: event FED261211 'Fed decision in December?', contract 'Hike 25bps'. probability is 0..1 (the YES price).",
    inputSchema: { event: z.string().optional().describe("Gemini event ticker, default FED261211"), match: z.string().optional().describe("Text in the contract label, e.g. 'Hike 25bps'. See boats_odds_contracts") },
  },
  wrap(oddsTool),
);

server.registerTool(
  "boats_odds_contracts",
  { description: "All contracts of a Gemini Prediction Markets event with their probability, so you can pick the exact `match` for boats_odds.", inputSchema: { event: z.string().optional().describe("Gemini event ticker, default FED261211") } },
  wrap(async (a: { event?: string }) => oddsContractsTool(a)),
);

const actions = ["board", "withdraw", "stake_and_sail", "swap", "check_voyage", "return_to_port", "claim_captain"] as const;

server.registerTool(
  "boats_act",
  {
    description: [
      "Act on a boat. Crew: board (amountUsd, boat must be Open), withdraw (Closed). Captain: stake_and_sail (amountUsd, Open), swap (from, to, amountUsd, Sailing), claim_captain (Closed). Anyone: check_voyage (Sailing), return_to_port (Returning).",
      "Checks state, role (pass `caller`) and, for swap, the mandate before building anything; returns ok:false with problems instead of calls that would revert.",
      "Swaps get a slippage cap (default 1%). Without BOATS_PRIVATE_KEY (or with dryRun) returns unsigned calls with chainId and a summary; with a key it simulates and sends each one.",
      "A captain can never withdraw crew money: swap is its only power.",
    ].join(" "),
    inputSchema: {
      action: z.enum(actions),
      boat: boatArg,
      amountUsd: dollars("Amount for board, stake_and_sail or swap").optional(),
      from: token("swap: asset to sell").optional(),
      to: token("swap: asset to buy").optional(),
      slippagePct: z.number().min(0).max(5).optional().describe("swap: max loss vs oracle value, percent (default 1)"),
      reason: z.string().optional().describe("swap: why you are trading, in plain words. Recorded on chain in the transaction so crew can audit your decision"),
      caller: addr("Wallet that will send (optional; defaults to this server's signer)").optional(),
      dryRun: z.boolean().optional().describe("Return unsigned calls even if a key is configured"),
    },
  },
  wrap(async (a: { action: Action; boat: string; amountUsd?: string | number; from?: string; to?: string; slippagePct?: number; caller?: string; reason?: string; dryRun?: boolean }) =>
    execute(await planAction(pc, { ...a, caller: a.caller ?? account?.address }), a.dryRun),
  ),
);

server.registerTool(
  "boats_create",
  {
    description: "Launch a new boat on the official factory, oracle and router, validated with the contract's rules. Then stake and sail with boats_act stake_and_sail.",
    inputSchema: {
      name: z.string().describe("Boat name"),
      captain: addr("Captain address (defaults to this server's signer)").optional(),
      assets: z.array(z.object({ token: token("Allowed asset (not USDC)"), maxWeightPct: z.number().describe("Max share of the boat, 1-100") })).describe("e.g. [{token:'treasuries',maxWeightPct:70},{token:'bitcoin',maxWeightPct:20}]"),
      stopLossPct: z.number().describe("Voyage ends if the boat falls this much, e.g. 10"),
      takeProfitPct: z.number().describe("Voyage ends if the boat rises this much, e.g. 15"),
      captainFeePct: z.number().describe("Captain's share of the crew's profit, 0-50"),
      days: z.number().describe("Voyage length in days"),
      dryRun: z.boolean().optional(),
    },
  },
  wrap(async (a: { name: string; captain?: string; assets: { token: string; maxWeightPct: number }[]; stopLossPct: number; takeProfitPct: number; captainFeePct: number; days: number; dryRun?: boolean }) => {
    const captain = a.captain ?? account?.address;
    if (!captain) throw new ToolError("Pass captain (no signer is configured on this server).");
    return execute(planCreateBoat({ ...a, captain }), a.dryRun);
  }),
);

server.registerTool(
  "boats_tx_status",
  { description: "Status of a transaction you sent (success, reverted, or pending) with an explorer link.", inputSchema: { hash: z.string().describe("0x transaction hash") } },
  wrap(async (a: { hash: string }) => txStatusTool(pc, a)),
);

await server.connect(new StdioServerTransport());
