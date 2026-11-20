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

export function scoreWord(total: number) {
  return total >= 80 ? "Calm waters" : total >= 60 ? "Choppy" : "Rough seas";
}

/** Worst case for someone boarding `amount` now (defaults to $100 for cards). */
export function worstCase(b: BoatView, amount = 100_000_000n) {
  return worstCaseIfBoarding(b.crewTotal, b.captainStake, amount, b.stopLossBps);
}

export const isAiCaptain = (b: BoatView) => !!deployment.demo.aiCaptain && b.captain.toLowerCase() === deployment.demo.aiCaptain.toLowerCase();

export function captainName(b: BoatView) {
  if (isAiCaptain(b)) return "AI captain";
  if (deployment.demo.ana && b.captain.toLowerCase() === deployment.demo.ana.toLowerCase()) return "Captain Ana";
  return `Captain ${b.captain.slice(2, 6)}`;
}

export const FLAG_OF: Record<string, string> = { "Safe Harbor": "S", Westerly: "W", "Open Sea": "O" };

export function statusLabel(b: BoatView) {
  return b.state === "Open" ? "Boarding" : b.state === "Sailing" ? "Sailing" : b.state === "Returning" ? "Returning to port" : "Back in port";
}
export const statusFlag = (b: BoatView) => (b.state === "Open" ? "P" : b.state === "Closed" ? "Q" : b.state === "Returning" ? "U" : "C");
