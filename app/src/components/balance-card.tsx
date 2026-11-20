"use client";
import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react";
import { AreaChart } from "./area-chart";

/** Web home: grey balance card with a range switch, signal area chart and a row of pill actions. */
export function BalanceCard({
  label, value, change, changeUp, changeSuffix, ranges, seriesFor, actions,
}: {
  label: string; value: string; change: string; changeUp: boolean; changeSuffix: string; ranges: readonly string[];
  seriesFor: (range: string) => number[]; actions: ReactNode;
}) {
  const [range, setRange] = useState(ranges[1] ?? ranges[0]!);
  return (
    <div className="rounded-[20px] bg-card p-5" data-testid="balance-card">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[13px] text-muted">{label}</p>
          <p className="bt-num mt-0.5 text-[40px] font-bold leading-[1.15] tracking-[-0.01em]" data-testid="total-web">{value}</p>
          <p className={`bt-num mt-1 flex items-center gap-1 text-[14px] ${changeUp ? "text-gain" : "text-loss"}`}>
            {changeUp ? <ArrowUpRight weight="bold" className="size-3.5" /> : <ArrowDownRight weight="bold" className="size-3.5" />}
            {change} <span className="text-muted">{changeSuffix}</span>
          </p>
        </div>
        <div className="flex gap-1" role="tablist">
          {ranges.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={r === range}
              onClick={() => setRange(r)}
              className={`rounded-2xl px-3.5 py-[7px] text-[13px] font-semibold ${r === range ? "bg-card-2 text-ink" : "text-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2.5 h-[120px]">
        <AreaChart values={seriesFor(range)} width={600} height={120} color="var(--bt-signal)" strokeWidth={2} smooth={false} pad={0} />
      </div>
      <div className="mt-5 flex gap-2.5">{actions}</div>
    </div>
  );
}
