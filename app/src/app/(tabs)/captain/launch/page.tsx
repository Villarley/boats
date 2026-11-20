"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockSimple, MagnifyingGlass, ScanSmiley } from "@phosphor-icons/react";
import { ASSET_NAMES, RISK_OF, buildCreateBoatCall, friendlyError, score, type AssetRisk } from "@boats/sdk";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { Chips, Segmented, StickyActions, Toggle } from "@/components/controls";
import { ListGroup, ListRow } from "@/components/list-group";
import { LabelRows } from "@/components/label-rows";
import { TokenIcon } from "@/components/token-icon";
import { useStore } from "@/lib/store";
import { deployment } from "@/lib/deployment";
import { worstCaseCrewLossBps } from "@boats/sdk";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const ASSETS = ["USYC", "EURC", "cirBTC"] as const;
type Asset = (typeof ASSETS)[number];
const ALL = ["USDC", ...ASSETS] as const;

// Factor names in plain language (the SDK's labels use contract words).
const [fLoss, fAssets, fMax, fTrack, fStake] = copy.createFund.factors;
const FACTOR_LABEL: Record<string, string> = { floor: fLoss, assets: fAssets, concentration: fMax, track: fTrack, stake: fStake };

/** Safety score ring (72px) + factor bars. */
function ScoreCard({ total, factors, sub }: { total: number; factors: { key: string; label: string; points: number; max: number }[]; sub: string }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="mt-3.5 flex items-center gap-3.5 rounded-card bg-white p-3.5 shadow-[0_0_0_1px_var(--bt-card-3),0_8px_20px_rgba(11,26,48,.06)]" data-testid="score">
      <div className="relative size-[72px] flex-none">
        <svg viewBox="0 0 72 72" className="size-[72px] -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bt-card-2)" strokeWidth="7" />
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bt-signal)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(c * total) / 100} ${c}`} />
        </svg>
        <b className="bt-num absolute inset-0 grid place-items-center text-[22px] font-bold">{total}</b>
      </div>
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] font-semibold">{copy.createFund.score}</b>
        <span className="mt-0.5 block text-[12px] text-muted">{sub}</span>
        <div className="mt-2 grid grid-cols-2 gap-x-2.5 gap-y-1.5">
          {factors.filter((f) => f.key !== "stake").map((f) => (
            <span key={f.key} className="flex flex-col gap-[3px] text-[11px] text-muted">
              <i className="block h-1 rounded-sm bg-card-3"><i className="block h-1 rounded-sm bg-signal" style={{ width: `${(f.points / f.max) * 100}%` }} /></i>
              {FACTOR_LABEL[f.key] ?? f.label} {f.points}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Rule({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 rounded-card bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2"><b className="text-[15px] font-semibold">{title}</b><span className="text-[12px] text-muted">{hint}</span></div>
      {children}
    </div>
  );
}

function Create() {
  const { wallet, refresh, setMode } = useStore();
  const router = useRouter();
  const type = useSearchParams().get("type") === "private" ? "private" : "public";
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [who, setWho] = useState<"private" | "public">(type);
  const [picked, setPicked] = useState<Record<Asset, boolean>>({ USYC: true, EURC: true, cirBTC: false });
  const [filter, setFilter] = useState<(typeof copy.createFund.filters)[number]>("All");
  const [q, setQ] = useState("");
  const [loss, setLoss] = useState(10);
  const [target, setTarget] = useState(15);
  const [maxShare, setMaxShare] = useState(40);
  const [stakePct, setStakePct] = useState(10);
  const [fee, setFee] = useState(20);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const chosen = ASSETS.filter((a) => picked[a]);
  const stakeFor = (p: number) => BigInt(Math.round((9_000 * p) / (100 - p))) * 1_000_000n;
  const scoreAt = (p: number) => score({
    crewTotal: 9_000_000_000n, captainStake: stakeFor(p), stopLossBps: loss * 100,
    assets: chosen.map((a) => ({ symbol: ASSET_NAMES[a]!, maxWeightBps: maxShare * 100, risk: (RISK_OF[a] ?? "medium") as AssetRisk })),
    track: [],
  });
  const s = useMemo(() => scoreAt(step < 4 ? 0 : stakePct), [chosen.join(), loss, maxShare, stakePct, step]); // eslint-disable-line react-hooks/exhaustive-deps
  const target10 = useMemo(() => scoreAt(10).total, [chosen.join(), loss, maxShare]); // eslint-disable-line react-hooks/exhaustive-deps
  const investorLoss = worstCaseCrewLossBps(9_000_000_000n, stakeFor(stakePct), loss * 100);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const r = await wallet!.send([buildCreateBoatCall(deployment.factory, {
        name: name.trim(), captain: wallet!.address, usdc: deployment.tokens.USDC, oracle: deployment.oracle, router: deployment.adapter,
        assets: chosen.map((a) => deployment.tokens[a]), maxWeightBps: chosen.map(() => maxShare * 100),
        stopLossBps: loss * 100, takeProfitBps: (target || 100) * 100, endTime: now + BigInt(days * 86_400), feeBps: fee * 100, vestingDuration: 3n * 86_400n,
      })]);
      if (r.status !== "success") throw new Error("reverted");
      await refresh();
      setMode("captain");
      router.push("/captain");
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const visible = ALL.filter((a) => (filter === "All" || appCopy.create.filterKind[filter]?.includes(a)) && (!q || `${a} ${ASSET_NAMES[a]}`.toLowerCase().includes(q.toLowerCase())));
  const canNext = step !== 1 || name.trim().length > 0;
  const next = () => (step < 4 ? setStep(step + 1) : create());
  const cta = step < 4 ? appCopy.manager.choosePathCta : wallet?.kind === "passkey" ? appCopy.create.cta : appCopy.create.ctaPlain;

  return (
    <Page testId="create">
      <TopBar left={<BackButton to={step > 1 ? () => setStep(step - 1) : true} fallback="/captain" />} title={copy.createFund.title} right={<CloseButton back to="/captain" />} />
      <div className="mt-1.5 grid grid-cols-4 gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((i) => <i key={i} className={`h-1 rounded-sm ${i <= step ? "bg-signal" : "bg-card-3"}`} />)}
      </div>
      <p className="mt-3.5 font-mono text-[12px] uppercase tracking-[.06em] text-muted">{copy.createFund.step(step)}</p>

      {step === 1 && (
        <>
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{appCopy.create.nameTitle}</h1>
          <label className="mt-4 block rounded-card bg-card px-4 py-3">
            <span className="text-[13px] font-medium text-muted">{appCopy.create.nameLabel}</span>
            <input className="mt-1 block w-full bg-transparent text-[20px] font-semibold outline-none placeholder:text-faint" value={name} placeholder={appCopy.create.namePlaceholder} autoFocus onChange={(e) => setName(e.target.value.slice(0, 32))} data-testid="fund-name" />
          </label>
          <Rule title={appCopy.create.typeLabel} hint="">
            <Segmented label={appCopy.create.typeLabel} onWhite value={who} onChange={setWho} options={[{ value: "private", label: appCopy.create.typePrivate }, { value: "public", label: appCopy.create.typePublic }]} />
          </Rule>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{copy.createFund.assetsTitle}</h1>
          <p className="mt-2 text-[15px] leading-[1.45] text-muted">{copy.createFund.assetsSub}</p>
          <label className="mt-4 flex h-11 items-center gap-2 rounded-input bg-card px-3.5 text-[15px]">
            <MagnifyingGlass weight="bold" className="size-[18px] text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={copy.createFund.search} aria-label={copy.createFund.search} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint" />
          </label>
          <Chips options={copy.createFund.filters} value={filter} onChange={setFilter} label={copy.createFund.search} />
          <ListGroup className="mt-3.5">
            {visible.map((a) => (
              <ListRow key={a} leading={<TokenIcon symbol={a} size={34} />} title={a} sub={appCopy.create.assetDesc[a]}
                trailing={a === "USDC"
                  ? <span className="flex items-center gap-1 text-[13px] text-muted"><LockSimple weight="fill" className="size-3.5" />{copy.createFund.always}</span>
                  : <Toggle on={picked[a]} label={a} onChange={(v) => setPicked((p) => ({ ...p, [a]: v }))} />} />
            ))}
          </ListGroup>
          <p className="mt-3 text-center text-[13px] text-muted">{appCopy.create.selected(chosen.length + 1, ALL.length)}</p>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{copy.createFund.limitsTitle}</h1>
          <Rule title={terms.lossLimit} hint={copy.createFund.lossLimitHint}>
            <Segmented label={terms.lossLimit} onWhite tone="loss" value={loss} onChange={setLoss} options={[5, 10, 15, 20].map((v) => ({ value: v, label: `−${v}%` }))} />
            <p className="mt-2 text-[12.5px] text-muted">{appCopy.create.lossConsequence("10%", "\u0000").split("\u0000")[0]}<b className="text-loss">{(worstCaseCrewLossBps(9_000_000_000n, stakeFor(10), loss * 100) / 100).toFixed(0)}%</b>{appCopy.create.lossConsequence("10%", "\u0000").split("\u0000")[1]}</p>
          </Rule>
          <Rule title={terms.profitTarget} hint={copy.createFund.profitHint}>
            <Segmented label={terms.profitTarget} onWhite tone="gain" value={target} onChange={setTarget} options={[...[10, 15, 25].map((v) => ({ value: v, label: `+${v}%` })), { value: 0, label: appCopy.create.none }]} />
          </Rule>
          <Rule title={copy.createFund.maxLabel} hint={copy.createFund.maxHint}>
            <Segmented label={copy.createFund.maxLabel} onWhite tone="indigo" value={maxShare} onChange={setMaxShare} options={[25, 40, 60, 100].map((v) => ({ value: v, label: `${v}%` }))} />
          </Rule>
          <ScoreCard total={s.total} factors={s.factors} sub={appCopy.create.scoreSub(target10)} />
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{appCopy.create.stakeTitle}</h1>
          <Rule title={appCopy.create.stakeLabel} hint={appCopy.create.stakeHint}>
            <Segmented label={appCopy.create.stakeLabel} onWhite value={stakePct} onChange={setStakePct} options={[5, 10, 15, 20].map((v) => ({ value: v, label: `${v}%` }))} />
            <p className="mt-2 text-[12.5px] text-muted">{appCopy.create.lossConsequence(`${stakePct}%`, "\u0000").split("\u0000")[0]}<b className="text-loss">{(investorLoss / 100).toFixed(0)}%</b>{appCopy.create.lossConsequence(`${stakePct}%`, "\u0000").split("\u0000")[1]}</p>
          </Rule>
          <Rule title={appCopy.create.feeLabel} hint={appCopy.create.feeHint}>
            <Segmented label={appCopy.create.feeLabel} onWhite value={fee} onChange={setFee} options={[10, 15, 20, 25].map((v) => ({ value: v, label: `${v}%` }))} />
          </Rule>
          <Rule title={appCopy.create.lengthLabel} hint={appCopy.create.lengthHint}>
            <Segmented label={appCopy.create.lengthLabel} onWhite value={days} onChange={setDays} options={[14, 30, 60, 90].map((v) => ({ value: v, label: appCopy.create.days(v) }))} />
          </Rule>
          <ScoreCard total={s.total} factors={s.factors} sub={appCopy.create.scoreSub(target10)} />
          <LabelRows rows={[
            { label: appCopy.create.reviewRows.name, value: name },
            { label: appCopy.create.reviewRows.holds, value: ["USDC", ...chosen].join(" · ") },
            { label: appCopy.create.reviewRows.limits, value: <><span className="text-loss">−{loss}%</span> · <span className="text-gain">{target ? `+${target}%` : appCopy.create.none}</span></> },
            { label: appCopy.create.reviewRows.fee, value: `${fee}%` },
          ]} />
          <p className="mt-2 text-center text-[13px] text-muted">{appCopy.create.after}</p>
        </>
      )}

      {err && <p role="alert" className="mt-3 rounded-input bg-card px-3.5 py-2.5 text-[14px] text-loss">{err}</p>}
      <StickyActions single aboveTabs>
        <Button onClick={next} disabled={!canNext} loading={busy} icon={step === 4 ? <ScanSmiley weight="bold" /> : undefined} testId={step === 4 ? "create-fund" : "next"}>{cta}</Button>
      </StickyActions>
      <div className="mt-5 hidden lg:block">
        <Button onClick={next} disabled={!canNext} loading={busy}>{cta}</Button>
      </div>
    </Page>
  );
}

export default function Launch() {
  return <Suspense><Create /></Suspense>;
}
