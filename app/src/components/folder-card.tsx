"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CaretRight, ShieldCheck } from "@phosphor-icons/react";
import { AreaChart } from "./area-chart";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { usd } from "@/lib/format";

export type FolderFund = { key: string; name: string; value: bigint; href: string };

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
 * Home only (mobile). Folder tabs over a signal card: balance, today pill, 7-day mini chart,
 * and a signal-deep strip with who covers the first losses.
 */
export function FolderCard({
  name, total, delta, series, baseline, protection, funds,
}: {
  name: string; total: bigint; delta: bigint; series: number[]; baseline?: number;
  protection?: { manager: string; amount: string; href: string };
  funds: FolderFund[];
}) {
  const [tab, setTab] = useState(0);
  const up = delta >= 0n;
  return (
    <section className="relative mt-4" data-testid="folder-card">
      <div className="relative z-[2] flex" role="tablist">
        {copy.home.folderTabs.map((t, i) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`flex h-[34px] items-center rounded-t-[14px] px-[18px] text-[13.5px] font-semibold ${tab === i ? "bg-signal text-white" : "text-muted"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={`relative overflow-hidden bg-signal px-[18px] pt-4 text-white ${tab === 0 ? "rounded-[0_22px_22px_22px]" : "rounded-[22px]"}`}>
        {tab === 0 ? (
          <div className="relative min-h-[92px]">
            <p className="text-[13.5px] text-white/75">{copy.home.youHave(name)}</p>
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
                <AreaChart values={series} baseline={baseline} width={150} height={70} color="#FFFFFF" fillFrom={0.3} strokeWidth={2.2} endDot />
              </div>
              <div className="mt-0.5 flex justify-between text-[10px] text-white/60">
                {copy.home.chartAxis.map((a) => <span key={a}>{a}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <ul className="min-h-[92px] pb-1" data-testid="folder-funds">
            {funds.map((f) => (
              <li key={f.key}>
                <Link href={f.href} className="flex items-center justify-between py-2 text-[15px] font-semibold">
                  <span>{f.name}</span>
                  <span className="bt-num">{usd(f.value, { cents: true })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
