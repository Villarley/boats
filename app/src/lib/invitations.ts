"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useStore } from "./store";

/**
 * Invitations by wallet address: a manager invites an investor's account ID to a fund
 * (/api/invitations), and the investor's app lists the invites for its own address.
 */
export type Invitation = { to: string; fund: string; from: string; code: string; at: number };

const EMPTY: Invitation[] = [];
const listeners = new Set<() => void>();
let mine: Invitation[] = EMPTY;
let owner = "";
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

async function load(address: string) {
  try {
    const r = await fetch(`/api/invitations?to=${address}`, { cache: "no-store" });
    const j = (await r.json()) as { invitations?: Invitation[] };
    if (owner === address.toLowerCase()) {
      mine = j.invitations ?? EMPTY;
      emit();
    }
  } catch {}
}

/** Invitations for the signed-in account, kept fresh (every 20 s while the tab is visible). */
export function useInvitations(): Invitation[] {
  const { wallet } = useStore();
  const address = wallet?.address;
  useEffect(() => {
    if (!address) return;
    if (owner !== address.toLowerCase()) {
      owner = address.toLowerCase();
      mine = EMPTY;
      emit();
    }
    load(address);
    const id = setInterval(() => !document.hidden && load(address), 20_000);
    return () => clearInterval(id);
  }, [address]);
  return useSyncExternalStore(subscribe, () => mine, () => EMPTY);
}

/** The investor says Not now, or joined: the invite leaves their list. */
export async function dismissInvitation(to: string, fund: string) {
  mine = mine.filter((i) => i.fund.toLowerCase() !== fund.toLowerCase());
  emit();
  await fetch(`/api/invitations?to=${to}&fund=${fund}`, { method: "DELETE" }).catch(() => {});
}

/** A manager invites an account ID to one of their funds. */
export async function sendInvitation(to: string, fund: string, from: string): Promise<boolean> {
  const r = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, fund, from }) }).catch(() => null);
  return Boolean(r?.ok);
}

/** Who a fund has invited so far (manager's Invite screen). */
export function useSentInvitations(fund?: string) {
  const [list, setList] = useState<Invitation[]>(EMPTY);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!fund) return;
    let alive = true;
    fetch(`/api/invitations?fund=${fund}`, { cache: "no-store" }).then((r) => r.json())
      .then((j: { invitations?: Invitation[] }) => alive && setList(j.invitations ?? EMPTY)).catch(() => {});
    return () => { alive = false; };
  }, [fund, tick]);
  return { list, reload: () => setTick((t) => t + 1) };
}
