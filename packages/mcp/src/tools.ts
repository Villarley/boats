/**
 * Tool logic for the Boats MCP server, kept apart from the MCP wiring so it can be tested.
 * Reads use a public RPC. Writes return unsigned calls by default; they are sent only when
 * BOATS_PRIVATE_KEY is set, and every send is simulated first. The contract is the final judge.
 */
import { formatUnits, parseUnits, type Address, type Hex, type PublicClient } from "viem";
import {
  arcTestnetDeployment,
  buildBoardCalls,
  buildCheckVoyageCall,
  buildClaimCaptainCall,
  buildReturnToPortCall,
  buildStakeCalls,
  buildSwapCall,
  buildWithdrawCall,
  checkTrade,
  explorerTx,
  fetchOdds,
  getBoat,
  getPosition,
  listOfficialBoats,
  symbolOf,
  valueToAmount,
  waterfall,
  worstCaseIfBoarding,
  type BoatInfo,
  type Call,
  type Deployment,
} from "@boats/sdk";

export const deployment: Deployment = arcTestnetDeployment;

/** "$12.50" or "12.5" or 12.5 -> 12_500_000n (USDC base units, 6 decimals). */
export function parseUsd(v: string | number): bigint {
  const s = String(v).replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(s)) throw new Error(`Not a dollar amount: ${v}`);
  return parseUnits(s, 6);
}

export const usd = (v: bigint) => `$${Number(formatUnits(v, 6)).toFixed(2)}`;

/** Accepts a symbol (USDC, USYC, EURC, cirBTC, or the plain-words names) or an address. */
export function resolveToken(d: Deployment, t: string): Address {
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return t as Address;
  const aliases: Record<string, keyof Deployment["tokens"]> = {
    usdc: "USDC", dollars: "USDC", cash: "USDC",
    usyc: "USYC", treasuries: "USYC", "us treasuries": "USYC",
    eurc: "EURC", euros: "EURC",
    cirbtc: "cirBTC", btc: "cirBTC", bitcoin: "cirBTC",
  };
  const key = aliases[t.trim().toLowerCase()];
  if (!key) throw new Error(`Unknown token "${t}". Use USDC, USYC, EURC, cirBTC or an address.`);
  return d.tokens[key];
}

/** JSON-safe view of a boat for an agent: dollars as strings, limits in percent. */
export function boatView(d: Deployment, b: BoatInfo) {
  return {
    address: b.address,
    name: b.name,
    captain: b.captain,
    state: b.state,
    endReason: b.endReason,
    nav: usd(b.nav),
    crewTotal: usd(b.crewTotal),
    captainStake: usd(b.captainStake),
    changeSinceSailingPct: b.changeBps / 100,
    stopLossPct: -b.stopLossBps / 100,
    takeProfitPct: b.takeProfitBps / 100,
    captainFeeOfProfitPct: b.feeBps / 100,
    endsAt: new Date(b.endTime * 1000).toISOString(),
    holdings: b.holdings.map((h) => ({
      token: h.token,
      symbol: symbolOf(d, h.token),
      value: usd(h.value),
      maxWeightPct: h.maxWeightBps === undefined ? 100 : h.maxWeightBps / 100,
    })),
  };
}

const sym = (d: Deployment) => (a: Address) => symbolOf(d, a);

export async function listBoatsTool(pc: PublicClient, d = deployment) {
  const addrs = await listOfficialBoats(pc, d);
  const boats = await Promise.all(addrs.map((a) => getBoat(pc, a, sym(d))));
  return boats.map((b) => boatView(d, b));
}

export async function getBoatTool(pc: PublicClient, boat: Address, d = deployment) {
  await assertOfficial(pc, boat, d);
  return boatView(d, await getBoat(pc, boat, sym(d)));
}

/** Refuses boats that use another oracle or router: those could move crew money. */
export async function assertOfficial(pc: PublicClient, boat: Address, d = deployment) {
  const official = await listOfficialBoats(pc, d);
  if (!official.some((a) => a.toLowerCase() === boat.toLowerCase())) {
    throw new Error(`${boat} is not an official Boats boat (wrong factory, oracle or router). Refusing to touch it.`);
  }
}

export async function checkTradeTool(pc: PublicClient, a: { boat: Address; from: string; to: string; amountUsd: string | number }, d = deployment) {
  const b = await getBoat(pc, a.boat, sym(d));
  const from = resolveToken(d, a.from);
  const to = resolveToken(d, a.to);
  const r = checkTrade(b.holdings, b.usdc, from, to, parseUsd(a.amountUsd), 10);
  const stateOk = b.state === "Sailing";
  return {
    ok: r.ok && stateOk,
    state: b.state,
    ...(stateOk ? {} : { stateMessage: `Captains can only swap while Sailing (boat is ${b.state}).` }),
    ...(r.ok
      ? { weightAfterPct: r.weightAfterBps / 100, navAfter: usd(r.navAfter) }
      : { rule: r.rule, message: r.message, maxAllowedUsd: r.maxAllowed !== undefined ? usd(r.maxAllowed) : undefined }),
  };
}

export async function worstCaseTool(pc: PublicClient, a: { boat: Address; amountUsd: string | number }, d = deployment) {
  const b = await getBoat(pc, a.boat, sym(d));
  const amount = parseUsd(a.amountUsd);
  const w = worstCaseIfBoarding(b.crewTotal, b.captainStake, amount, b.stopLossBps);
  return {
    boat: b.name,
    deposit: usd(amount),
    stopLossPct: -b.stopLossBps / 100,
    ...JSON.parse(JSON.stringify(w, (_, v) => (typeof v === "bigint" ? usd(v) : v))),
    note: "Target max loss if the stop loss fires. The captain's stake absorbs losses first. Exit slippage is capped at 1%.",
  };
}

export async function positionTool(pc: PublicClient, a: { boat: Address; who: Address }, d = deployment) {
  const b = await getBoat(pc, a.boat, sym(d));
  const p = await getPosition(pc, b, a.who, waterfall);
  return JSON.parse(JSON.stringify(p, (_, v) => (typeof v === "bigint" ? usd(v) : v)));
}

export async function oddsTool(a: { event?: string; match?: string }) {
  return fetchOdds(a.event ?? "FED261211", a.match ?? "Hike 25bps");
}

export type Action = "board" | "withdraw" | "stake_and_sail" | "swap" | "check_voyage" | "return_to_port" | "claim_captain";

/** Builds the unsigned calls for an action. Amounts are dollars (USDC value). */
export async function buildAction(
  pc: PublicClient,
  a: { action: Action; boat: Address; amountUsd?: string | number; from?: string; to?: string; minOutUsd?: string | number },
  d = deployment,
): Promise<Call[]> {
  await assertOfficial(pc, a.boat, d);
  const need = () => {
    if (a.amountUsd === undefined) throw new Error(`${a.action} needs amountUsd`);
    return parseUsd(a.amountUsd);
  };
  switch (a.action) {
    case "board":
      return buildBoardCalls(a.boat, d.tokens.USDC, need());
    case "withdraw":
      return [buildWithdrawCall(a.boat)];
    case "stake_and_sail":
      return buildStakeCalls(a.boat, d.tokens.USDC, need(), true);
    case "swap": {
      if (!a.from || !a.to) throw new Error("swap needs from and to");
      const from = resolveToken(d, a.from);
      const to = resolveToken(d, a.to);
      const amountIn = await valueToAmount(pc, d.oracle, from, d.tokens.USDC, need());
      const minOut = a.minOutUsd === undefined ? 0n : await valueToAmount(pc, d.oracle, to, d.tokens.USDC, parseUsd(a.minOutUsd));
      return [buildSwapCall(a.boat, from, to, amountIn, minOut)];
    }
    case "check_voyage":
      return [buildCheckVoyageCall(a.boat)];
    case "return_to_port":
      return [buildReturnToPortCall(a.boat)];
    case "claim_captain":
      return [buildClaimCaptainCall(a.boat)];
  }
}

export const callsView = (calls: Call[]) => calls.map((c) => ({ to: c.to, data: c.data as Hex, value: String(c.value ?? 0n) }));
export { explorerTx };
