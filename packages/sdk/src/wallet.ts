/**
 * The invisible-wallet interface. Apps talk to this, never to a specific wallet vendor, so the
 * passkey smart account (Circle today) can be swapped for our own account + paymaster later.
 */
import type { Address, Hex } from "viem";
import type { Call } from "./calls.js";

export type SendResult = { hash: Hex; status: "success" | "reverted" };

export interface BoatsWallet {
  /** "passkey" = smart account + paymaster (no gas, no seed); "local" = dev key in the browser */
  readonly kind: "passkey" | "local";
  readonly address: Address;
  /** Sends all calls atomically when the wallet supports batching (one confirmation), in order otherwise. */
  send(calls: Call[]): Promise<SendResult>;
}

/** User-facing message for any send failure. Never a hash, never a stack trace. */
export function friendlyError(err: unknown): string {
  const m = String((err as { shortMessage?: string; message?: string })?.shortMessage ?? (err as Error)?.message ?? err);
  if (/NotAllowedError|cancel|denied|rejected/i.test(m)) return "You cancelled. Your money hasn't moved.";
  if (/MandateViolation/.test(m)) return "The contract said no: that trade breaks this boat's rules.";
  if (/WrongState/.test(m)) return "This boat isn't taking that action right now.";
  if (/insufficient|exceeds balance|balance/i.test(m)) return "Not enough dollars for that.";
  return "Your money hasn't moved. Try again.";
}
