"use client";
import { useSyncExternalStore } from "react";

// Tiny app-wide UI flags that several screens open (the Withdraw sheet lives once, in the tabs layout).
const listeners = new Set<() => void>();
let withdrawOpen = false;
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const openWithdraw = () => { withdrawOpen = true; emit(); };
export const closeWithdraw = () => { withdrawOpen = false; emit(); };
export const useWithdrawOpen = () => useSyncExternalStore(subscribe, () => withdrawOpen, () => false);
