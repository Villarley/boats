import { RISK_OF, score, worstCaseIfBoarding, type AssetRisk } from "@boats/sdk";
import type { BoatView } from "./store";
import { deployment, symbolOf } from "./deployment";
import { assetName } from "./format";

export function boatScore(b: BoatView) {
  return score({
    crewTotal: b.crewTotal,
    captainStake: b.captainStake,
    targetCrew: 9_000_000_000n,
    stopLossBps: b.stopLossBps,
    assets: b.assets.map((a) => ({ symbol: assetName(a), maxWeightBps: b.maxWeightBps[a.toLowerCase()] ?? 0, risk: (RISK_OF[symbolOf(a)] ?? "medium") as AssetRisk })),
    track: [],
  });
}

/** Worst case for someone boarding `amount` now (defaults to $100 for cards). */
export function worstCase(b: BoatView, amount = 100_000_000n) {
  return worstCaseIfBoarding(b.crewTotal, b.captainStake, amount, b.stopLossBps);
}

export const isAiCaptain = (b: BoatView) => !!deployment.demo.aiCaptain && b.captain.toLowerCase() === deployment.demo.aiCaptain.toLowerCase();
