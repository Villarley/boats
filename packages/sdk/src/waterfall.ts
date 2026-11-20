/**
 * First-loss waterfall, bit-for-bit the same as Boat.waterfall() on chain.
 * c = crew principal, k = captain stake, v = final value, all USDC base units.
 */
export type Split = { crew: bigint; captainBase: bigint; fee: bigint };

export function waterfall(c: bigint, k: bigint, v: bigint, feeBps: number): Split {
  if (v < c + k) {
    const crew = v < c ? v : c;
    return { crew, captainBase: v - crew, fee: 0n };
  }
  const profit = v - c - k;
  const crewProfit = (profit * c) / (c + k);
  const fee = (crewProfit * BigInt(feeBps)) / 10_000n;
  const crew = c + crewProfit - fee;
  return { crew, captainBase: v - crew - fee, fee };
}

/** Crew loss in bps if the stop loss is hit exactly (Boat.worstCaseCrewLossBps()). */
export function worstCaseCrewLossBps(c: bigint, k: bigint, stopLossBps: number, feeBps = 0): number {
  if (c === 0n) return 0;
  const v = ((c + k) * BigInt(10_000 - stopLossBps)) / 10_000n;
  const { crew } = waterfall(c, k, v, feeBps);
  return Number(((c - crew) * 10_000n) / c);
}

/**
 * Worst case for a NEW passenger who would board `amount` now, given the boat's current crew and stake.
 * Boarding grows the crew, which dilutes the captain's first-loss cushion, so this is what the review screen shows.
 */
export function worstCaseIfBoarding(crewTotal: bigint, captainStake: bigint, amount: bigint, stopLossBps: number) {
  const c = crewTotal + amount;
  const bps = worstCaseCrewLossBps(c, captainStake, stopLossBps);
  return { bps, dollars: (amount * BigInt(bps)) / 10_000n };
}

/** "Back in port" headline numbers: how much the boat moved vs how much this passenger moved. */
export function portSummary(startValue: bigint, finalValue: bigint, deposit: bigint, payout: bigint) {
  const boatBps = startValue === 0n ? 0 : Number(((finalValue - startValue) * 10_000n) / startValue);
  const youBps = deposit === 0n ? 0 : Number(((payout - deposit) * 10_000n) / deposit);
  return { boatBps, youBps, youDelta: payout - deposit };
}
