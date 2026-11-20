/**
 * Tool logic for the Boats MCP server, kept apart from the MCP wiring so it can be tested.
 *
 * Conventions for agents:
 * - Money is a number in US dollars, in fields ending in `Usd` (e.g. navUsd: 10.99).
 * - Percentages are positive numbers in fields ending in `Pct`; `stopLossPct: 10` means the voyage ends at -10%.
 * - Every write is checked before any call is returned: the boat must be official, in the right state,
 *   and a swap must pass the mandate. Unsigned calls come with chainId and a plain-words summary.
 */
import { formatUnits, getAddress, parseUnits, TransactionNotFoundError, TransactionReceiptNotFoundError, type Address, type Hex, type PublicClient } from "viem";
import type { Holding } from "@boats/sdk";
import {
  arcTestnetDeployment,
  boatAbi,
  buildBoardCalls,
  buildCheckVoyageCall,
  buildClaimCaptainCall,
  buildCreateBoatCall,
  buildReturnToPortCall,
  buildSailCall,
  buildStakeCalls,
  buildSwapCall,
  buildWithdrawCall,
  checkTrade,
  erc20Abi,
  explorerTx,
  fetchOdds,
  GEMINI_BASE,
  getActivity,
  getBoat,
  getPosition,
  listOfficialBoats,
  probabilityFromPrices,
  RISK_OF,
  score,
  symbolOf,
  valueToAmount,
  waterfall,
  worstCaseIfBoarding,
  type AssetRisk,
  type BoatInfo,
  type Call,
  type Deployment,
} from "@boats/sdk";

export const deployment: Deployment = arcTestnetDeployment;
/** First block of the current deployment, so activity scans start there. */
export const START_BLOCK = 73_208_024n;
/** Duplicate demo boat from the deploy run, hidden in the app too. */
export const HIDDEN = new Set(["0xf27641544ea56cd61c04499626ec948828ee36fd"]);
/** Router spread of the testnet SwapAdapter, used by the pre-check. */
export const SPREAD_BPS = 10;

export class ToolError extends Error {}

/**
 * Largest value (to the cent) that passes the mandate for this pair: the same check as Boat.swap(),
 * searched over the source balance. Returns 0 when nothing fits.
 */
export function exactMaxAllowed(holdings: Holding[], usdc: Address, from: Address, to: Address, spreadBps = SPREAD_BPS): bigint {
  const src = holdings.find((h) => h.token.toLowerCase() === from.toLowerCase());
  if (!src) return 0n;
  const CENT = 10_000n;
  let lo = 0n;
  let hi = src.value / CENT;
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    if (checkTrade(holdings, usdc, from, to, mid * CENT, spreadBps).ok) lo = mid;
    else hi = mid - 1n;
  }
  return lo * CENT;
}

/** "$12.50" or "12.5" or 12.5 -> 12_500_000n (USDC base units, 6 decimals). */
export function parseUsd(v: string | number): bigint {
  const s = String(v).replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(s)) throw new ToolError(`Not a dollar amount: ${v}. Use a positive number like 5 or 12.50.`);
  const amount = parseUnits(s, 6);
  if (amount === 0n) throw new ToolError("Amount must be greater than zero.");
  return amount;
}

/** USDC base units -> dollars as a number with cents. */
export const usd = (v: bigint) => Math.round(Number(formatUnits(v, 6)) * 100) / 100;

/** Accepts a symbol (USDC, USYC, EURC, cirBTC), a plain-words name (dollars, treasuries, euros, bitcoin) or an address. */
export function resolveToken(d: Deployment, t: string): Address {
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return getAddress(t);
  const aliases: Record<string, keyof Deployment["tokens"]> = {
    usdc: "USDC", dollars: "USDC", dollar: "USDC", cash: "USDC", usd: "USDC",
    usyc: "USYC", treasuries: "USYC", "us treasuries": "USYC", treasury: "USYC",
    eurc: "EURC", euros: "EURC", euro: "EURC",
    cirbtc: "cirBTC", btc: "cirBTC", bitcoin: "cirBTC",
  };
  const key = aliases[t.trim().toLowerCase()];
  if (!key) throw new ToolError(`Unknown token "${t}". Use USDC, USYC, EURC, cirBTC (or dollars, treasuries, euros, bitcoin) or an address.`);
  return getAddress(d.tokens[key]);
}

const ASSET_WORDS: Record<string, string> = { USDC: "dollars", USYC: "US Treasuries (testnet mock)", EURC: "euros (testnet mock)", cirBTC: "Bitcoin (testnet mock)" };
const sym = (d: Deployment) => (a: Address) => symbolOf(d, a);

/** What each role can do in each state, so an agent doesn't build calls that will revert. */
export function allowedActions(b: BoatInfo) {
  return {
    crew: { Open: ["board"], Sailing: [], Returning: [], Closed: ["withdraw"] }[b.state],
    captain: { Open: ["stake", ...(b.crewTotal > 0n ? ["stake_and_sail", ...(b.captainStake > 0n ? ["sail"] : [])] : [])], Sailing: ["swap"], Returning: [], Closed: ["claim_captain"] }[b.state],
    anyone: { Open: [], Sailing: ["check_voyage"], Returning: ["return_to_port"], Closed: [] }[b.state],
  };
}

export function allowedWords(b: BoatInfo): string {
  const a = allowedActions(b);
  const parts = [
    a.crew.length ? `crew can ${a.crew.join(", ")}` : "crew can't act",
    a.captain.length ? `captain can ${a.captain.join(", ")}` : "captain can't act",
    a.anyone.length ? `anyone can ${a.anyone.join(", ")}` : "",
  ].filter(Boolean);
  return `Right now ${parts.join("; ")}.`;
}

/** JSON view of a boat for an agent. */
export function boatView(d: Deployment, b: BoatInfo) {
  const nav = b.state === "Closed" ? b.finalValue : b.nav;
  return {
    address: getAddress(b.address),
    name: b.name,
    captain: getAddress(b.captain),
    state: b.state,
    stateMeaning: {
      Open: "Boarding. Crew can board, the captain stakes and sails.",
      Sailing: "Voyage running. Only the captain can swap, inside the mandate. Anyone can call check_voyage.",
      Returning: "A limit or the end date was hit. Anyone can call return_to_port to sell back to dollars.",
      Closed: "Back in port. Crew withdraws, captain claims stake and vested fee.",
    }[b.state],
    endReason: b.endReason,
    allowedActions: allowedActions(b),
    valueUsd: usd(nav),
    crewDepositsUsd: usd(b.crewTotal),
    captainStakeUsd: usd(b.captainStake),
    changeSinceSailingPct: b.changeBps / 100,
    stopLossPct: b.stopLossBps / 100,
    takeProfitPct: b.takeProfitBps / 100,
    captainFeePctOfCrewProfit: b.feeBps / 100,
    endsAt: new Date(b.endTime * 1000).toISOString(),
    holdings: b.holdings.map((h) => {
      const s = symbolOf(d, h.token);
      return {
        token: getAddress(h.token),
        symbol: s,
        asset: ASSET_WORDS[s] ?? s,
        valueUsd: usd(h.value),
        weightPct: b.nav === 0n ? 0 : Math.round(Number((h.value * 10_000n) / b.nav)) / 100,
        maxWeightPct: h.maxWeightBps === undefined ? 100 : h.maxWeightBps / 100,
      };
    }),
    explorer: `https://testnet.arcscan.app/address/${getAddress(b.address)}`,
  };
}

async function officialBoats(pc: PublicClient, d = deployment) {
  return (await listOfficialBoats(pc, d)).filter((a) => !HIDDEN.has(a.toLowerCase()));
}

/** Refuses boats that use another oracle or router (they could move crew money) and non-boat addresses. */
export async function loadOfficialBoat(pc: PublicClient, boat: string, d = deployment): Promise<BoatInfo> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(boat)) throw new ToolError(`Not an address: ${boat}`);
  const official = await listOfficialBoats(pc, d);
  if (!official.some((a) => a.toLowerCase() === boat.toLowerCase())) {
    throw new ToolError(`${boat} is not an official Boats boat (not from our factory, or it uses another oracle or router). Use boats_list to get valid addresses.`);
  }
  return getBoat(pc, getAddress(boat), sym(d));
}

export async function listBoatsTool(pc: PublicClient, d = deployment) {
  const addrs = await officialBoats(pc, d);
  const boats = await Promise.all(addrs.map((a) => getBoat(pc, a, sym(d))));
  return { count: boats.length, boats: boats.map((b) => boatView(d, b)) };
}

export async function getBoatTool(pc: PublicClient, boat: string, d = deployment) {
  return boatView(d, await loadOfficialBoat(pc, boat, d));
}

export async function checkTradeTool(pc: PublicClient, a: { boat: string; from: string; to: string; amountUsd: string | number; who?: string }, d = deployment) {
  const b = await loadOfficialBoat(pc, a.boat, d);
  const from = resolveToken(d, a.from);
  const to = resolveToken(d, a.to);
  const amount = parseUsd(a.amountUsd);
  const problems: string[] = [];
  if (b.state !== "Sailing") problems.push(`Captains can only swap while the boat is Sailing; it is ${b.state}.`);
  if (a.who && a.who.toLowerCase() !== b.captain.toLowerCase()) problems.push(`${a.who} is not this boat's captain (${b.captain}). Only the captain can swap.`);
  const r = checkTrade(b.holdings, b.usdc, from, to, amount, SPREAD_BPS);
  if (!r.ok) problems.push(r.message);
  return {
    ok: problems.length === 0,
    boat: b.name,
    trade: `Move $${usd(amount)} of value from ${symbolOf(d, from)} to ${symbolOf(d, to)}`,
    ...(problems.length ? { problems } : {}),
    ...(r.ok
      ? { weightAfterPct: r.weightAfterBps / 100, boatValueAfterUsd: usd(r.navAfter) }
      : {
          brokenRule: r.rule,
          ...(r.weightAfterBps !== undefined ? { weightAfterPct: r.weightAfterBps / 100 } : {}),
          ...(r.rule === "max-weight" || r.rule === "insufficient-balance" ? { maxAllowedUsd: usd(exactMaxAllowed(b.holdings, b.usdc, from, to)), maxAllowedNote: "Largest amount, to the cent, that passes both the balance and the max weight right now." } : {}),
        }),
    enforcedBy: "Boat.swap() on chain. This is a dry run of the same rule.",
  };
}

export async function worstCaseTool(pc: PublicClient, a: { boat: string; amountUsd: string | number }, d = deployment) {
  const b = await loadOfficialBoat(pc, a.boat, d);
  const amount = parseUsd(a.amountUsd);
  const w = worstCaseIfBoarding(b.crewTotal, b.captainStake, amount, b.stopLossBps);
  const canBoard = b.state === "Open";
  return {
    boat: b.name,
    canBoard,
    ...(canBoard ? {} : { whyNot: `Boarding is only possible while the boat is Open; it is ${b.state}.` }),
    depositUsd: usd(amount),
    stopLossPct: b.stopLossBps / 100,
    captainStakeUsd: usd(b.captainStake),
    crewDepositsAfterYouUsd: usd(b.crewTotal + amount),
    worstCaseLossUsd: usd(w.dollars),
    worstCaseLossPct: w.bps / 100,
    plusExitSlippageUpToPct: 1,
    explanation: `If the boat falls ${b.stopLossBps / 100}% and the stop loss fires, the captain's $${usd(b.captainStake)} stake absorbs losses first, so your target loss is $${usd(w.dollars)} (${w.bps / 100}%). Selling back to dollars may cost up to 1% more. Not a guarantee: a target max loss.`,
  };
}

export async function positionTool(pc: PublicClient, a: { boat: string; who: string }, d = deployment) {
  const b = await loadOfficialBoat(pc, a.boat, d);
  const p = await getPosition(pc, b, getAddress(a.who), waterfall);
  return {
    boat: b.name,
    state: b.state,
    who: getAddress(a.who),
    isCaptain: p.isCaptain,
    crewDepositUsd: usd(p.deposit),
    crewValueNowUsd: usd(p.valueNow),
    withdrawn: p.withdrawn,
    canWithdraw: b.state === "Closed" && p.deposit > 0n && !p.withdrawn,
    ...(p.isCaptain ? await captainView(pc, b) : {}),
  };
}

async function captainView(pc: PublicClient, b: BoatInfo) {
  if (b.state !== "Closed") return { captainStakeUsd: usd(b.captainStake) };
  const c = { address: b.address, abi: boatAbi } as const;
  const [base, baseClaimed, vested, feeClaimed] = (await pc.multicall({
    allowFailure: false,
    contracts: [
      { ...c, functionName: "captainBase" },
      { ...c, functionName: "captainBaseClaimed" },
      { ...c, functionName: "vestedFee" },
      { ...c, functionName: "captainFeeClaimed" },
    ],
  })) as [bigint, boolean, bigint, bigint];
  const claimable = (baseClaimed ? 0n : base) + (vested - feeClaimed);
  return { captainStakeUsd: usd(b.captainStake), captainClaimableUsd: usd(claimable), canClaimAsCaptain: claimable > 0n };
}

export async function myPositionsTool(pc: PublicClient, a: { who: string }, d = deployment) {
  const who = getAddress(a.who);
  const addrs = await officialBoats(pc, d);
  const out = [];
  for (const addr of addrs) {
    const b = await getBoat(pc, addr, sym(d));
    const p = await getPosition(pc, b, who, waterfall);
    if (p.deposit === 0n && !p.isCaptain) continue;
    out.push({
      boat: b.name,
      address: getAddress(addr),
      state: b.state,
      role: p.isCaptain ? (p.deposit > 0n ? "captain and crew" : "captain") : "crew",
      crewDepositUsd: usd(p.deposit),
      crewValueNowUsd: usd(p.valueNow),
      ...(p.isCaptain ? await captainView(pc, b) : {}),
      canWithdraw: b.state === "Closed" && p.deposit > 0n && !p.withdrawn,
    });
  }
  const bal = await pc.readContract({ address: d.tokens.USDC, abi: erc20Abi, functionName: "balanceOf", args: [who] });
  return { who, walletUsdc: usd(bal as bigint), positions: out };
}

export async function scoreTool(pc: PublicClient, a: { boat: string }, d = deployment) {
  const b = await loadOfficialBoat(pc, a.boat, d);
  const s = score({
    crewTotal: b.crewTotal,
    captainStake: b.captainStake,
    targetCrew: 9_000_000_000n,
    stopLossBps: b.stopLossBps,
    assets: b.assets.map((t) => ({ symbol: symbolOf(d, t), maxWeightBps: b.maxWeightBps[t.toLowerCase()] ?? 0, risk: (RISK_OF[symbolOf(d, t)] ?? "medium") as AssetRisk })),
    track: [],
  });
  return {
    boat: b.name,
    seaworthiness: s.total,
    outOf: 100,
    verdict: s.total >= 80 ? "Calm waters" : s.total >= 60 ? "Choppy" : "Rough seas",
    factors: s.factors.map((f) => ({ factor: f.label, points: f.points, max: f.max, why: f.why })),
    note: "Code risk is the same for every boat (one factory, no custom code), so this scores strategy risk only.",
  };
}

const KIND_WORDS: Record<string, string> = {
  boarded: "crew boarded", staked: "captain staked", sailed: "voyage started", traded: "captain swapped",
  ended: "voyage ended", returned: "returned to port", withdrawn: "crew withdrew", claimed: "captain claimed",
};

const END_WORDS = ["none", "stop loss", "take profit", "end date"];

function activityDetails(d: Deployment, kind: string, args: Record<string, unknown>, decimals: Record<string, number>) {
  if (kind === "traded") {
    const tin = symbolOf(d, args.tokenIn as Address);
    const tout = symbolOf(d, args.tokenOut as Address);
    const amt = (sym: string, v: unknown) => (sym === "USDC" ? usd(v as bigint) : Number(formatUnits(v as bigint, decimals[sym] ?? 18)));
    return { sold: tin, soldAmount: amt(tin, args.amountIn), bought: tout, boughtAmount: amt(tout, args.amountOut), boatValueAfterUsd: usd(args.navAfter as bigint) };
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (k === "reason") out.reason = END_WORDS[Number(v)] ?? Number(v);
    else if (typeof v === "bigint") out[`${k}Usd`] = usd(v);
    else out[k] = v;
  }
  return out;
}

export async function activityTool(pc: PublicClient, a: { boat?: string; limit?: number }, d = deployment) {
  const boats = a.boat ? [getAddress((await loadOfficialBoat(pc, a.boat, d)).address)] : await officialBoats(pc, d);
  const syms = Object.keys(d.tokens) as (keyof Deployment["tokens"])[];
  const decs = (await pc.multicall({ allowFailure: false, contracts: syms.map((k) => ({ address: d.tokens[k], abi: erc20Abi, functionName: "decimals" }) as const) })) as number[];
  const decimals = Object.fromEntries(syms.map((k, i) => [k, Number(decs[i])]));
  const acts = await getActivity(pc, boats, START_BLOCK);
  return {
    events: acts.slice(0, a.limit ?? 20).map((x) => ({
      what: KIND_WORDS[x.kind] ?? x.kind,
      kind: x.kind,
      boat: getAddress(x.boat),
      block: Number(x.blockNumber),
      tx: explorerTx(x.txHash),
      details: activityDetails(d, x.kind, x.args, decimals),
    })),
    note: "Dollar amounts end in Usd. Swap amounts are in units of the named token (soldAmount of USDC is dollars).",
  };
}

export async function oddsTool(a: { event?: string; match?: string }) {
  return fetchOdds(a.event ?? "FED261211", a.match ?? "Hike 25bps");
}

export async function oddsContractsTool(a: { event?: string }, fetchImpl: typeof fetch = fetch) {
  const ev = a.event ?? "FED261211";
  const res = await fetchImpl(`${GEMINI_BASE}/v1/prediction-markets/events/${encodeURIComponent(ev)}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new ToolError(`Gemini returned ${res.status} for ${ev}`);
  const body = (await res.json()) as { ticker?: string; title?: string; contracts?: { label?: string; ticker?: string; prices?: Parameters<typeof probabilityFromPrices>[0] }[] };
  return {
    event: body.ticker ?? ev,
    title: body.title ?? "",
    contracts: (body.contracts ?? []).map((c) => ({ label: c.label ?? c.ticker, probability: (() => { const x = probabilityFromPrices(c.prices)?.probability; return x === undefined ? null : Math.round(x * 1000) / 1000; })() })),
    note: "Probability is the YES price (mid of best bid and ask when both exist). Pass a label to boats_odds as `match`.",
  };
}

export async function txStatusTool(pc: PublicClient, a: { hash: string }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(a.hash)) throw new ToolError(`Not a transaction hash: ${a.hash}`);
  try {
    const r = await pc.getTransactionReceipt({ hash: a.hash as Hex });
    return { hash: a.hash, status: r.status, block: Number(r.blockNumber), explorer: explorerTx(a.hash) };
  } catch (e) {
    if (!(e instanceof TransactionReceiptNotFoundError)) throw e;
    const tx = await pc.getTransaction({ hash: a.hash as Hex }).catch((error: unknown) => {
      if (error instanceof TransactionNotFoundError) return null;
      throw error;
    });
    return { hash: a.hash, status: tx ? "pending" : "not found", explorer: explorerTx(a.hash) };
  }
}

export type Action = "board" | "withdraw" | "stake" | "sail" | "stake_and_sail" | "swap" | "check_voyage" | "return_to_port" | "claim_captain";

const NEED_STATE: Record<Action, BoatInfo["state"]> = {
  board: "Open", stake: "Open", sail: "Open", stake_and_sail: "Open", swap: "Sailing", check_voyage: "Sailing",
  return_to_port: "Returning", withdraw: "Closed", claim_captain: "Closed",
};
const CAPTAIN_ONLY = new Set<Action>(["stake", "sail", "stake_and_sail", "swap", "claim_captain"]);

export type Planned = { ok: true; boat: string; summary: string; calls: Call[]; warnings?: string[] } | { ok: false; boat: string; problems: string[] };

/** Checks an action against the boat's state, the caller's role and the mandate, then builds its calls. */
export async function planAction(
  pc: PublicClient,
  a: { action: Action; boat: string; amountUsd?: string | number; from?: string; to?: string; slippagePct?: number; caller?: string; reason?: string },
  d = deployment,
): Promise<Planned> {
  const b = await loadOfficialBoat(pc, a.boat, d);
  const boat = getAddress(b.address);
  const problems: string[] = [];
  const warnings: string[] = [];
  if (b.state !== NEED_STATE[a.action]) problems.push(`${a.action} needs the boat to be ${NEED_STATE[a.action]}; it is ${b.state}. ${allowedWords(b)}`);
  if (!a.caller) warnings.push("No caller given and no signer configured, so the role, balance and deposit checks were skipped. Pass `caller` to check them.");
  if (a.caller && a.action === "withdraw") {
    const dep = (await pc.readContract({ address: boat, abi: boatAbi, functionName: "crewDeposit", args: [getAddress(a.caller)] })) as bigint;
    const done = (await pc.readContract({ address: boat, abi: boatAbi, functionName: "crewWithdrawn", args: [getAddress(a.caller)] })) as boolean;
    if (dep === 0n) problems.push(`${a.caller} never boarded ${b.name}; there is nothing to withdraw.`);
    else if (done) problems.push(`${a.caller} already withdrew from ${b.name}.`);
  }
  if (a.caller && CAPTAIN_ONLY.has(a.action) && a.caller.toLowerCase() !== b.captain.toLowerCase()) problems.push(`Only the captain (${b.captain}) can ${a.action}.`);
  if ((a.action === "sail" || a.action === "stake_and_sail") && b.crewTotal === 0n) problems.push("No crew has boarded. Use stake to post first-loss capital, wait for crew to board, then sail.");
  if (a.action === "sail" && b.captainStake === 0n) problems.push("The captain must stake first-loss capital before sailing. Use stake first.");
  const amount = () => {
    if (a.amountUsd === undefined) throw new ToolError(`${a.action} needs amountUsd (dollars).`);
    return parseUsd(a.amountUsd);
  };
  if ((a.action === "board" || a.action === "stake" || a.action === "stake_and_sail") && a.caller) {
    const bal = (await pc.readContract({ address: d.tokens.USDC, abi: erc20Abi, functionName: "balanceOf", args: [getAddress(a.caller)] })) as bigint;
    if (bal < amount()) problems.push(`The wallet holds $${usd(bal)} USDC, less than $${usd(amount())}. Get test USDC at https://faucet.circle.com (Arc testnet).`);
  }
  let calls: Call[] = [];
  let summary = "";
  switch (a.action) {
    case "board":
      calls = buildBoardCalls(boat, d.tokens.USDC, amount());
      summary = `Approve exactly $${usd(amount())} USDC, then board ${b.name}.`;
      break;
    case "stake_and_sail":
      calls = buildStakeCalls(boat, d.tokens.USDC, amount(), true);
      summary = `Approve and stake $${usd(amount())} as first-loss capital, then sail ${b.name}.`;
      break;
    case "stake":
      calls = buildStakeCalls(boat, d.tokens.USDC, amount());
      summary = `Approve and stake $${usd(amount())} as first-loss capital on ${b.name}. Boarding stays open; sail after crew joins.`;
      break;
    case "sail":
      calls = [buildSailCall(boat)];
      summary = `Close boarding and sail ${b.name} with its existing captain stake and crew deposits.`;
      break;
    case "swap": {
      if (!a.from || !a.to) throw new ToolError("swap needs from and to (e.g. from: USDC, to: treasuries).");
      const from = resolveToken(d, a.from);
      const to = resolveToken(d, a.to);
      const value = amount();
      const r = checkTrade(b.holdings, b.usdc, from, to, value, SPREAD_BPS);
      if (!r.ok) problems.push(r.message + (r.rule === "max-weight" || r.rule === "insufficient-balance" ? ` Max allowed now: $${usd(exactMaxAllowed(b.holdings, b.usdc, from, to))}.` : ""));
      if (problems.length) break;
      const slip = Math.max(0, Math.min(5, a.slippagePct ?? 1));
      const amountIn = await valueToAmount(pc, d.oracle, from, d.tokens.USDC, value);
      const minValue = (value * BigInt(Math.round((100 - slip) * 100))) / 10_000n;
      const minOut = await valueToAmount(pc, d.oracle, to, d.tokens.USDC, minValue);
      calls = [buildSwapCall(boat, from, to, amountIn, minOut, a.reason ? { why: a.reason.slice(0, 500), signal: { source: "agent" } } : undefined)];
      summary = `Swap $${usd(value)} of ${symbolOf(d, from)} into ${symbolOf(d, to)} on ${b.name}, reverting if it returns less than $${usd(minValue)} of value (${slip}% slippage cap).${a.reason ? " Your reason is recorded in the transaction (decodeSwapMemo)." : ""}`;
      break;
    }
    case "withdraw":
      calls = [buildWithdrawCall(boat)];
      summary = `Withdraw your share of ${b.name} after port.`;
      break;
    case "claim_captain":
      calls = [buildClaimCaptainCall(boat)];
      summary = `Claim the captain's remaining stake and vested fee on ${b.name}.`;
      break;
    case "check_voyage":
      calls = [buildCheckVoyageCall(boat)];
      summary = `Check ${b.name}'s stop loss, take profit and end date; ends the voyage if one is crossed (no-op otherwise).`;
      break;
    case "return_to_port":
      calls = [buildReturnToPortCall(boat)];
      summary = `Sell ${b.name}'s holdings back to dollars and settle the first-loss waterfall.`;
      break;
  }
  return problems.length ? { ok: false, boat: b.name, problems } : { ok: true, boat: b.name, summary, calls, ...(warnings.length ? { warnings } : {}) };
}

export type NewBoat = {
  name: string;
  captain: string;
  assets: { token: string; maxWeightPct: number }[];
  stopLossPct: number;
  takeProfitPct: number;
  captainFeePct: number;
  days: number;
};

/** Validates a new boat with the same rules as the Boat constructor and builds the createBoat call. */
export function planCreateBoat(n: NewBoat, d = deployment, now = Date.now()): Planned {
  const problems: string[] = [];
  if (!n.name.trim()) problems.push("Give the boat a name.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(n.captain)) problems.push("captain must be an address.");
  if (!(n.stopLossPct > 0 && n.stopLossPct < 100)) problems.push("stopLossPct must be above 0 and below 100 (e.g. 10 means the voyage ends at -10%).");
  if (!(n.takeProfitPct > 0)) problems.push("takeProfitPct must be above 0.");
  if (!(n.captainFeePct >= 0 && n.captainFeePct <= 50)) problems.push("captainFeePct must be 0 to 50 (share of the crew's profit).");
  if (!(n.days > 0)) problems.push("days must be above 0.");
  const seen = new Set<string>();
  const assets: Address[] = [];
  const weights: number[] = [];
  for (const x of n.assets) {
    let t: Address;
    try {
      t = resolveToken(d, x.token);
    } catch (e) {
      problems.push((e as Error).message);
      continue;
    }
    if (t.toLowerCase() === d.tokens.USDC.toLowerCase()) problems.push("Don't list USDC: it's always allowed.");
    if (seen.has(t.toLowerCase())) problems.push(`${x.token} is listed twice.`);
    if (!(x.maxWeightPct > 0 && x.maxWeightPct <= 100)) problems.push(`maxWeightPct for ${x.token} must be 1 to 100.`);
    seen.add(t.toLowerCase());
    assets.push(t);
    weights.push(Math.round(x.maxWeightPct * 100));
  }
  if (n.assets.length === 0) problems.push("List at least one asset besides dollars, or the captain has nothing to trade.");
  if (problems.length) return { ok: false, boat: n.name, problems };
  const call = buildCreateBoatCall(d.factory, {
    name: n.name.trim(),
    captain: getAddress(n.captain),
    usdc: d.tokens.USDC,
    oracle: d.oracle,
    router: d.adapter,
    assets,
    maxWeightBps: weights,
    stopLossBps: Math.round(n.stopLossPct * 100),
    takeProfitBps: Math.round(n.takeProfitPct * 100),
    endTime: BigInt(Math.floor(now / 1000) + Math.round(n.days * 86_400)),
    feeBps: Math.round(n.captainFeePct * 100),
    vestingDuration: 0n,
  });
  return {
    ok: true,
    boat: n.name,
    summary: `Create "${n.name}" on the official factory, oracle and router: ends at -${n.stopLossPct}% / +${n.takeProfitPct}% or in ${n.days} days, captain fee ${n.captainFeePct}% of crew profit. Then stake, wait for crew to board, and sail.`,
    calls: [call],
  };
}

export const callsView = (calls: Call[], d = deployment) =>
  calls.map((c, i) => ({ step: i + 1, chainId: d.chainId, to: getAddress(c.to), data: c.data as Hex, value: "0" }));
export { explorerTx };
