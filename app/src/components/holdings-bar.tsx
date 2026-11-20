import { copy } from "@/lib/copy";

export type HoldingSlice = { name: string; share: number };
const COLORS = ["bg-signal", "bg-teal", "bg-faint", "bg-indigo", "bg-sky"];

/** "What it holds": 10px segmented bar + legend rows with % on the right. */
export function HoldingsBar({ slices, className = "" }: { slices: HoldingSlice[]; className?: string }) {
  const shown = slices.filter((s) => s.share > 0);
  return (
    <div className={`rounded-[20px] bg-card p-3.5 ${className}`} data-testid="holdings">
      <span className="text-[12.5px] font-semibold text-muted">{copy.fund.holds}</span>
      <div className="mb-2.5 mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]" aria-hidden>
        {shown.map((s, i) => <i key={s.name} className={COLORS[i % COLORS.length]} style={{ flex: s.share }} />)}
      </div>
      <div className="flex flex-col gap-[5px] text-[12.5px]">
        {shown.map((s, i) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <i className={`size-2 flex-none rounded-[2px] ${COLORS[i % COLORS.length]}`} aria-hidden />
            {s.name}
            <b className="bt-num ml-auto font-semibold">{Math.round(s.share * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
