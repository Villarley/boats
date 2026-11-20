/**
 * Off-chain mirror of Boat.swap()'s mandate check. The app and the AI captain use it to
 * catch a bad trade before sending it; the contract is still the final judge.
 *
 * All values are USDC base units (6 decimals) as bigint.
 */

export type Holding = {
  token: `0x${string}`;
  symbol: string;
  /** current value in USDC base units */
  value: bigint;
  /** max weight in bps; undefined for USDC (no cap) */
  maxWeightBps?: number;
};

export type TradeCheck =
  | { ok: true; weightAfterBps: number; navAfter: bigint }
  | {
      ok: false;
      rule: "asset-not-allowed" | "same-asset" | "zero-amount" | "insufficient-balance" | "max-weight";
      message: string;
      weightAfterBps?: number;
      /** largest amount (USDC value) that respects the rule, when one exists */
      maxAllowed?: bigint;
    };

const BPS = 10_000n;

export function nav(holdings: Holding[]): bigint {
  return holdings.reduce((s, h) => s + h.value, 0n);
}

/**
 * Checks a trade of `amountValue` (USDC value) from `from` to `to`.
 * `spreadBps` models the router's spread, which lowers NAV after the swap.
 */
export function checkTrade(
  holdings: Holding[],
  usdc: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  amountValue: bigint,
  spreadBps = 0,
): TradeCheck {
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  if (amountValue <= 0n) return { ok: false, rule: "zero-amount", message: "Enter an amount." };
  if (eq(from, to)) return { ok: false, rule: "same-asset", message: "Pick two different assets." };

  const src = holdings.find((h) => eq(h.token, from));
  const dst = holdings.find((h) => eq(h.token, to));
  const allowed = (h: Holding | undefined, t: string) => h && (eq(t, usdc) || (h.maxWeightBps ?? 0) > 0);
  if (!allowed(src, from) || !allowed(dst, to)) {
    const sym = !allowed(src, from) ? (src?.symbol ?? "This asset") : (dst?.symbol ?? "This asset");
    return { ok: false, rule: "asset-not-allowed", message: `${sym} isn't on this boat's list.` };
  }
  if (amountValue > src!.value) {
    return {
      ok: false,
      rule: "insufficient-balance",
      message: `The boat only holds ${fmtUsd(src!.value)} in ${src!.symbol}.`,
      maxAllowed: src!.value,
    };
  }

  const n = nav(holdings);
  const received = (amountValue * (BPS - BigInt(spreadBps))) / BPS;
  const navAfter = n - amountValue + received;
  if (eq(to, usdc)) return { ok: true, weightAfterBps: 0, navAfter };

  const dstAfter = dst!.value + received;
  const weightAfterBps = navAfter === 0n ? 0 : Number((dstAfter * BPS) / navAfter);
  const cap = dst!.maxWeightBps!;
  // Same inequality as the contract: w * 10_000 > nav * cap reverts.
  if (dstAfter * BPS > navAfter * BigInt(cap)) {
    return {
      ok: false,
      rule: "max-weight",
      message: `Max ${cap / 100}% in ${dst!.symbol}. This makes it ${Math.round(weightAfterBps / 100)}%.`,
      weightAfterBps,
      maxAllowed: maxBuy(holdings, dst!, n, cap, spreadBps, src!.value),
    };
  }
  return { ok: true, weightAfterBps, navAfter };
}

/** Largest USDC value you can move into `dst` without passing its cap (rounded down to whole dollars). */
function maxBuy(holdings: Holding[], dst: Holding, n: bigint, capBps: number, spreadBps: number, srcValue: bigint): bigint {
  // Solve (d + x*k) * BPS <= (n - x + x*k) * cap with k = (BPS - spread)/BPS.
  const k = BPS - BigInt(spreadBps);
  const cap = BigInt(capBps);
  const num = n * cap * BPS - dst.value * BPS * BPS;
  const den = k * BPS - cap * (k - BPS);
  if (num <= 0n || den <= 0n) return 0n;
  let x = num / den;
  if (x > srcValue) x = srcValue;
  x = (x / 1_000_000n) * 1_000_000n; // whole dollars, safely inside the cap
  void holdings;
  return x;
}

export function fmtUsd(v: bigint): string {
  const dollars = Number(v) / 1e6;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: dollars < 100 ? 2 : 0 });
}
