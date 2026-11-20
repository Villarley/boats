// How a fund is shown in the UI: its manager as a person, its risk word, its status.
// Contracts keep their names (Boat, captain); only what the investor reads changes.
import type { Address } from "viem";
import { worstCaseCrewLossBps } from "@boats/sdk";
import type { BoatView } from "./store";
import { boatScore, isAiCaptain } from "./boat";
import { deployment } from "./deployment";
import { terms } from "./copy";

export type ManagerKind = "person" | "ai";
export type Manager = { name: string; first: string; initials: string; kind: ManagerKind; verified: boolean };

// Demo data (README "Demo data"): who manages each example fund.
const DEMO_MANAGERS: Record<string, Omit<Manager, "first" | "initials">> = {
  "Safe Harbor": { name: "Laura Méndez", kind: "person", verified: true },
  Westerly: { name: "AI manager", kind: "ai", verified: true },
  "Open Sea": { name: "Diego Ruiz", kind: "person", verified: false },
};

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

function person(name: string, kind: ManagerKind, verified: boolean): Manager {
  return { name, first: kind === "ai" ? name : name.split(" ")[0]!, initials: initialsOf(name), kind, verified };
}

export function managerOf(b: Pick<BoatView, "name" | "captain" | "address"> & Partial<BoatView>): Manager {
  const demo = DEMO_MANAGERS[b.name];
  if (demo) return person(demo.name, demo.kind, demo.verified);
  if (b.captain && isAiCaptain(b as BoatView)) return person("AI manager", "ai", true);
  return { name: `Manager ${b.captain.slice(2, 6).toUpperCase()}`, first: "The manager", initials: b.captain.slice(2, 4).toUpperCase(), kind: "person", verified: false };
}

/** The signed-in person's display name. Demo personas only: there are no profiles on-chain. */
export function displayName(address?: Address) {
  if (address && deployment.demo.ana && address.toLowerCase() === deployment.demo.ana.toLowerCase()) return "Laura";
  return "María";
}

export type Risk = keyof typeof terms.risk;
export function riskOf(b: BoatView): Risk {
  const s = boatScore(b).total;
  return s >= 80 ? "low" : s >= 60 ? "medium" : "high";
}

export type Status = keyof typeof terms.status;
export function statusOf(b: Pick<BoatView, "state">): Status {
  return b.state === "Open" ? "open" : b.state === "Sailing" ? "active" : b.state === "Returning" ? "closing" : "closed";
}

/** Short status word for tables and dots ("Open", not "Open to join"). */
export const statusWord = (s: Status) => (s === "open" ? "Open" : terms.status[s]);

export const fundHref = (b: Pick<BoatView, "address" | "state">) => (b.state === "Closed" ? `/boat/${b.address}/port` : `/boat/${b.address}`);

/** What an investor already in the fund loses at the loss limit, in bps of what they put in. */
export function worstCaseBps(b: BoatView) {
  return worstCaseCrewLossBps(b.crewTotal, b.captainStake, b.stopLossBps);
}

export const myFunds = (boats: BoatView[]) => boats.filter((b) => b.position.deposit > 0n && !b.position.withdrawn);
