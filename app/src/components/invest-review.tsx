"use client";
import { ScanSmiley } from "@phosphor-icons/react";
import { Button } from "./button";
import { LabelRows } from "./label-rows";
import { ManagerAvatar } from "./manager-avatar";
import { WorstCaseGauge } from "./worst-case-gauge";
import type { BoatView } from "@/lib/store";
import { managerOf } from "@/lib/fund";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { pct, usd } from "@/lib/format";
import { useUnlock } from "@/lib/unlock";

/** Worst-case gauge + Apple Pay style rows for an amount about to go in. */
export function InvestFacts({ b, amount, worst, compact }: { b: BoatView; amount: bigint; worst: bigint; compact?: boolean }) {
  const m = managerOf(b);
  const keep = amount - worst;
  const rows = [
    ...(compact ? [] : [{ label: copy.invest.rows.shares, value: (Number(amount) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }) }]),
    { label: copy.invest.rows.coveredBy, note: copy.invest.rows.coveredByNote(m.first), value: usd(b.captainStake, { cents: false }) },
    { label: copy.invest.rows.fee, note: copy.invest.rows.feeNote, value: copy.invest.rows.free, valueClass: "text-gain" },
  ];
  return (
    <>
      <WorstCaseGauge
        className={compact ? "bg-white" : "mt-3.5"}
        label={copy.invest.worstCaseLabel.replace("10%", pct(b.stopLossBps))}
        keep={usd(keep, { cents: true })}
        keepCaption={copy.invest.youKeep(usd(keep, { cents: amount < 1_000_000_000n && keep % 1_000_000n !== 0n }))}
        lossCaption={usd(-worst, { cents: worst % 1_000_000n !== 0n })}
        lossShare={amount ? Number(worst) / Number(amount) : 0}
      />
      <LabelRows rows={rows} />
    </>
  );
}

/** F4: review before the money moves. Lives in a Sheet on mobile. */
export function InvestReview({ b, amount, worst, busy, err, onConfirm }: { b: BoatView; amount: bigint; worst: bigint; busy: boolean; err: string | null; passkey?: boolean; onConfirm: () => void }) {
  const m = managerOf(b);
  const unlock = useUnlock();
  return (
    <>
      <div className="mt-3.5 flex items-center gap-3 text-left">
        <ManagerAvatar manager={m} className="!size-11" />
        <div>
          <p className="text-[13px] text-muted">{copy.invest.youInvestIn(b.name)}</p>
          <b className="bt-num block text-[28px] font-bold leading-[1.1] tracking-[-0.02em]" data-testid="review-amount">{usd(amount, { cents: true })}</b>
        </div>
      </div>
      <div className="text-left"><InvestFacts b={b} amount={amount} worst={worst} /></div>
      <p className="mt-3.5 text-center text-[13px] text-muted">{copy.invest.disclaimer.replace("−10%", pct(-b.stopLossBps))}</p>
      {err && <p role="alert" className="mt-3 rounded-input bg-card px-3.5 py-2.5 text-[14px] text-loss">{err}</p>}
      <Button className="mt-4" icon={<ScanSmiley weight="bold" />} loading={busy} onClick={onConfirm} testId="confirm-board">
        {unlock.cta(appCopy.invest.cta)}
      </Button>
    </>
  );
}
