"use client";
import { useState } from "react";
import { ArrowDownRight, ArrowsDownUp, Coins, Gauge, Play, RocketLaunch } from "@phosphor-icons/react";
import { buildClaimCaptainCall, buildSailCall, buildStakeCalls, friendlyError } from "@boats/sdk";
import { Page } from "@/components/top-bar";
import { Button } from "@/components/button";
import { HelmIcon } from "@/components/brand";
import { IconTile, ListGroup, ListRow, TitleRow } from "@/components/list-group";
import { LossStack } from "@/components/loss-stack";
import { ManagerAvatar } from "@/components/manager-avatar";
import { SafetyMeter } from "@/components/safety-meter";
import { StatusDot } from "@/components/status-dot";
import { Sheet } from "@/components/sheet";
import { CaptainLog } from "@/components/captain-log";
import { UserAvatar } from "@/components/user-avatar";
import { WebTopBar } from "@/components/web-top-bar";
import { Proof } from "@/components/proof";
import { useStore, type BoatView } from "@/lib/store";
import { boatScore } from "@/lib/boat";
import { useDisplayName } from "@/lib/names";
import { managerOf, statusOf } from "@/lib/fund";
import { parseUsd, pct, usd } from "@/lib/format";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { NotificationBell } from "@/components/notification-bell";
import { FundInside } from "@/components/fund-inside";

const amt = (v: bigint) => usd(v, { cents: false });

/** Actions for one fund: put in your money, start, trade, check limits, claim. */
function ManageSheet({ b, onClose }: { b: BoatView; onClose: () => void }) {
  const { wallet, refresh, cash } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);
  const run = async (key: string, label: string, fn: () => Promise<{ hash: string; status: string }>) => {
    setBusy(key);
    setMsg(null);
    try {
      const r = await fn();
      if (r.status !== "success") throw new Error("reverted");
      setMsg({ ok: true, text: appCopy.manager.done(label), hash: r.hash });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: friendlyError(e) });
    } finally {
      setBusy(null);
    }
  };
  // ~10% of the fund, capped by what the manager holds (keeps a little for network fees on Arc).
  const want = b.crewTotal > 0n ? b.crewTotal / 9n : 1_000_000_000n;
  const spendable = cash > 200_000n ? cash - 200_000n : 0n;
  const suggested = want < spendable ? want : spendable;
  // The manager types how much of their own money goes in (suggested: ~10% of the fund, capped by their dollars).
  const [stakeV, setStakeV] = useState<string | null>(null);
  const typed = stakeV ?? (suggested > 0n && b.captainStake === 0n ? String(Number(suggested) / 1e6) : "");
  const stake = parseUsd(typed);
  const tooMuch = stake > spendable;
  const check = async () => {
    setBusy("check");
    try {
      const r = await fetch("/api/keeper", { method: "POST" });
      if (!r.ok) return setMsg({ ok: true, text: appCopy.manager.checkAuto });
      const j = await r.json();
      const mine = (j.results ?? []).find((x: { boat: string }) => x.boat.toLowerCase() === b.address.toLowerCase());
      setMsg({ ok: true, text: mine?.message ?? appCopy.manager.checkAuto, hash: mine?.txHash });
      refresh();
    } catch {
      setMsg({ ok: false, text: appCopy.manager.keeperDown });
    } finally {
      setBusy(null);
    }
  };
  const status = statusOf(b);
  return (
    <Sheet open onClose={onClose} title={b.name} testId={`bridge-${b.name}`}>
      <div className="mt-2"><StatusDot status={status} className="text-muted" /></div>
      <FundInside b={b} />
      <div className="mt-5 flex flex-col gap-2.5">
        {b.state === "Open" && b.captainStake > 0n && (
          <>
            <p className="text-[14px] text-muted">{b.crewTotal === 0n ? appCopy.manager.startNeedsInvestors : appCopy.manager.startHint}</p>
            <Button icon={<Play weight="fill" />} disabled={b.crewTotal === 0n} loading={busy === "start"} onClick={() => run("start", appCopy.manager.start, () => wallet!.send([buildSailCall(b.address)]))} testId="sail">{appCopy.manager.start}</Button>
          </>
        )}
        {b.state === "Open" && (
          <>
            {b.captainStake === 0n ? <p className="text-[14px] text-muted">{appCopy.manager.stakeHint}</p> : <p className="mt-2 text-[15px] font-semibold">{appCopy.manager.addMoreTitle(amt(b.captainStake))}</p>}
            <label className="flex items-center gap-2 rounded-card bg-card px-4 py-3">
              <span className="flex-1">
                <span className="block text-[13px] font-medium text-muted">{appCopy.manager.stakeLabel}</span>
                <span className="mt-0.5 flex items-baseline gap-1 text-[24px] font-semibold">
                  <span className="text-muted">$</span>
                  <input value={typed} inputMode="decimal" placeholder="0" aria-label={appCopy.manager.stakeLabel} data-testid="stake-amount"
                    onChange={(e) => { const x = e.target.value.replace(/[^\d.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(x)) setStakeV(x); }}
                    className="bt-num w-full min-w-0 bg-transparent outline-none placeholder:text-faint" />
                </span>
              </span>
              <button type="button" onClick={() => setStakeV(String(Number(spendable) / 1e6))} className="h-8 rounded-full bg-white px-3 text-[13px] font-semibold text-signal">MAX</button>
            </label>
            <p className={`-mt-1 text-[13px] ${tooMuch ? "text-loss" : "text-muted"}`}>{appCopy.manager.stakeHave(amt(cash))}</p>
            <Button icon={<Coins weight="fill" />} variant={b.captainStake > 0n ? "secondary" : "primary"} disabled={stake === 0n || tooMuch} loading={busy === "stake"} onClick={() => run("stake", appCopy.manager.stake(amt(stake)), () => wallet!.send(buildStakeCalls(b.address, b.usdc, stake)))} testId="stake">{b.captainStake > 0n ? appCopy.manager.addMore(amt(stake)) : appCopy.manager.stake(amt(stake))}</Button>
          </>
        )}
        {b.state === "Sailing" && <Button icon={<ArrowsDownUp weight="bold" />} href={`/captain/trade?boat=${b.address}`} testId="trade">{appCopy.manager.trade}</Button>}
        {(b.state === "Sailing" || b.state === "Returning") && <Button variant="secondary" icon={<Gauge weight="fill" />} loading={busy === "check"} onClick={check} testId="check-now">{appCopy.manager.check}</Button>}
        {b.state === "Closed" && <Button icon={<Coins weight="fill" />} loading={busy === "claim"} onClick={() => run("claim", appCopy.manager.claim, () => wallet!.send([buildClaimCaptainCall(b.address)]))} testId="claim">{appCopy.manager.claim}</Button>}
        {msg && <p role="status" className={`rounded-input bg-card px-3.5 py-2.5 text-[14px] ${msg.ok ? "" : "text-loss"}`}>{msg.text} <Proof hash={msg.hash} /></p>}
      </div>
      <p className="mb-2.5 mt-5 text-[16px] font-semibold">{appCopy.manager.log}</p>
      <CaptainLog boat={b.address} />
    </Sheet>
  );
}

/** K1 Dashboard: your own money at risk first, then your funds and your rules. */
export default function Dashboard() {
  const { boats, captainOf, wallet } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const mine = boats.filter((b) => captainOf.some((a) => a.toLowerCase() === b.address.toLowerCase()));
  const atRisk = mine.filter((b) => b.state !== "Closed").reduce((s, b) => s + b.captainStake, 0n);
  const investors = mine.filter((b) => b.state !== "Closed").reduce((s, b) => s + b.crewTotal, 0n);
  const name = useDisplayName(wallet?.address);
  const first = mine.find((b) => b.state !== "Closed") ?? mine[0];
  const openFund = mine.find((b) => b.address === open);

  const top = (
    <>
      <p className="mt-[22px] text-[16px] text-muted lg:mt-0">{copy.manager.atRisk}</p>
      <p className="bt-num mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.01em]" data-testid="at-risk">{usd(atRisk, { cents: true })}</p>
      <LossStack you={atRisk} investors={investors} youLabel={amt(atRisk)} investorsLabel={amt(investors)} />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button size="dense" href={first?.state === "Sailing" ? `/captain/trade?boat=${first.address}` : "/captain/trade"} icon={<ArrowsDownUp weight="bold" />}>{copy.manager.trade}</Button>
        <Button size="dense" variant="secondary" href="/captain/launch" icon={<RocketLaunch weight="fill" />}>{copy.manager.create}</Button>
      </div>
    </>
  );

  const funds = mine.length ? (
    <ListGroup testId="manager-funds">
      {mine.map((b) => (
        <ListRow
          key={b.address}
          onClick={() => setOpen(b.address)}
          testId={`fund-${b.name}`}
          leading={<ManagerAvatar manager={managerOf(b)} />}
          title={b.name}
          sub={<StatusDot status={statusOf(b)} label={`${terms.status[statusOf(b)]} · ${appCopy.manager.fromInvestors(amt(b.crewTotal))}`} className="whitespace-normal font-normal" />}
          trailing={<div className="flex flex-col items-end gap-0.5"><b className="bt-num text-[16px] font-semibold">{amt(b.nav || b.crewTotal + b.captainStake)}</b><SafetyMeter score={boatScore(b).total} /></div>}
        />
      ))}
    </ListGroup>
  ) : (
    <div className="rounded-card bg-card p-4">
      <p className="text-[14px] text-muted">{appCopy.manager.noFunds}</p>
      <div className="mt-3"><Button href="/captain/launch" size="dense">{appCopy.manager.createFirst}</Button></div>
    </div>
  );

  const rules = first && (
    <ListGroup>
      <ListRow dense leading={<IconTile color="loss"><ArrowDownRight weight="bold" /></IconTile>} title={appCopy.manager.rulesRow}
        trailing={<span className="bt-num text-[15px] font-semibold"><span className="text-loss">{pct(-first.stopLossBps)}</span>&nbsp; <span className="text-gain">+{pct(first.takeProfitBps)}</span></span>} />
      <ListRow dense leading={<IconTile color="teal"><Coins weight="fill" /></IconTile>} title={copy.manager.fee}
        sub={copy.manager.feeSub.replace("20%", pct(first.feeBps))} />
    </ListGroup>
  );

  return (
    <>
      <Page className="lg:hidden" testId="dashboard">
        <div className="flex h-11 items-center justify-between">
          <UserAvatar name={name} manager />
          <div className="flex items-center gap-2">
            <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-card-2 px-3 text-[13px] font-semibold"><HelmIcon size={14} />{appCopy.manager.chip}</span>
            <NotificationBell />
          </div>
        </div>
        {top}
        <TitleRow title={appCopy.manager.yourFunds} />
        {funds}
        {rules && <><TitleRow title={copy.manager.rules} />{rules}</>}
      </Page>

      <main className="hidden flex-col pl-4 pr-8 pt-6 lg:flex">
        <WebTopBar title={copy.managerTabs.dashboard} />
        <div className="mt-[22px] grid max-w-[1280px] grid-cols-[1fr_360px] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-[20px] bg-card p-5">{top}</div>
            <div><p className="mb-2.5 text-[18px] font-semibold">{appCopy.manager.yourFunds}</p>{funds}</div>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {rules && <div><p className="mb-2.5 text-[18px] font-semibold">{copy.manager.rules}</p>{rules}</div>}
            <div><p className="mb-2.5 text-[18px] font-semibold">{appCopy.manager.log}</p><CaptainLog limit={4} /></div>
          </div>
        </div>
      </main>
      {openFund && <ManageSheet b={openFund} onClose={() => setOpen(null)} />}
    </>
  );
}
