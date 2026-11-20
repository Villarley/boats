"use client";
import { useSyncExternalStore } from "react";
import { useStore } from "./store";
import { appCopy } from "./copy.app";

const U = appCopy.unlock;

/** What unlocks a passkey on this device, in the words people know: Face ID, Touch ID, fingerprint… */
export function unlockName(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return U.faceId;
  if (/Macintosh|Mac OS X/i.test(ua)) return U.touchId;
  if (/Android/i.test(ua)) return U.fingerprint;
  if (/Windows/i.test(ua)) return U.hello;
  return U.passkey;
}

const subscribe = () => () => {};
/** The device's unlock name (server render: the generic "your passkey"). */
export function useUnlockName() {
  return useSyncExternalStore(subscribe, () => unlockName(navigator.userAgent), () => U.passkey);
}

/**
 * How money buttons and account labels talk about confirming: "Invest with Touch ID" on a passkey
 * account, plain "Invest" for an account kept on this device (no biometric step happens).
 */
export function useUnlock() {
  const { wallet } = useStore();
  const how = useUnlockName();
  const passkey = wallet?.kind === "passkey";
  return {
    passkey,
    how,
    cta: (action: string) => (passkey ? U.with(action, how) : action),
    signedIn: passkey ? U.signedIn(how) : U.device,
  };
}
