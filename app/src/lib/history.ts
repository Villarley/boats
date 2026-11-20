import type { Activity } from "@boats/sdk";

const DAY = 86_400;
const SPAN: Record<string, number> = { "1D": DAY, "1W": 7 * DAY, "1M": 30 * DAY };
const POINTS = 40;

type Move = { t: number; boat: string; amount: number | null }; // null = took everything out of that fund

/**
 * "Total invested" over time for one account, from its own on-chain moves in the shared feed:
 * each investment adds its dollars at the block time, a withdrawal takes that fund back to zero.
 * The last point is today's value (so gains and losses since the last move show at the end).
 * Returns dollars, oldest first, sampled evenly across the range ("All" starts a bit before the
 * first investment).
 */
export function investedSeries(acts: Activity[], me: string | undefined, nowValue: number, range: string, now = Date.now() / 1000): number[] {
  const who = me?.toLowerCase();
  const moves: Move[] = [];
  if (who) {
    for (const a of acts) {
      const at = (a as Activity & { at?: number }).at;
      const crew = String((a.args as { crew?: string }).crew ?? "").toLowerCase();
      if (!at || crew !== who) continue;
      if (a.kind === "boarded") moves.push({ t: at, boat: a.boat.toLowerCase(), amount: Number((a.args as { amount?: bigint }).amount ?? 0n) / 1e6 });
      else if (a.kind === "withdrawn") moves.push({ t: at, boat: a.boat.toLowerCase(), amount: null });
    }
  }
  moves.sort((x, y) => x.t - y.t);

  const first = moves[0]?.t;
  const span = SPAN[range] ?? (first ? Math.max(now - first, 3_600) * 1.08 : 7 * DAY);
  const start = now - span;

  const inFund = new Map<string, number>();
  const total = () => [...inFund.values()].reduce((s, v) => s + v, 0);
  let i = 0;
  const apply = (until: number) => {
    for (; i < moves.length && moves[i]!.t <= until; i++) {
      const m = moves[i]!;
      inFund.set(m.boat, m.amount === null ? 0 : (inFund.get(m.boat) ?? 0) + m.amount);
    }
  };

  const out: number[] = [];
  for (let k = 0; k <= POINTS; k++) {
    apply(start + (span * k) / POINTS);
    out.push(total());
  }
  out[out.length - 1] = nowValue; // today's value, with gains or losses
  return out;
}
