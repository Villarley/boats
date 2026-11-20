"use client";
import { useOdds } from "@/lib/odds";
import { copy } from "@/lib/copy";
import { Badge } from "./badge";
import { appCopy } from "@/lib/copy.app";

/** Prediction market odds: source + question + solid green "Yes 70%" / card-3 "30%". */
export function OddsCard({ hint, className = "" }: { hint?: string; className?: string }) {
  const o = useOdds();
  if (!o) return null;
  const yes = Math.round(o.probability * 100);
  return (
    <div className={`rounded-[20px] bg-card p-3.5 ${className}`} data-testid="odds">
      <span className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
        {copy.fund.oddsSource}
        {o.sample && <Badge>{appCopy.example}</Badge>}
      </span>
      <p className="mt-1.5 text-[13.5px] font-semibold leading-[1.3]">{copy.fund.oddsQuestion}</p>
      <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `${Math.max(yes, 18)}fr ${Math.max(100 - yes, 18)}fr` }}>
        <span className="flex h-[30px] items-center justify-center rounded-[9px] bg-gain text-[12.5px] font-bold text-white">{appCopy.fund.yes(yes)}</span>
        <span className="flex h-[30px] items-center justify-center rounded-[9px] bg-card-3 text-[12.5px] font-bold text-muted">{100 - yes}%</span>
      </div>
      {hint && <p className="mt-2.5 text-[12.5px] leading-[1.4] text-muted">{hint}</p>}
    </div>
  );
}
