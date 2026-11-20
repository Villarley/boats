import { ASSET_NAMES } from "@boats/sdk";
import { symbolOf } from "./deployment";

/** $1,234 or $12.34. Money is always dollars, never "USDC". */
export function usd(v: bigint, opts: { cents?: boolean; sign?: boolean } = {}): string {
  const n = Number(v) / 1e6;
  const cents = opts.cents ?? Math.abs(n) < 1000;
  const s = Math.abs(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return sign + s;
}

export function pct(bps: number, opts: { sign?: boolean; digits?: number } = {}): string {
  const v = bps / 100;
  const d = opts.digits ?? (Number.isInteger(v) ? 0 : 1);
  const sign = v < 0 ? "−" : opts.sign && v > 0 ? "+" : "";
  return `${sign}${Math.abs(v).toFixed(d)}%`;
}

export const assetName = (token: string) => ASSET_NAMES[symbolOf(token)] ?? symbolOf(token);

export function dateShort(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function daysLeft(unix: number) {
  return Math.max(0, Math.ceil((unix * 1000 - Date.now()) / 86_400_000));
}

/** Parses a keypad string like "100.5" into USDC base units. */
export function parseUsd(s: string): bigint {
  if (!s) return 0n;
  const [i, f = ""] = s.split(".");
  return BigInt(i || "0") * 1_000_000n + BigInt((f + "000000").slice(0, 6));
}
