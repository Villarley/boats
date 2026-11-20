/**
 * Seaworthiness score (0-100). Every boat comes from the same factory code, so the score
 * measures strategy risk only. Weights from the plan:
 *   captain's stake 30 · stop-loss tightness 20 · asset risk 20 · max single weight 10 · track record 20
 * Each factor returns its points plus a plain-words reason for the boat page.
 */

export type AssetRisk = "cash" | "low" | "medium" | "high";

export type ScoreInput = {
  crewTotal: bigint;
  captainStake: bigint;
  /** used before anyone boards: the stake the captain committed relative to the target crew */
  targetCrew?: bigint;
  stopLossBps: number;
  /** allowed assets with their max weight and risk class (USDC excluded) */
  assets: { symbol: string; maxWeightBps: number; risk: AssetRisk }[];
  /** past voyages: return in bps for each closed voyage; empty = new captain */
  track: number[];
};

export type Factor = { key: "stake" | "floor" | "assets" | "concentration" | "track"; label: string; points: number; max: number; why: string };

export const RISK_OF: Record<string, AssetRisk> = {
  USDC: "cash",
  USYC: "low",
  EURC: "low",
  cirBTC: "high",
  CIRBTC: "high",
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;

export function score(i: ScoreInput): { total: number; factors: Factor[] } {
  const crew = i.crewTotal > 0n ? i.crewTotal : (i.targetCrew ?? 0n);
  const stakeBps = crew + i.captainStake === 0n ? 0 : Number((i.captainStake * 10_000n) / (crew + i.captainStake));

  // 1. Stake: full at >= 10% of the boat, linear below.
  const stake = Math.round(clamp(stakeBps / 1_000, 0, 1) * 30);

  // 2. Floor: full at -10% or tighter, zero at -30% or wider.
  const floor = Math.round(clamp((3_000 - i.stopLossBps) / 2_000, 0, 1) * 20);

  // 3. Asset risk: weighted by the max share each risky asset may take.
  const riskW: Record<AssetRisk, number> = { cash: 0, low: 0.1, medium: 0.5, high: 1 };
  const exposure = i.assets.reduce((s, a) => s + (a.maxWeightBps / 10_000) * riskW[a.risk], 0);
  const assets = Math.round(clamp(1 - exposure / 0.6, 0, 1) * 20);

  // 4. Concentration: full at <= 40% in any single non-cash asset, zero at 100%.
  const maxRisky = Math.max(0, ...i.assets.filter((a) => a.risk !== "low" && a.risk !== "cash").map((a) => a.maxWeightBps));
  const concentration = Math.round(clamp((10_000 - Math.max(maxRisky, 4_000)) / 6_000, 0, 1) * 10);

  // 5. Track record: new captain = neutral 10/20; then +-, by average voyage return and losses.
  let track = 10;
  let trackWhy = "New captain: neutral until the first voyage ends.";
  if (i.track.length) {
    const avg = i.track.reduce((a, b) => a + b, 0) / i.track.length;
    const losses = i.track.filter((r) => r < 0).length;
    track = Math.round(clamp(10 + avg / 100 - losses * 3, 0, 20));
    trackWhy = `${i.track.length} voyage${i.track.length > 1 ? "s" : ""}, ${avg >= 0 ? "+" : ""}${pct(Math.round(avg))} average${losses ? `, ${losses} with a loss` : ""}.`;
  }

  const riskyNames = i.assets.filter((a) => a.risk === "high" || a.risk === "medium").map((a) => `${a.symbol} up to ${pct(a.maxWeightBps)}`);
  const factors: Factor[] = [
    { key: "stake", label: "Captain's stake", points: stake, max: 30, why: `The captain puts in ${pct(stakeBps)} of the boat and loses it first.${stakeBps < 1_000 ? " Full points at 10%." : ""}` },
    { key: "floor", label: "Floor tightness", points: floor, max: 20, why: `The voyage ends if the boat falls ${pct(i.stopLossBps)}.` },
    { key: "assets", label: "Asset risk", points: assets, max: 20, why: riskyNames.length ? `Riskier assets allowed: ${riskyNames.join(", ")}.` : "Only dollars, Treasuries and euros." },
    { key: "concentration", label: "Max in one asset", points: concentration, max: 10, why: maxRisky ? `At most ${pct(maxRisky)} in one risky asset.` : "No risky asset allowed." },
    { key: "track", label: "Track record", points: track, max: 20, why: trackWhy },
  ];
  return { total: factors.reduce((s, f) => s + f.points, 0), factors };
}
