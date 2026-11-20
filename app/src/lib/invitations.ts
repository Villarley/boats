"use client";
import { useSyncExternalStore } from "react";

/**
 * Invitations a person has received. A manager shares a link (/invitations?fund=…&from=…&code=…);
 * opening it saves the invitation on this device, and it shows in Invitations until dismissed.
 * There are no private funds or invite lists on-chain yet, so this lives with the person.
 */
export type Invitation = { fund: string; from: string; code: string; at: number };

const KEY = "boats.invitations";
const PENDING = "boats.invitePending";
const listeners = new Set<() => void>();
let cache: Invitation[] | null = null;
const EMPTY: Invitation[] = [];

function read(): Invitation[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(next: Invitation[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

/** The short code shown on the ticket, derived from the fund address ("9BD0-88B5"). */
export const inviteCode = (fund: string) => `${fund.slice(2, 6)}-${fund.slice(-4)}`.toUpperCase();

/** The link a manager shares for one of their funds. */
export function inviteLink(origin: string, fund: string, from: string) {
  return `${origin}/invitations?fund=${fund}&from=${encodeURIComponent(from)}&code=${inviteCode(fund)}`;
}

/** Saves the invitation in the current URL (if any). True when one was found, so sign-in can come back here. */
export function captureInvitation(search: string): boolean {
  const q = new URLSearchParams(search);
  const fund = q.get("fund");
  if (!fund || !/^0x[0-9a-fA-F]{40}$/.test(fund)) return false;
  const inv: Invitation = { fund, from: (q.get("from") ?? "").slice(0, 40), code: q.get("code") ?? inviteCode(fund), at: Date.now() };
  write([inv, ...read().filter((i) => i.fund.toLowerCase() !== fund.toLowerCase())]);
  try { sessionStorage.setItem(PENDING, "1"); } catch {}
  return true;
}

/** After sign-in: whether an invitation link brought this person here (Invitations clears it). */
export function takePendingInvitation(): boolean {
  try {
    return sessionStorage.getItem(PENDING) === "1";
  } catch {
    return false;
  }
}
export function clearPendingInvitation() {
  try { sessionStorage.removeItem(PENDING); } catch {}
}

export function dismissInvitation(fund: string) {
  write(read().filter((i) => i.fund.toLowerCase() !== fund.toLowerCase()));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useInvitations(): Invitation[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
