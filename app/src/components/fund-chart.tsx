"use client";
import { useId } from "react";
import { smoothPath } from "./area-chart";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * Fund value between its limits: signal line 2.5 + 16%→0 fill, gain zone above the profit target,
 * red hatch below the loss limit, dashed limit lines with white label pills, end dot + navy value pill.
 */
export function FundChart({
  values, lossLimit, profitTarget, nowLabel, lossLabel, profitLabel, ranges, height = 160, className = "",
}: {
  values: number[]; lossLimit: number; profitTarget: number; nowLabel: string; lossLabel: string; profitLabel: string;
  ranges?: { options: readonly string[]; value: string; onChange: (r: string) => void }; height?: number; className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const W = 390, H = height;
  const band = profitTarget - lossLimit || 1;
  const min = lossLimit - band * 0.13, max = profitTarget + band * 0.13;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * (W - 22) + 2, y(v)] as [number, number]);
  const line = smoothPath(pts);
  const last = pts[pts.length - 1]!;
  const yHi = y(profitTarget), yLo = y(lossLimit);
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(2)}%`;
  return (
    <div className={className}>
      <div className="relative" style={{ height: H + 50 }} role="img" aria-label={`${nowLabel}. ${profitLabel} ${fmt(profitTarget)}. ${lossLabel} ${fmt(lossLimit)}.`}>
        <div className="absolute inset-x-0 top-[25px]" style={{ height: H }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2B4FD8" stopOpacity=".16" /><stop offset="1" stopColor="#2B4FD8" stopOpacity="0" /></linearGradient>
              <pattern id={`${id}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#D93A3F" strokeOpacity=".18" strokeWidth="2" /></pattern>
            </defs>
            <rect x="0" y="0" width={W} height={yHi} fill="#12935A" fillOpacity=".05" />
            <rect x="0" y={yLo} width={W} height={H - yLo} fill={`url(#${id}h)`} />
            <line x1="0" x2={W} y1={yHi} y2={yHi} stroke="#12935A" strokeOpacity=".55" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2={W} y1={yLo} y2={yLo} stroke="#D93A3F" strokeOpacity=".55" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <path d={`${line} L${last[0]} ${H} L${pts[0]![0]} ${H}Z`} fill={`url(#${id}f)`} />
            <path d={line} fill="none" stroke="#2B4FD8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-0 -translate-y-1/2 whitespace-nowrap rounded-chip bg-white px-2 py-[3px] text-[11.5px] font-semibold text-gain shadow-[0_0_0_1px_var(--bt-card-3)]" style={{ top: pct(yHi, H) }}>{profitLabel} · {fmt(profitTarget)}</span>
          <span className="absolute left-0 -translate-y-1/2 whitespace-nowrap rounded-chip bg-white px-2 py-[3px] text-[11.5px] font-semibold text-loss shadow-[0_0_0_1px_var(--bt-card-3)]" style={{ top: pct(yLo, H) }}>{lossLabel} · {fmt(lossLimit)}</span>
          <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_0_5px_rgba(43,79,216,.16),inset_0_0_0_2px_#fff]" style={{ left: pct(last[0], W), top: pct(last[1], H) }} />
          <span className="bt-num absolute ml-1.5 -translate-x-full -translate-y-[170%] whitespace-nowrap rounded-chip bg-navy px-2 py-1 text-[12px] font-bold text-white" style={{ left: pct(last[0], W), top: pct(last[1], H) }}>{nowLabel}</span>
        </div>
      </div>
      {ranges && (
        <div className="mt-2.5 flex justify-between" role="tablist">
          {ranges.options.map((r) => (
            <button key={r} role="tab" aria-selected={r === ranges.value} onClick={() => ranges.onChange(r)}
              className={`rounded-2xl px-3.5 py-[7px] text-[13px] font-semibold ${r === ranges.value ? "bg-card-2 text-ink" : "text-muted"}`}>{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Example series around the fund's real current value (no price history stored yet). */
export function fundExampleSeries(now: number, range: string, n = 18) {
  const seed = range.length + range.charCodeAt(0);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? now : now * (1 + Math.sin((i + seed) * 1.7) * 0.003 + Math.cos(i * 0.9 + seed) * 0.0015)));
}
