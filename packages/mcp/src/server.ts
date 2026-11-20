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
import { readFile } from "node:fs/promises";
import { getAddress, type Hex } from "viem";
import { clients, revertReason } from "@boats/sdk";
import {
  activityTool,
  checkTradeTool,
  deployment,
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
} from "./tools.js";

import { executePlan, executionCaller } from "./execute.js";

const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };

const rpcUrl = process.env.BOATS_RPC_URL || "https://rpc.testnet.arc.io";
const key = process.env.BOATS_PRIVATE_KEY as Hex | undefined;
const connections = clients(rpcUrl, key);
const { publicClient: pc, account } = connections;

const addr = (what: string) => z.string().regex(/^0x[0-9a-fA-F]{40}$/, "an 0x address").describe(what);
const boatArg = addr("Boat address, from boats_list");
const dollars = (what: string) => z.union([z.string(), z.number()]).describe(`${what}, in US dollars (USDC value), e.g. 5 or "12.50"`);
const token = (what: string) => z.string().describe(`${what}: USDC, USYC, EURC, cirBTC, or dollars / treasuries / euros / bitcoin, or a token address`);

const text = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2);
const ok = (v: unknown) => ({ content: [{ type: "text" as const, text: text(v) }], structuredContent: JSON.parse(text(v)) as Record<string, unknown> });
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

const server = new McpServer(
  { name: "boats", version: "0.2.0" },
  {
    instructions: [
      "Boats: funds ('boats') on Arc testnet where a captain (human or AI) trades inside an on-chain mandate and stakes first-loss money. Public transactions trigger settlement at a stop loss, take profit or date; oracle, liquidity and liveness risks remain.",
      "Typical flows. Crew: boats_list -> boats_score + boats_worst_case -> boats_act board -> later boats_my_positions -> boats_act withdraw.",
      "Captain: boats_create -> boats_act stake -> crew boards -> boats_act sail -> boats_odds -> boats_check_trade -> boats_act swap -> boats_act claim_captain.",
      "Money is in US dollars (fields ending in Usd); percentages are positive numbers (fields ending in Pct). Write tools check state, role and mandate before returning calls.",
      "Start with boats://playbook for operating rules and boats://evidence for claims, verification commands and limitations. review_voyage prepares a read-only review before any unsigned plan.",
    ].join("\n"),
  },
);

// Fixed local resources only: no caller-provided filesystem paths or network fetches.
for (const resource of [
  { name: "playbook", path: "../../../AGENTS.md", mimeType: "text/markdown", description: "Roles, lifecycle, execution and recovery rules" },
  { name: "evidence", path: "../../../app/public/agent.json", mimeType: "application/json", description: "Machine-readable submission claims, proof links, verification commands and limitations" },
  { name: "proof-report", path: "../../../docs/evidence-report.json", mimeType: "application/json", description: "Recorded historical verification, with timestamp; rerun verify:proof for fresh verification" },
]) {
  server.registerResource(resource.name, `boats://${resource.name}`, { description: resource.description, mimeType: resource.mimeType }, async uri => ({
    contents: [{ uri: uri.href, mimeType: resource.mimeType, text: await readFile(new URL(resource.path, import.meta.url), "utf8") }],
  }));
}

server.registerPrompt("review_voyage", {
  description: "Review a proposed deposit using live state and risk estimates; prepare an unsigned plan only when explicitly requested.",
  argsSchema: { boat: boatArg, who: addr("Crew wallet to review").optional(), amountUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).optional() },
}, ({ boat, who, amountUsd }) => ({
  messages: [{ role: "user", content: { type: "text", text: [
    `Review boat ${boat}${who ? ` for crew wallet ${who}` : ""}${amountUsd ? ` and a proposed $${amountUsd} deposit` : ""}.`,
    "Read boats://playbook and boats://evidence. Call boats_get and boats_score; if a deposit was supplied call boats_worst_case. If a wallet was supplied call boats_position.",
    "Report current state, official deployment check, first-loss cushion, asset caps, ability to withdraw and oracle/liquidity/liveness risks. The score is a heuristic; threshold loss is not a guaranteed maximum.",
    "Do not infer permission to deposit or sign from this review. Only if the user explicitly requests a transaction, prepare boats_act with dryRun:true and the intended caller. Explain every call and warning. Never ask for a private key in chat.",
    "If a prior action returned a transaction hash, use boats_tx_status before proposing a retry. An RPC failure does not mean the transaction failed.",
  ].join("\n") } }],
}));

server.registerTool(
  "boats_deployment",
  { description: "Chain id, RPC, explorer, contract and token addresses of the live Boats deployment on Arc testnet, and whether this server can sign (signer).", annotations: READ, inputSchema: {} },
  wrap(async () => ({
    chainId: deployment.chainId,
    factory: getAddress(deployment.factory),
    oracle: getAddress(deployment.oracle),
    router: getAddress(deployment.adapter),
    tokens: Object.fromEntries(Object.entries(deployment.tokens).map(([k, v]) => [k, getAddress(v)])),
    testnetMocks: deployment.mocks,
    boats: "Call boats_list for the current official boats.",
    // Custom RPC URLs can contain credentials in their path or query. Never echo them to a model.
    rpcUrl: "https://rpc.testnet.arc.io",
    customRpcConfigured: rpcUrl !== "https://rpc.testnet.arc.io",
    explorer: "https://testnet.arcscan.app",
    faucet: "https://faucet.circle.com",
    signer: account?.address ?? null,
  })),
);

server.registerTool(
  "boats_list",
  { description: "List official boats with state, what each role can do now (allowedActions), value, stop loss, take profit, captain fee, end date and holdings with current and max weights.", annotations: READ, inputSchema: {} },
  wrap(async () => listBoatsTool(pc)),
);

server.registerTool(
  "boats_get",
  { description: "Read one boat in full (same fields as boats_list). Refuses addresses that aren't official boats.", annotations: READ, inputSchema: { boat: boatArg } },
  wrap(async ({ boat }: { boat: string }) => getBoatTool(pc, boat)),
);

server.registerTool(
  "boats_score",
  { description: "Heuristic seaworthiness score 0-100 of a boat with points and a reason per factor (stake, threshold, asset risk, concentration, track record). Not a safety certification or security audit.", annotations: READ, inputSchema: { boat: boatArg } },
  wrap(async ({ boat }: { boat: string }) => scoreTool(pc, { boat })),
);

server.registerTool(
  "boats_worst_case",
  { description: "Before boarding: can this boat be boarded now, and the modeled crew loss at an exit exactly at the stop threshold, after the captain's first-loss stake. Before exit costs; not a guaranteed maximum loss.", annotations: READ, inputSchema: { boat: boatArg, amountUsd: dollars("Deposit") } },
  wrap(async (a: { boat: string; amountUsd: string | number }) => worstCaseTool(pc, a)),
);

server.registerTool(
  "boats_check_trade",
  {
    description:
      "Dry-run a captain's swap against the boat's mandate (the same rule Boat.swap() enforces). Returns ok, or the problems in plain words, the broken rule and the max allowed amount. Pass `who` to also check the caller is the captain.",
    annotations: READ, inputSchema: { boat: boatArg, from: token("Asset to sell"), to: token("Asset to buy"), amountUsd: dollars("Value to move"), who: addr("Caller address (optional)").optional() },
  },
  wrap(async (a: { boat: string; from: string; to: string; amountUsd: string | number; who?: string }) => checkTradeTool(pc, a)),
);

server.registerTool(
  "boats_position",
  { description: "A wallet's position in one boat: crew deposit, value now after the first-loss waterfall, whether it can withdraw, and captain stake if it is the captain.", annotations: READ, inputSchema: { boat: boatArg, who: addr("Wallet address") } },
  wrap(async (a: { boat: string; who: string }) => positionTool(pc, a)),
);

server.registerTool(
  "boats_my_positions",
  { description: "Every official boat where a wallet is crew or captain, with values, plus the wallet's USDC balance.", annotations: READ, inputSchema: { who: addr("Wallet address") } },
  wrap(async (a: { who: string }) => myPositionsTool(pc, a)),
);

server.registerTool(
  "boats_activity",
  { description: "Recent on-chain events (boarded, sailed, swapped, ended, returned, withdrew, claimed), newest first, with explorer links. Optionally for one boat.", annotations: READ, inputSchema: { boat: boatArg.optional(), limit: z.number().int().min(1).max(100).optional().describe("Max events, default 20") } },
  wrap(async (a: { boat?: string; limit?: number }) => activityTool(pc, a)),
);

server.registerTool(
  "boats_odds",
  {
    description: "Live odds of one contract on Gemini Prediction Markets (public API). Default: event FED261211 'Fed decision in December?', contract 'Hike 25bps'. probability is 0..1 (the YES price).",
    annotations: READ, inputSchema: { event: z.string().optional().describe("Gemini event ticker, default FED261211"), match: z.string().optional().describe("Text in the contract label, e.g. 'Hike 25bps'. See boats_odds_contracts") },
  },
  wrap(oddsTool),
);

server.registerTool(
  "boats_odds_contracts",
  { description: "All contracts of a Gemini Prediction Markets event with their probability, so you can pick the exact `match` for boats_odds.", annotations: READ, inputSchema: { event: z.string().optional().describe("Gemini event ticker, default FED261211") } },
  wrap(async (a: { event?: string }) => oddsContractsTool(a)),
);

const actions = ["board", "withdraw", "stake", "sail", "stake_and_sail", "swap", "check_voyage", "return_to_port", "claim_captain"] as const;

server.registerTool(
  "boats_act",
  {
    description: [
      "Act on a boat. Crew: board (amountUsd, boat must be Open), withdraw (Closed). Captain: stake (amountUsd, Open), sail (Open, existing stake and crew required), stake_and_sail (amountUsd, Open, crew required), swap (from, to, amountUsd, Sailing), claim_captain (Closed). Anyone: check_voyage (Sailing), return_to_port (Returning).",
      "Checks state, role (pass `caller`) and, for swap, the mandate before building anything; returns ok:false for detected problems. Pre-checks cannot guarantee execution as prices, state and liquidity change.",
      "Swaps get a slippage cap (default 1%). Without BOATS_PRIVATE_KEY (or with dryRun) returns unsigned calls with chainId and a summary; with a key it simulates and sends each one.",
      "A captain cannot withdraw other crew deposits. Its trading authority is restricted to swaps; it can also stake and claim its own capital and fee.",
    ].join(" "),
    annotations: WRITE, inputSchema: {
      action: z.enum(actions),
      boat: boatArg,
      amountUsd: dollars("Amount for board, stake, stake_and_sail or swap").optional(),
      from: token("swap: asset to sell").optional(),
      to: token("swap: asset to buy").optional(),
      slippagePct: z.number().min(0).max(5).optional().describe("swap: max loss vs oracle value, percent (default 1)"),
      reason: z.string().optional().describe("swap: why you are trading, in plain words. Recorded on chain in the transaction so crew can audit your decision"),
      caller: addr("Wallet that will send (optional; defaults to this server's signer)").optional(),
      dryRun: z.boolean().optional().describe("Return unsigned calls even if a key is configured"),
    },
  },
  wrap(async (a: { action: Action; boat: string; amountUsd?: string | number; from?: string; to?: string; slippagePct?: number; caller?: string; reason?: string; dryRun?: boolean }) =>
    executePlan(await planAction(pc, { ...a, caller: executionCaller(a.caller, account?.address, a.dryRun) }), connections, a.dryRun),
  ),
);

server.registerTool(
  "boats_create",
  {
    description: "Launch a new boat on the official factory, oracle and router, validated with the contract's rules. Then boats_act stake, let crew board, and boats_act sail.",
    annotations: WRITE, inputSchema: {
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
    return executePlan(planCreateBoat({ ...a, captain }), connections, a.dryRun);
  }),
);

server.registerTool(
  "boats_tx_status",
  { description: "Status of a transaction you sent (success, reverted, or pending) with an explorer link.", annotations: READ, inputSchema: { hash: z.string().describe("0x transaction hash") } },
  wrap(async (a: { hash: string }) => txStatusTool(pc, a)),
);

await server.connect(new StdioServerTransport());
