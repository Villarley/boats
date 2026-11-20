"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ScanSmiley } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button, IconButton } from "@/components/button";
import { StickyActions } from "@/components/controls";
import { CushionCard } from "@/components/cushion-card";
import { FundChart, fundExampleSeries } from "@/components/fund-chart";
import { HoldingsBar } from "@/components/holdings-bar";
import { OddsCard } from "@/components/odds-card";
import { ManagerAvatar } from "@/components/manager-avatar";
import { SafetyMeter } from "@/components/safety-meter";
import { StatusDot } from "@/components/status-dot";
import { ListGroup, ListRow } from "@/components/list-group";
import { Sheet } from "@/components/sheet";
import { CaptainLog } from "@/components/captain-log";
import { BlockedSheet, useBlockedAlert } from "@/components/blocked-sheet";
import { InvestFacts } from "@/components/invest-review";
import { Proof } from "@/components/proof";
import { useBoat, useStore, type BoatView } from "@/lib/store";
import { useInvest } from "@/lib/invest";
import { boatScore } from "@/lib/boat";
import { fundHref, managerOf, riskOf, statusOf } from "@/lib/fund";
import { assetName, pct, usd } from "@/lib/format";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const dollars = (v: bigint) => Number(v) / 1e6;

/** Value the chart and limits are measured against. */
function baseOf(b: BoatView) {
  return b.startValue > 0n ? b.startValue : b.crewTotal + b.captainStake;
}

function holdingsOf(b: BoatView) {
  const total = b.holdings.reduce((s, h) => s + h.value, 0n);
  if (total > 0n) return b.holdings.map((h) => ({ name: assetName(h.token), share: Number((h.value * 10_000n) / total) / 10_000 }));
  // Nothing bought yet: show what it may hold (max shares), dollars for the rest.
  const assets = b.assets.map((a) => ({ name: assetName(a), share: (b.maxWeightBps[a.toLowerCase()] ?? 0) / 10_000 }));
  const rest = Math.max(0, 1 - assets.reduce((s, a) => s + a.share, 0));
  return [...assets, { name: assetName(b.usdc), share: rest }];
}

function managerShare(b: BoatView) {
  const atLimit = (Number(b.crewTotal + b.captainStake) * b.stopLossBps) / 10_000;
  return atLimit > 0 ? Math.min(1, Number(b.captainStake) / atLimit) : 0.9;
}

function Cushion({ b, headline }: { b: BoatView; headline?: "lg" | "md" }) {
  const m = managerOf(b);
  return <CushionCard manager={m.first} stake={usd(b.captainStake, { cents: false })} firstLoss="$1" lossLimitPct={pct(-b.stopLossBps)} managerShare={managerShare(b)} headline={headline} />;
}

function Chart({ b }: { b: BoatView }) {
  const [range, setRange] = useState("1D");
  const base = dollars(baseOf(b));
  const now = dollars(b.state === "Closed" ? b.finalValue : b.nav || baseOf(b));
  return (
    <FundChart
      values={fundExampleSeries(now, range)}
      lossLimit={base * (1 - b.stopLossBps / 10_000)}
      profitTarget={base * (1 + b.takeProfitBps / 10_000)}
      nowLabel={usd(BigInt(Math.round(now * 1e6)), { cents: false })}
      lossLabel={terms.lossLimit}
      profitLabel={terms.profitTarget}
      ranges={{ options: appCopy.fund.ranges, value: range, onChange: setRange }}
    />
  );
}

/** W2 right panel: amount, quick pills, worst case and rows, then Face ID — no separate review. */
function InvestPanel({ b }: { b: BoatView }) {
  const inv = useInvest(b);
  const [done, setDone] = useState(false);
  const router = useRouter();
  if (b.state !== "Open" && !done) {
    const p = b.position;
    return (
      <div className="flex flex-col gap-3.5 rounded-[24px] bg-card p-[22px]">
        <b className="text-[20px] font-semibold">{appCopy.invest.notOpenTitle}</b>
        <p className="text-[14px] text-muted">{appCopy.invest.notOpenBody}</p>
        {p.deposit > 0n && !p.withdrawn && (
          <div className="rounded-2xl bg-white p-4">
            <span className="text-[13px] text-muted">{appCopy.fund.yourShare}</span>
            <b className="bt-num block text-[28px] font-bold">{usd(p.valueNow, { cents: true })}</b>
            <span className="text-[13px] text-muted">{appCopy.fund.sinceIn(usd(p.deposit, { cents: true }))}</span>
          </div>
        )}
        {b.state === "Closed" && p.deposit > 0n && !p.withdrawn && <Button href={fundHref(b)}>{appCopy.fund.closedCta}</Button>}
      </div>
    );
  }
  if (done)
    return (
      <div className="flex flex-col gap-3.5 rounded-[24px] bg-card p-[22px]" data-testid="boarded">
        <b className="text-[20px] font-semibold">{appCopy.invest.doneTitle(b.name)}</b>
        <p className="text-[14px] text-muted">{appCopy.invest.doneBody}</p>
        <Proof hash={inv.hash} />
        <Button onClick={() => router.push("/home")}>{appCopy.invest.goHome}</Button>
      </div>
    );
  const pills = [
    { label: "$20", v: "20" }, { label: "$50", v: "50" }, { label: "$100", v: "100" }, { label: appCopy.invest.max, v: inv.quick(1) },
  ];
  return (
    <div className="flex flex-col gap-3.5 rounded-[24px] bg-card p-[22px]" data-testid="invest-panel">
      <b className="text-[20px] font-semibold">{copy.invest.title(b.name)}</b>
      <label className="flex flex-col gap-1 rounded-2xl bg-white p-4">
        <span className="text-[13px] text-muted">{appCopy.invest.youInvest}</span>
        <span className="bt-num flex items-baseline text-[40px] font-bold tracking-[-0.02em]">
          <span className="text-signal">$</span>
          <input
            value={inv.value}
            onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(v)) inv.setValue(v); }}
            inputMode="decimal" placeholder="0" aria-label={appCopy.invest.amountLabel}
            className="w-full min-w-0 bg-transparent outline-none placeholder:text-faint" data-testid="web-amount"
          />
        </span>
        <span className="text-[13px] text-muted">{appCopy.invest.sharesAvailable(String(Math.floor(dollars(inv.amount))), usd(inv.cash, { cents: true }))}</span>
      </label>
      <div className="grid grid-cols-4 gap-2">
        {pills.map((p) => (
          <button key={p.label} type="button" onClick={() => inv.setValue(p.v)} className="grid h-9 place-items-center rounded-full bg-white text-[13px] font-semibold text-signal">{p.label}</button>
        ))}
      </div>
      {inv.amount > 0n && <InvestFacts b={b} amount={inv.amount} worst={inv.worst} compact />}
      {inv.short && inv.amount > 0n && <p className="text-[13px] text-loss">{appCopy.invest.youHave(usd(inv.cash, { cents: true }))}</p>}
      {inv.err && <p role="alert" className="text-[14px] text-loss">{inv.err}</p>}
      <Button icon={<ScanSmiley weight="bold" />} loading={inv.busy} disabled={!inv.amount || inv.short} onClick={async () => { if (await inv.confirm()) setDone(true); }} testId="web-confirm">
        {inv.passkey ? copy.invest.cta : appCopy.invest.cta}
      </Button>
    </div>
  );
}

export default function FundPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  const { loading, error } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const blocked = useBlockedAlert();

  if (!b && !loading && !error)
    return (
      <Page>
        <TopBar left={<BackButton to="/explore" />} />
        <div className="mt-6 rounded-card bg-card p-4">
          <b className="block text-[16px] font-semibold">{appCopy.fund.notFoundTitle}</b>
          <p className="mt-1 text-[14px] text-muted">{appCopy.fund.notFoundBody}</p>
          <div className="mt-3"><Button href="/explore" size="dense">{appCopy.fund.seeAll}</Button></div>
        </div>
      </Page>
    );
  if (!b) return <Page><TopBar left={<BackButton to="/explore" />} /><div className="mt-6 h-64 animate-pulse rounded-card bg-card" /></Page>;

  const m = managerOf(b);
  const s = boatScore(b).total;
  const status = statusOf(b);
  const value = b.state === "Closed" ? b.finalValue : b.nav || b.crewTotal + b.captainStake;
  const p = b.position;
  const onBoard = p.deposit > 0n && !p.withdrawn;
  const statusLine = <StatusDot status={status} label={appCopy.fund.statusRisk(terms.status[status], terms.risk[riskOf(b)])} className="mt-1 text-[14px] font-normal text-muted" />;
  const canHoldTreasuries = b.assets.some((a) => assetName(a) === "US Treasuries");

  const primary =
    b.state === "Open" ? <Button href={`/boat/${b.address}/board`} testId="board-cta">{terms.invest}</Button>
    : b.state === "Closed" && onBoard ? <Button href={fundHref(b)} testId="go-port">{appCopy.fund.closedCta}</Button>
    : <Button disabled>{appCopy.fund.joinClosed}</Button>;

  return (
    <>
      {/* ---------- mobile: F1 ---------- */}
      <Page className="lg:hidden" testId="fund">
        <TopBar
          left={<BackButton to="/explore" />}
          title={<><ManagerAvatar manager={m} size="sm" />{b.name}</>}
          right={<IconButton href="/activity" label={appCopy.nav.notifications}><Bell weight="fill" /></IconButton>}
        />
        <p className="mt-[18px] text-[16px] text-muted">{copy.fund.value}</p>
        <p className="bt-num mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.01em]" data-testid="fund-value">{usd(value, { cents: true })}</p>
        {statusLine}
        <div className="-mx-5 mt-[18px]"><div className="px-5"><Chart b={b} /></div></div>
        {onBoard && (
          <ListGroup className="mt-3.5" testId="your-share">
            <ListRow title={appCopy.fund.yourShare} sub={appCopy.fund.sinceIn(usd(p.deposit, { cents: true }))}
              trailing={<div><b className="bt-num block text-[16px] font-semibold">{usd(p.valueNow, { cents: true })}</b><span className={`bt-num block text-[13px] ${p.valueNow < p.deposit ? "text-loss" : "text-gain"}`}>{usd(p.valueNow - p.deposit, { cents: true, sign: true })}</span></div>} />
          </ListGroup>
        )}
        {b.captainStake > 0n ? <div className="mt-3.5"><Cushion b={b} /></div> : <p className="mt-3.5 rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{appCopy.fund.stakeNone}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <HoldingsBar slices={holdingsOf(b)} />
          {canHoldTreasuries ? <OddsCard /> : <div />}
        </div>
        <StickyActions>
          <Button variant="secondary" onClick={() => setLogOpen(true)} testId="manager-activity">{copy.fund.managerActivity}</Button>
          {primary}
        </StickyActions>
      </Page>

      {/* ---------- web ≥1024: W2 ---------- */}
      <main className="hidden flex-col pl-4 pr-8 pt-6 lg:flex">
        <div className="flex h-11 items-center gap-3">
          <BackButton to="/explore" />
          <ManagerAvatar manager={m} size="sm" />
          <h1 className="text-[22px] font-semibold">{b.name}</h1>
          <SafetyMeter score={s} />
          <span className="flex-1" />
          <IconButton href="/activity" label={appCopy.nav.notifications}><Bell weight="fill" /></IconButton>
        </div>
        <div className="mt-[22px] grid max-w-[1280px] grid-cols-[1fr_360px] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-[20px] bg-card p-5">
              <p className="text-[13px] text-muted">{copy.fund.value}</p>
              <p className="bt-num text-[40px] font-bold leading-[1.15] tracking-[-0.01em]">{usd(value, { cents: true })}</p>
              {statusLine}
              <div className="mt-2"><Chart b={b} /></div>
            </div>
            <div className="grid grid-cols-[1.15fr_.95fr_1fr] gap-4">
              {b.captainStake > 0n ? <Cushion b={b} headline="md" /> : <p className="rounded-hero bg-card p-4 text-[14px] text-muted">{appCopy.fund.stakeNone}</p>}
              <HoldingsBar slices={holdingsOf(b)} />
              {canHoldTreasuries ? <OddsCard hint={copy.fund.oddsHint.replace("the manager", m.first)} /> : <div />}
            </div>
            <div>
              <p className="mb-2.5 text-[18px] font-semibold">{copy.fund.managerActivity}</p>
              <CaptainLog boat={b.address} />
            </div>
          </div>
          <InvestPanel b={b} />
        </div>
      </main>

      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title={copy.fund.managerActivity}>
        <div className="mt-4"><CaptainLog boat={b.address} /></div>
      </Sheet>
      <BlockedSheet event={blocked.event} onClose={blocked.dismiss} />
    </>
  );
}
