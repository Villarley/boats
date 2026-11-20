"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Address } from "viem";
import { useStore, type BoatView } from "./store";
import { useActivityFeed } from "./activity";
import { inviteCode } from "./invite-code";
import { managerOf, type Manager } from "./fund";
import { savedName } from "./names";

export { inviteCode };

/**
 * Who invited you: the fund's manager account (the invite is signed by it). Uses the name that
 * account goes by here (demo personas, or a name saved on this device), else the fund's manager.
 */
export function inviterOf(b: BoatView): Manager {
  const m = managerOf(b);
  const name = savedName(b.captain);
  if (!name) return m;
  return { ...m, name, first: name.split(" ")[0]!, initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() };
}

/**
 * Invitations are on-chain: a manager calls `invite([address])` on their fund, which emits
 * `Invited(who)`. The shared activity feed carries those events, so the investor's app reads its
 * own invites from there (no database). "Not now" is remembered on this device.
 */
export type Invitation = { to: string; fund: string; boat: BoatView; at?: number };

const KEY = "boats.invites.dismissed";
const listeners = new Set<() => void>();
let dismissed: string[] | null = null;
const EMPTY: string[] = [];
function readDismissed(): string[] {
  if (dismissed) return dismissed;
  try { dismissed = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { dismissed = []; }
  return dismissed!;
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const key = (to: string, fund: string) => `${to.toLowerCase()}:${fund.toLowerCase()}`;

/** The investor says Not now (the on-chain invite stays; it just leaves their list). */
export function dismissInvitation(to: string, fund: string) {
  dismissed = [...readDismissed(), key(to, fund)].slice(-200);
  try { localStorage.setItem(KEY, JSON.stringify(dismissed)); } catch {}
  listeners.forEach((l) => l());
}

/** Every fund that invited `who` on-chain (whatever the state), from the shared feed. */
export function useInvitedFunds(): Set<string> {
  const { wallet } = useStore();
  const acts = useActivityFeed();
  const me = wallet?.address.toLowerCase();
  return useMemo(
    () => new Set(acts.filter((a) => a.kind === "invited" && String((a.args as { who?: string }).who).toLowerCase() === me).map((a) => a.boat.toLowerCase())),
    [acts, me],
  );
}

/** Open invitations for the signed-in account: invited, still open to join, not in yet, not dismissed. */
export function useInvitations(): Invitation[] {
  const { wallet, boats } = useStore();
  const acts = useActivityFeed();
  const gone = useSyncExternalStore(subscribe, readDismissed, () => EMPTY);
  const me = wallet?.address.toLowerCase();
  return useMemo(() => {
    if (!me) return [];
    const seen = new Set<string>();
    const out: Invitation[] = [];
    for (const a of acts) {
      if (a.kind !== "invited" || String((a.args as { who?: string }).who).toLowerCase() !== me) continue;
      const fund = a.boat.toLowerCase();
      if (seen.has(fund) || gone.includes(key(me, fund))) continue;
      seen.add(fund);
      const b = boats.find((x) => x.address.toLowerCase() === fund);
      if (!b || b.state !== "Open" || b.position.deposit > 0n) continue;
      out.push({ to: me, fund: b.address, boat: b, at: (a as { at?: number }).at });
    }
    return out;
  }, [acts, boats, gone, me]);
}

/** Who a fund has invited, and whether each has joined (manager's Invite screen). */
export function useSentInvitations(fund?: Address) {
  const acts = useActivityFeed();
  return useMemo(() => {
    if (!fund) return [];
    const f = fund.toLowerCase();
    const joined = new Set(acts.filter((a) => a.kind === "boarded" && a.boat.toLowerCase() === f).map((a) => String((a.args as { crew?: string }).crew).toLowerCase()));
    const seen = new Set<string>();
    return acts
      .filter((a) => a.kind === "invited" && a.boat.toLowerCase() === f)
      .map((a) => String((a.args as { who?: string }).who))
      .filter((w) => !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase()))
      .map((to) => ({ to, joined: joined.has(to.toLowerCase()) }));
  }, [acts, fund]);
}
