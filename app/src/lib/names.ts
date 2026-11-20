"use client";
import { useSyncExternalStore } from "react";
import type { Address } from "viem";
import { deployment } from "./deployment";
import { appCopy } from "./copy.app";

// The name people see is kept on this device, per account. There are no profiles on-chain;
// the two demo accounts come with their persona's name.
const KEY = "boats.names";
const DEMO: Record<string, string> = {
  ...(deployment.demo.grandma ? { [deployment.demo.grandma.toLowerCase()]: "María" } : {}),
  ...(deployment.demo.ana ? { [deployment.demo.ana.toLowerCase()]: "Laura" } : {}),
};

const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;

function read(): Record<string, string> {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    cache = {};
  }
  return cache!;
}

/** The saved name for an account, or null if it never set one. */
export function savedName(address?: string): string | null {
  if (!address || typeof window === "undefined") return null;
  const a = address.toLowerCase();
  return read()[a] ?? DEMO[a] ?? null;
}

export function saveName(address: string, name: string) {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 24);
  if (!clean) return;
  cache = { ...read(), [address.toLowerCase()]: clean };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Saved name for `address`, or null. Re-renders when it changes. */
export function useSavedName(address?: Address): string | null {
  return useSyncExternalStore(subscribe, () => savedName(address), () => null);
}

/** The signed-in person's name for the UI: their saved name, or a neutral "You" until they set one. */
export function useDisplayName(address?: Address): string {
  return useSavedName(address) ?? appCopy.name.fallback;
}

// Welcome asks the name before the account exists; it is stored here until the account has an address.
const PENDING = "boats.pendingName";
export function setPendingName(name: string) {
  try { sessionStorage.setItem(PENDING, name); } catch {}
}
/** Saves a name typed on Welcome to the account that just opened. True if one was waiting. */
export function claimPendingName(address: string): boolean {
  try {
    const n = sessionStorage.getItem(PENDING);
    if (!n) return false;
    sessionStorage.removeItem(PENDING);
    saveName(address, n);
    return true;
  } catch {
    return false;
  }
}
