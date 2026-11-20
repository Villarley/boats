/**
 * Typed reads of the protocol, built only on a public RPC (no indexer needed).
 */
import { parseAbiItem, parseEventLogs, toEventSelector, type Address, type PublicClient } from "viem";
import { boatAbi, factoryAbi } from "./abi.js";
import { STATE, type BoatState } from "./chain.js";
import type { Holding } from "./mandate.js";

export type BoatInfo = {
  address: Address;
  name: string;
  captain: Address;
  state: BoatState;
  endReason: "None" | "StopLoss" | "TakeProfit" | "EndDate";
  usdc: Address;
  assets: Address[];
  maxWeightBps: Record<string, number>;
  stopLossBps: number;
  takeProfitBps: number;
  endTime: number;
  feeBps: number;
  /** only addresses the captain invited can board */
  inviteOnly: boolean;
  crewTotal: bigint;
  captainStake: bigint;
  startValue: bigint;
  nav: bigint;
  finalValue: bigint;
  crewPayout: bigint;
  holdings: Holding[];
  /** NAV change since sailing, bps (0 before sailing) */
  changeBps: number;
  /** distance to floor/goal as fractions of the band, for the voyage gauge (0 = floor, 1 = goal) */
  gauge: number;
};

const END = ["None", "StopLoss", "TakeProfit", "EndDate"] as const;

export async function listBoats(pc: PublicClient, factory: Address): Promise<Address[]> {
  return (await pc.readContract({ address: factory, abi: factoryAbi, functionName: "allBoats" })) as Address[];
}

/**
 * Boats that use the official oracle, router (swap adapter) and USDC of a deployment.
 * The factory is permissionless, so anyone can create a boat pointing at their own router or
 * oracle. Such a boat could move crew money, so apps, agents and keepers should only list these.
 */
export async function listOfficialBoats(
  pc: PublicClient,
  d: { factory: Address; oracle: Address; adapter: Address; tokens: { USDC: Address } },
): Promise<Address[]> {
  const all = await listBoats(pc, d.factory);
  if (all.length === 0) return [];
  const res = await pc.multicall({
    allowFailure: true,
    contracts: all.flatMap((b) => [
      { address: b, abi: boatAbi, functionName: "oracle" } as const,
      { address: b, abi: boatAbi, functionName: "router" } as const,
      { address: b, abi: boatAbi, functionName: "usdc" } as const,
    ]),
  });
  const eq = (r: { status: string; result?: unknown } | undefined, want: Address) =>
    r?.status === "success" && String(r.result).toLowerCase() === want.toLowerCase();
  return all.filter((_, i) => eq(res[i * 3], d.oracle) && eq(res[i * 3 + 1], d.adapter) && eq(res[i * 3 + 2], d.tokens.USDC));
}

export async function getBoat(pc: PublicClient, boat: Address, symbols: (a: Address) => string = (a) => a.slice(0, 6)): Promise<BoatInfo> {
  const c = { address: boat, abi: boatAbi } as const;
  const [name, captain, state, endReason, usdc, assets, sl, tp, endTime, feeBps, crewTotal, captainStake, startValue, nav, finalValue, crewPayout, inviteOnly] =
    await pc.multicall({
      allowFailure: false,
      contracts: [
        { ...c, functionName: "name" },
        { ...c, functionName: "captain" },
        { ...c, functionName: "state" },
        { ...c, functionName: "endReason" },
        { ...c, functionName: "usdc" },
        { ...c, functionName: "assets" },
        { ...c, functionName: "stopLossBps" },
        { ...c, functionName: "takeProfitBps" },
        { ...c, functionName: "endTime" },
        { ...c, functionName: "feeBps" },
        { ...c, functionName: "crewTotal" },
        { ...c, functionName: "captainStake" },
        { ...c, functionName: "startValue" },
        { ...c, functionName: "nav" },
        { ...c, functionName: "finalValue" },
        { ...c, functionName: "crewPayout" },
        { ...c, functionName: "inviteOnly" },
      ],
    });
  const tokens = [usdc as Address, ...(assets as Address[])];
  const per = await pc.multicall({
    allowFailure: false,
    contracts: tokens.flatMap((t) => [
      { ...c, functionName: "valueOf", args: [t] } as const,
      { ...c, functionName: "maxWeightBps", args: [t] } as const,
    ]),
  });
  const maxWeightBps: Record<string, number> = {};
  const holdings: Holding[] = tokens.map((t, i) => {
    const w = Number(per[i * 2 + 1]);
    if (i > 0) maxWeightBps[t.toLowerCase()] = w;
    return { token: t, symbol: symbols(t), value: per[i * 2] as bigint, maxWeightBps: i === 0 ? undefined : w };
  });

  const sv = startValue as bigint;
  // After port the boat is empty (nav 0): measure the voyage by its settled final value.
  const n = Number(state) === 3 ? (finalValue as bigint) : (nav as bigint);
  const changeBps = sv === 0n ? 0 : Number(((n - sv) * 10_000n) / sv);
  const band = Number(sl) + Number(tp);
  const gauge = band === 0 ? 0.5 : Math.max(0, Math.min(1, (changeBps + Number(sl)) / band));

  return {
    address: boat,
    name: name as string,
    captain: captain as Address,
    state: STATE[Number(state)]!,
    endReason: END[Number(endReason)]!,
    usdc: usdc as Address,
    assets: assets as Address[],
    maxWeightBps,
    stopLossBps: Number(sl),
    takeProfitBps: Number(tp),
    endTime: Number(endTime),
    feeBps: Number(feeBps),
    inviteOnly: inviteOnly as boolean,
    crewTotal: crewTotal as bigint,
    captainStake: captainStake as bigint,
    startValue: sv,
    nav: n,
    finalValue: finalValue as bigint,
    crewPayout: crewPayout as bigint,
    holdings,
    changeBps,
    gauge,
  };
}

export type Position = {
  deposit: bigint;
  withdrawn: boolean;
  /** current value of this passenger's seat if the voyage ended now (waterfall on current NAV) */
  valueNow: bigint;
  isCaptain: boolean;
};

export async function getPosition(pc: PublicClient, boat: BoatInfo, who: Address, waterfallFn: (c: bigint, k: bigint, v: bigint, f: number) => { crew: bigint }): Promise<Position> {
  const c = { address: boat.address, abi: boatAbi } as const;
  const [deposit, withdrawn] = await pc.multicall({
    allowFailure: false,
    contracts: [
      { ...c, functionName: "crewDeposit", args: [who] },
      { ...c, functionName: "crewWithdrawn", args: [who] },
    ],
  });
  const d = deposit as bigint;
  let valueNow = d;
  if (boat.crewTotal > 0n && d > 0n) {
    const v = boat.state === "Closed" ? boat.finalValue : boat.state === "Open" ? boat.crewTotal + boat.captainStake : boat.nav;
    const { crew } = boat.state === "Closed" ? { crew: boat.crewPayout } : waterfallFn(boat.crewTotal, boat.captainStake, v, boat.feeBps);
    valueNow = (crew * d) / boat.crewTotal;
  }
  return { deposit: d, withdrawn: withdrawn as boolean, valueNow, isCaptain: boat.captain.toLowerCase() === who.toLowerCase() };
}

/** Boats where `who` is captain: this is what unlocks captain mode in the app. */
export async function boatsCaptainedBy(pc: PublicClient, boats: Address[], who: Address): Promise<Address[]> {
  if (!boats.length) return [];
  const caps = await pc.multicall({ allowFailure: false, contracts: boats.map((b) => ({ address: b, abi: boatAbi, functionName: "captain" }) as const) });
  return boats.filter((_, i) => (caps[i] as Address).toLowerCase() === who.toLowerCase());
}

/** Whether `who` was invited to `boat` (only matters when the boat is invite-only). */
export async function isInvited(pc: PublicClient, boat: Address, who: Address): Promise<boolean> {
  return (await pc.readContract({ address: boat, abi: boatAbi, functionName: "invited", args: [who] })) as boolean;
}

/** Whether `who` may board `boat` right now as far as invites go: public boats are open to all. */
export async function canBoard(pc: PublicClient, boat: Address, who: Address): Promise<boolean> {
  const [inviteOnly, invited] = await pc.multicall({
    allowFailure: false,
    contracts: [
      { address: boat, abi: boatAbi, functionName: "inviteOnly" },
      { address: boat, abi: boatAbi, functionName: "invited", args: [who] },
    ],
  });
  return !(inviteOnly as boolean) || (invited as boolean);
}

export type Activity = {
  kind: "boarded" | "sailed" | "traded" | "ended" | "returned" | "withdrawn" | "staked" | "claimed" | "invited";
  boat: Address;
  txHash: `0x${string}`;
  blockNumber: bigint;
  args: Record<string, unknown>;
};

const EVENTS = {
  boarded: parseAbiItem("event Boarded(address indexed crew, uint256 amount)"),
  staked: parseAbiItem("event CaptainStaked(uint256 amount)"),
  sailed: parseAbiItem("event Sailed(uint256 startValue)"),
  traded: parseAbiItem("event Traded(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 navAfter)"),
  ended: parseAbiItem("event VoyageEnded(uint8 reason, uint256 nav)"),
  returned: parseAbiItem("event ReturnedToPort(uint256 finalValue, uint256 crewPayout, uint256 captainBase, uint256 captainFee)"),
  withdrawn: parseAbiItem("event CrewWithdrawn(address indexed crew, uint256 amount)"),
  claimed: parseAbiItem("event CaptainClaimed(uint256 base, uint256 fee)"),
  invited: parseAbiItem("event Invited(address indexed who)"),
} as const;

/** Arc's public RPC rejects eth_getLogs over 10,000 blocks, so scan in chunks under that. */
export const LOG_CHUNK = 9_000n;

/**
 * Activity from logs, oldest scanned first, returned newest first.
 * One eth_getLogs per chunk (all boat events at once), a few chunks in parallel.
 */
export async function getActivity(pc: PublicClient, boats: Address[], fromBlock: bigint, toBlock?: bigint, opts: { chunk?: bigint; parallel?: number } = {}): Promise<Activity[]> {
  if (!boats.length) return [];
  const to = toBlock ?? (await pc.getBlockNumber());
  if (to < fromBlock) return [];
  const chunk = opts.chunk ?? LOG_CHUNK;
  const ranges: [bigint, bigint][] = [];
  for (let a = fromBlock; a <= to; a += chunk) ranges.push([a, a + chunk - 1n > to ? to : a + chunk - 1n]);
  const kindOf = new Map(Object.entries(EVENTS).map(([k, e]) => [toEventSelector(e), k as Activity["kind"]]));
  const abi = Object.values(EVENTS);
  const out: Activity[] = [];
  const parallel = opts.parallel ?? 4;
  for (let i = 0; i < ranges.length; i += parallel) {
    const batch = await Promise.all(ranges.slice(i, i + parallel).map(([a, b]) => pc.getLogs({ address: boats, fromBlock: a, toBlock: b })));
    for (const l of parseEventLogs({ abi, logs: batch.flat() })) {
      const kind = kindOf.get(l.topics[0]!);
      if (kind) out.push({ kind, boat: l.address, txHash: l.transactionHash!, blockNumber: l.blockNumber!, args: (l.args ?? {}) as Record<string, unknown> });
    }
  }
  return out.sort((a, b) => Number(b.blockNumber - a.blockNumber));
}
