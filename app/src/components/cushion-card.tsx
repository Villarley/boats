import { ShieldCheck } from "@phosphor-icons/react";
import { copy, terms } from "@/lib/copy";

/**
 * Fund detail: "If the fund falls" — the manager loses their stake (signal) before you lose $1 (loss).
 * Bar: the manager's striped segment, then the red end where investors start losing.
 */
export function CushionCard({
  manager, stake, firstLoss, lossLimitPct, managerShare = 0.88, className = "", headline = "lg",
}: { manager: string; stake: string; firstLoss: string; lossLimitPct: string; managerShare?: number; className?: string; headline?: "lg" | "md" }) {
  const [before, after] = copy.fund.cushion(manager, "\u0000").split("\u0000") as [string, string];
  const [mid, tail] = after.split("$1");
  return (
    <div className={`rounded-hero bg-card p-4 ${className}`} data-testid="cushion">
      <div className="flex items-center justify-between">
        <b className="text-[15px] font-semibold">{copy.fund.cushionTitle}</b>
        {headline === "lg" && <span className="text-[12.5px] text-muted">{terms.lossLimit} {lossLimitPct}</span>}
      </div>
      <p className={`mt-2.5 font-bold leading-[1.2] tracking-[-0.01em] ${headline === "lg" ? "text-[22px]" : "text-[19px]"}`}>
        {before}<em className="not-italic text-signal">{stake}</em>{mid}<i className="not-italic text-loss">{firstLoss}</i>{tail}
      </p>
      <div className="mt-3.5 flex h-[34px] gap-[3px]" aria-hidden>
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[10px_4px_4px_10px] bg-[repeating-linear-gradient(-45deg,#2B4FD8_0_6px,#3D5EE0_6px_12px)] pl-2.5 text-[12px] font-semibold text-white" style={{ flex: managerShare }}>
          <ShieldCheck weight="fill" className="size-3.5 flex-none" />{copy.fund.cushionBar(manager)}
        </span>
        <span className="rounded-[4px_10px_10px_4px] bg-loss" style={{ flex: Math.max(0.1, 1 - managerShare) }} />
      </div>
      <div className="bt-num mt-1.5 flex justify-between text-[11.5px] text-muted">
        <span>{copy.fund.cushionAxis[0]}</span><span>{copy.fund.cushionAxis[1]}</span><span className="text-loss">{copy.fund.cushionAxis[2]}</span>
      </div>
    </div>
  );
}
