import type { BoatView } from "@/lib/store";
import { TokenIcon } from "./token-icon";
import { assetName, dateShort, pct, usd } from "@/lib/format";
import { symbolOf } from "@/lib/deployment";
import { appCopy } from "@/lib/copy.app";

const M = appCopy.manager;

/**
 * Manager's view of a fund: the numbers that matter (value, investors' money, yours, limits, end)
 * and what it holds, asset by asset, with each one's share against its max.
 */
export function FundInside({ b }: { b: BoatView }) {
  const value = b.state === "Closed" ? b.finalValue : b.nav || b.crewTotal + b.captainStake;
  const total = b.holdings.reduce((s, h) => s + h.value, 0n);
  const money = (v: bigint) => usd(v, { cents: v < 1_000_000_000n }); // cents only under $1,000
  const facts: [string, string, string?][] = [
    [M.factValue, money(value)],
    [M.factInvestors, money(b.crewTotal)],
    [M.factYours, money(b.captainStake)],
    [M.factLimits, `${pct(-b.stopLossBps)} · +${pct(b.takeProfitBps)}`],
    [M.factEnds, dateShort(b.endTime)],
    [M.factWho, b.inviteOnly ? M.whoPrivate : M.whoPublic],
  ];
  // Dollars first, then every asset the fund may hold (even at 0), largest first.
  const rows = [...b.holdings].sort((x, y) => (x.token.toLowerCase() === b.usdc.toLowerCase() ? -1 : y.token.toLowerCase() === b.usdc.toLowerCase() ? 1 : Number(y.value - x.value)));
  return (
    <div data-testid="fund-inside">
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="rounded-[14px] bg-card px-3 py-2.5">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className="bt-num mt-0.5 truncate text-[14.5px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mb-2 mt-5 text-[16px] font-semibold">{M.insideTitle}</p>
      <div className="flex flex-col gap-2.5 rounded-card bg-card p-3.5">
        {rows.map((h) => {
          const bps = total > 0n ? Number((h.value * 10_000n) / total) : 0;
          const max = h.maxWeightBps;
          const isDollars = h.token.toLowerCase() === b.usdc.toLowerCase();
          return (
            <div key={h.token} data-testid={`inside-${symbolOf(h.token)}`}>
              <div className="flex items-center gap-2.5">
                <TokenIcon symbol={symbolOf(h.token)} size={28} />
                <span className="min-w-0 flex-1">
                  <b className="block text-[14.5px] font-semibold leading-tight">{assetName(h.token)}</b>
                  <span className="text-[12px] text-muted">{isDollars ? M.alwaysAllowed : M.maxShare(pct(max ?? 0))}</span>
                </span>
                <span className="text-right">
                  <b className="bt-num block text-[14.5px] font-semibold">{usd(h.value, { cents: true })}</b>
                  <span className="bt-num text-[12px] text-muted">{pct(Math.round(bps / 100) * 100)}</span>
                </span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-card-3" aria-hidden>
                <i className="absolute inset-y-0 left-0 rounded-full bg-signal" style={{ width: `${Math.min(100, bps / 100)}%` }} />
                {!isDollars && max !== undefined && <b className="absolute -top-1 h-3.5 w-0.5 rounded-[1px] bg-loss" style={{ left: `${Math.min(100, max / 100)}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
