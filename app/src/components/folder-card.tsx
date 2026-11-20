"use client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CaretRight, ShieldCheck } from "@phosphor-icons/react";
import { AreaChart } from "./area-chart";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { usd } from "@/lib/format";

/** "$100.42" → big dollars + cents at 60% opacity. */
export function SplitAmount({ value, centsClass = "text-[22px] font-semibold opacity-60" }: { value: bigint; centsClass?: string }) {
  const s = usd(value, { cents: true });
  const [whole, cents] = s.split(".");
  return (
    <>
      {whole}
      {cents !== undefined && <small className={centsClass}>.{cents}</small>}
    </>
  );
}

/**
 * Home only (mobile). "Overview" folder tab over a signal card: balance, today pill, 7-day mini chart,
 * and a signal-deep strip with who covers the first losses.
 */
export function FolderCard({
  name, total, delta, series, baseline, protection,
}: {
  name: string | null; total: bigint; delta: bigint; series: number[]; baseline?: number;
  protection?: { manager: string; amount: string; href: string };
}) {
  const up = delta >= 0n;
  // A week with no change draws a flat line; keep its fill faint so it doesn't read as a solid block.
  const flat = series.every((v) => v === series[0]);
  return (
    <section className="relative mt-4" data-testid="folder-card">
      <div className="relative z-[2] flex">
        <span className="flex h-[34px] items-center rounded-t-[14px] bg-signal px-[18px] text-[13.5px] font-semibold text-white">{copy.home.folderTabs[0]}</span>
      </div>
      <div className={`relative overflow-hidden rounded-[0_22px_22px_22px] bg-signal px-[18px] pt-4 text-white ${protection ? "" : "pb-[18px]"}`}>
        <div className="relative min-h-[92px]">
          <p className="text-[13.5px] text-white/75">{name ? copy.home.youHave(name) : appCopy.home.youHaveNoName}</p>
          <p className="bt-num mt-0.5 text-[38px] font-bold leading-[1.1] tracking-[-0.02em]" data-testid="total">
            <SplitAmount value={total} />
          </p>
          <span className="bt-num mt-2 inline-flex h-6 items-center gap-1 rounded-full bg-white/[.18] px-2.5 text-[12.5px] font-semibold">
            {up ? <ArrowUpRight weight="bold" className="size-3.5" /> : <ArrowDownRight weight="bold" className="size-3.5" />}
            {up ? copy.home.today(usd(delta, { cents: true })) : appCopy.home.todayDown(usd(delta, { cents: true }))}
          </span>
            <div className="absolute right-0 top-[-4px] w-[138px]" aria-hidden>
              <span className="block text-right text-[10.5px] font-semibold tracking-[.02em] text-white/70">{copy.home.chartLabel}</span>
              <div className="mt-1 h-[62px]">
                <AreaChart values={series} baseline={baseline} width={150} height={70} color="#FFFFFF" fillFrom={flat ? 0.1 : 0.3} strokeWidth={2.2} endDot />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-white/60">
                {copy.home.chartAxis.map((a) => <span key={a}>{a}</span>)}
              </div>
            </div>
        </div>
        {protection && (
          <Link href={protection.href} className="-mx-[18px] mt-4 flex items-center gap-2.5 bg-signal-deep px-[18px] py-3 text-[13.5px]">
            <ShieldCheck weight="fill" className="size-[18px] flex-none" />
            <span>
              {copy.home.protectionStrip(protection.manager, "\u0000").split("\u0000")[0]}
              <b className="font-semibold">{protection.amount}</b>
              {copy.home.protectionStrip(protection.manager, "\u0000").split("\u0000")[1]}
            </span>
            <CaretRight weight="bold" className="ml-auto size-4 opacity-70" />
          </Link>
        )}
      </div>
    </section>
  );
}
