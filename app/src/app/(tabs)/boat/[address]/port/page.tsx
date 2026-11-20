"use client";
import { use, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { buildWithdrawCall, friendlyError, portSummary } from "@boats/sdk";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { ArtBanner } from "@/components/art-banner";
import { Button } from "@/components/button";
import { StickyActions } from "@/components/controls";
import { Timeline, type TimelineEvent } from "@/components/timeline";
import { Proof } from "@/components/proof";
import { useBoat, useStore } from "@/lib/store";
import { stamp, useEndedAt } from "@/lib/activity";
import { managerOf } from "@/lib/fund";
import { pct, usd } from "@/lib/format";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

export default function FundClosed({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  const { wallet, refresh } = useStore();
  const endedAt = useEndedAt(address);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hash, setHash] = useState<string>();

  if (!b) return <Page><TopBar right={<CloseButton />} /><div className="mt-6 h-64 animate-pulse rounded-hero bg-card" /></Page>;
  if (b.state !== "Closed")
    return (
      <Page>
        <TopBar left={<BackButton to={`/boat/${address}`} />} />
        <div className="mt-6 rounded-card bg-card p-4">
          <b className="block text-[16px] font-semibold">{appCopy.closed.notClosedTitle}</b>
          <p className="mt-1 text-[14px] text-muted">{appCopy.closed.notClosedBody}</p>
        </div>
      </Page>
    );

  const m = managerOf(b);
  const p = b.position;
  const sum = portSummary(b.startValue, b.finalValue, p.deposit, p.valueNow);
  const when = endedAt ? stamp(endedAt) : appCopy.closed.earlier;
  const withdrawn = p.withdrawn || Boolean(hash);
  const cents = (v: bigint) => usd(v, { cents: true });
  const whole = (v: bigint) => usd(v, { cents: v % 1_000_000n !== 0n });

  let events: TimelineEvent[];
  if (sum.boatBps < 0) {
    const loss = b.startValue - b.finalValue;
    const paid = loss < b.captainStake ? loss : b.captainStake;
    events = [
      { key: "fell", time: when, color: "var(--bt-loss)", title: appCopy.closed.marketFell(pct(-sum.boatBps)), sub: copy.closed.events[0].sub },
      { key: "paid", time: when, color: "var(--bt-navy)", title: copy.closed.events[1].title(m.first), sub: copy.closed.events[1].sub, amount: usd(-paid, { cents: false }) },
      { key: "you", time: copy.closed.now, color: "var(--bt-signal)", title: appCopy.closed.youLost(pct(-sum.youBps, { digits: sum.youBps % 100 ? 1 : 0 })), sub: copy.closed.events[2].sub(whole(p.deposit), whole(p.valueNow)), amount: cents(sum.youDelta), amountClass: "text-loss" },
    ];
  } else {
    const first: TimelineEvent = b.endReason === "TakeProfit"
      ? { key: "goal", time: when, color: "var(--bt-gain)", title: appCopy.closed.gainTitle(pct(b.takeProfitBps)), sub: appCopy.closed.gainSub }
      : { key: "date", time: when, color: "var(--bt-muted)", title: appCopy.closed.endedOnDate, sub: appCopy.closed.endedOnDateSub };
    events = [
      first,
      { key: "you", time: copy.closed.now, color: "var(--bt-signal)", title: appCopy.closed.youMade(pct(sum.youBps, { digits: sum.youBps % 100 ? 1 : 0 })), sub: appCopy.closed.youMadeSub(whole(p.deposit), whole(p.valueNow)), amount: usd(sum.youDelta, { cents: true, sign: true }), amountClass: "text-gain" },
    ];
  }

  const withdraw = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await wallet!.send([buildWithdrawCall(b.address)]);
      if (r.status !== "success") throw new Error("reverted");
      setHash(r.hash);
      refresh();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page testId="port">
      <TopBar right={<CloseButton to="/home" />} />
      <ArtBanner minHeight={200} className="mt-1.5 !rounded-[24px]">
        <div className="text-center">
          <span className="mx-auto mb-2 grid size-[30px] place-items-center rounded-full bg-gain text-white"><CheckCircle weight="fill" className="size-[18px]" /></span>
          <span className="block text-[13px] text-muted">{copy.closed.getBack}</span>
          <b className="bt-num block text-[34px] font-bold leading-[1.1] tracking-[-0.02em]" data-testid="port-back">{cents(p.valueNow)}</b>
          <s className="bt-num text-[12.5px] text-faint">{copy.closed.putIn(cents(p.deposit))}</s>
        </div>
      </ArtBanner>
      <h1 className="mt-5 text-[26px] font-bold tracking-[-0.01em]" data-testid="port-you">{copy.closed.title}</h1>
      <Timeline events={events} />
      {err && <p role="alert" className="mt-4 rounded-input bg-card px-3.5 py-2.5 text-[14px] text-loss">{err}</p>}
      {withdrawn ? (
        <div className="mt-6 flex flex-col items-center gap-2 text-center" data-testid="withdrawn">
          <p className="text-[15px]">{appCopy.closed.withdrawn(cents(p.valueNow))}</p>
          <Proof hash={hash} />
          <Button href="/explore" variant="secondary" className="mt-2">{appCopy.closed.next}</Button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-center text-[13px] text-muted">{appCopy.closed.noDeadline}</p>
          <StickyActions single>
            <Button onClick={withdraw} loading={busy} disabled={p.deposit === 0n} testId="withdraw">{copy.closed.cta(cents(p.valueNow))}</Button>
          </StickyActions>
          <div className="mt-4 hidden lg:block">
            <Button onClick={withdraw} loading={busy} disabled={p.deposit === 0n}>{copy.closed.cta(cents(p.valueNow))}</Button>
          </div>
        </>
      )}
    </Page>
  );
}
