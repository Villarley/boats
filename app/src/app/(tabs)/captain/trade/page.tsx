"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowsDownUp, CaretDown, CheckCircle, LockSimple, ScanSmiley, X } from "@phosphor-icons/react";
import { buildSwapCall, checkTrade, friendlyError } from "@boats/sdk";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { Chips, StickyActions } from "@/components/controls";
import { IconTile, ListGroup, ListRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { TokenIcon } from "@/components/token-icon";
import { Sheet } from "@/components/sheet";
import { LabelRows } from "@/components/label-rows";
import { Proof } from "@/components/proof";
import { useStore } from "@/lib/store";
import { publicClient } from "@/lib/client";
import { deployment, symbolOf } from "@/lib/deployment";
import { managerOf } from "@/lib/fund";
import { assetName, parseUsd, pct, usd } from "@/lib/format";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { useUnlock } from "@/lib/unlock";

const priceAbi = [{ type: "function", name: "getPrice", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const;
const num = (v: bigint) => (Number(v) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 });

function TokenPill({ value, options, onChange, testId, label }: { value: string; options: string[]; onChange: (v: string) => void; testId: string; label: string }) {
  return (
    <label className="relative flex h-[38px] items-center gap-2 rounded-full bg-white pl-[5px] pr-3 text-[15px] font-semibold">
      <TokenIcon symbol={symbolOf(value)} size={28} />
      {symbolOf(value)}
      <CaretDown weight="bold" className="size-3.5 text-muted" />
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" data-testid={testId}>
        {options.map((t) => <option key={t} value={t}>{symbolOf(t)}</option>)}
      </select>
    </label>
  );
}

function TradeScreen() {
  const params = useSearchParams();
  const { boats, captainOf, wallet, refresh } = useStore();
  const running = boats.filter((b) => b.state === "Sailing" && captainOf.some((a) => a.toLowerCase() === b.address.toLowerCase()));
  const [fundAddr, setFundAddr] = useState<string | null>(params.get("boat"));
  const b = running.find((x) => x.address.toLowerCase() === (fundAddr ?? "").toLowerCase()) ?? running[0];
  // Nothing running yet: the newest fund of theirs that is still open to join, if any.
  const waiting = boats.filter((x) => x.state === "Open" && captainOf.some((a) => a.toLowerCase() === x.address.toLowerCase())).at(-1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [v, setV] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);
  const [why, setWhy] = useState("");
  const unlock = useUnlock();

  useEffect(() => {
    if (b && !from) { setFrom(b.usdc); setTo(b.assets[0]!); }
  }, [b, from]);

  const amount = parseUsd(v);
  const check = useMemo(() => (b && from && to ? checkTrade(b.holdings.map((h) => ({ ...h, symbol: assetName(h.token) })), b.usdc, from as `0x${string}`, to as `0x${string}`, amount, 10) : null), [b, from, to, amount]);

  if (!b)
    return (
      <Page>
        <TopBar left={<BackButton fallback="/captain" />} title={copy.manager.trade} />
        {waiting ? (
          // A fund of theirs is still open to join: say what's missing before it can trade.
          <div className="mt-6 rounded-card bg-card p-4" data-testid="trade-waiting">
            <b className="block text-[16px] font-semibold">{appCopy.manager.tradeWaitTitle(waiting.name)}</b>
            <p className="mt-1 text-[14px] leading-[1.45] text-muted">
              {waiting.crewTotal === 0n ? appCopy.manager.tradeWaitNoInvestors : appCopy.manager.tradeWaitStart}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {waiting.crewTotal === 0n && <Button href="/invite" size="dense" block={false}>{appCopy.actions.inviteInvestors.title}</Button>}
              <Button href="/captain" size="dense" variant={waiting.crewTotal === 0n ? "secondary" : "primary"} block={false}>{appCopy.manager.tradeWaitDashboard}</Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{appCopy.manager.tradeNone}</p>
        )}
      </Page>
    );

  const tokens = [b.usdc, ...b.assets];
  const holding = (t: string) => b.holdings.find((h) => h.token.toLowerCase() === t.toLowerCase());
  const toUsdc = to.toLowerCase() === b.usdc.toLowerCase();
  const maxBps = b.maxWeightBps[to.toLowerCase()] ?? 0;
  const navNow = b.holdings.reduce((x, h) => x + h.value, 0n);
  const nowBps = navNow > 0n ? Number(((holding(to)?.value ?? 0n) * 10_000n) / navNow) : 0;
  const after = (amount > 0n && check?.weightAfterBps) || nowBps;
  const broken = Boolean(amount > 0n && check && !check.ok);
  const maxAllowed = check && !check.ok ? check.maxAllowed : undefined;
  const ruleMsg = check && !check.ok ? check.message : "";

  const send = async (anyway = false) => {
    setBusy(true);
    setRes(null);
    try {
      let amountIn = amount;
      if (from.toLowerCase() !== b.usdc.toLowerCase()) {
        const p = await publicClient().readContract({ address: deployment.oracle, abi: priceAbi, functionName: "getPrice", args: [from as `0x${string}`] });
        amountIn = (amount * 10n ** 18n) / p;
      }
      const r = await wallet!.send([buildSwapCall(b.address, from as `0x${string}`, to as `0x${string}`, amountIn, 0n)]);
      if (r.status !== "success") throw new Error("reverted");
      setRes({ ok: true, text: appCopy.manager.tradeDone(usd(amount), assetName(from), assetName(to)), hash: r.hash });
      // The reason shows in investors' Activity under "Why … did it".
      if (why.trim()) {
        fetch("/api/captain-log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ at: new Date().toISOString(), boat: b.address, kind: "trade", message: why.trim(), txHash: r.hash }) }).catch(() => {});
        setWhy("");
      }
      setV("");
      refresh();
    } catch (e) {
      setRes({ ok: false, text: friendlyError(e) });
      if (anyway) {
        fetch("/api/captain-log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ at: new Date().toISOString(), boat: b.address, kind: "blocked", message: appCopy.manager.blockedLog(usd(amount), assetName(to), ruleMsg) }) }).catch(() => {});
      }
    } finally {
      setBusy(false);
      setReview(false);
    }
  };

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <Page testId="trade-screen">
      <TopBar left={<BackButton fallback="/captain" />} title={<><ManagerAvatar manager={managerOf(b)} size="sm" />{copy.manager.tradeTitle(b.name)}</>} right={<CloseButton back to="/captain" />} />
      {running.length > 1 && <Chips options={running.map((r) => r.name)} value={b.name} onChange={(n) => { setFundAddr(running.find((r) => r.name === n)!.address); setFrom(""); }} label={copy.manager.trade} />}

      <div className="relative mt-[18px] flex flex-col gap-1.5">
        <div className="rounded-card bg-card px-4 pb-4 pt-3.5">
          <div className="flex justify-between text-[13px] font-medium text-muted"><span>{copy.manager.sell}</span><span className="bt-num">{appCopy.manager.inFund(num(holding(from)?.value ?? 0n))}</span></div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <TokenPill value={from} options={tokens} onChange={setFrom} testId="from" label={copy.manager.sell} />
            <input
              value={v} inputMode="decimal" placeholder="0" aria-label={copy.manager.sell} data-testid="amount"
              onChange={(e) => { const x = e.target.value.replace(/[^\d.]/g, ""); if (/^\d*\.?\d{0,2}$/.test(x)) setV(x); }}
              className="bt-num w-full min-w-0 bg-transparent text-right text-[28px] font-semibold tracking-[-0.01em] outline-none placeholder:text-faint"
            />
          </div>
        </div>
        <button type="button" onClick={swap} aria-label={appCopy.manager.switchSides} className="absolute left-1/2 top-1/2 z-[1] grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-card text-ink shadow-[0_0_0_5px_#fff]">
          <ArrowsDownUp weight="bold" className="size-[17px]" />
        </button>
        <div className="rounded-card bg-card px-4 pb-4 pt-3.5">
          <div className="flex justify-between text-[13px] font-medium text-muted"><span>{copy.manager.buy}</span><span>{assetName(to)}</span></div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <TokenPill value={to} options={tokens} onChange={setTo} testId="to" label={copy.manager.buy} />
            <span className="bt-num text-[28px] font-semibold tracking-[-0.01em] text-ink">≈ {v ? num(amount) : "0"}</span>
          </div>
        </div>
      </div>

      {!toUsdc && (
        <div className="mt-3.5 rounded-card bg-card p-4" data-testid="weight">
          <div className="flex items-baseline justify-between gap-2">
            <b className="text-[15px] font-semibold">{copy.manager.weightAfter(symbolOf(to))}</b>
            <span className="bt-num text-[13px] text-muted">{appCopy.manager.ofMax(pct(after), pct(maxBps))}</span>
          </div>
          <div className="relative mt-2.5 h-2 rounded bg-card-3" aria-hidden>
            <i className={`absolute inset-y-0 left-0 rounded ${broken ? "bg-loss" : "bg-signal"}`} style={{ width: `${Math.min(100, after / 100)}%` }} />
            <b className="absolute -top-1 h-4 w-0.5 rounded-[1px] bg-loss" style={{ left: `${maxBps / 100}%` }} />
          </div>
          <p className="mt-2.5 text-[13.5px] text-muted">{copy.manager.weightHint}</p>
        </div>
      )}

      <ListGroup className="mt-3.5">
        {broken ? (
          <ListRow dense leading={<IconTile color="loss"><X weight="bold" /></IconTile>} title={appCopy.manager.breaks} sub={<span className="whitespace-normal" data-testid="rule">{ruleMsg}</span>} />
        ) : (
          <ListRow dense leading={<IconTile color="gain"><CheckCircle weight="fill" /></IconTile>} title={toUsdc ? appCopy.manager.toDollars : appCopy.manager.allowed(symbolOf(to))} />
        )}
        <ListRow dense leading={<IconTile color="signal"><LockSimple weight="fill" /></IconTile>} title={copy.manager.noWithdraw} sub={copy.manager.noWithdrawSub} />
      </ListGroup>

      {res && (
        <p role="status" className={`mt-3.5 rounded-input bg-card px-3.5 py-3 text-[14px] ${res.ok ? "" : "text-loss"}`}>
          <span data-testid="trade-result">{res.text}</span> <Proof hash={res.hash} />
        </p>
      )}

      {broken && maxAllowed !== undefined && maxAllowed > 0n ? (
        <StickyActions aboveTabs>
          <Button variant="secondary" onClick={() => setReview(true)} testId="trade">{copy.manager.reviewTrade}</Button>
          <Button onClick={() => setV(String(Number(maxAllowed) / 1e6))} testId="use-max">{appCopy.manager.useMax(usd(maxAllowed))}</Button>
        </StickyActions>
      ) : (
        <StickyActions single aboveTabs>
          <Button onClick={() => setReview(true)} disabled={amount === 0n} testId="trade">{copy.manager.reviewTrade}</Button>
        </StickyActions>
      )}
      <div className="mt-5 hidden lg:block">
        <Button onClick={() => setReview(true)} disabled={amount === 0n}>{copy.manager.reviewTrade}</Button>
      </div>

      <Sheet open={review} onClose={() => setReview(false)} title={copy.manager.reviewTrade}>
        <LabelRows rows={[
          { label: copy.manager.sell, value: `${num(amount)} ${symbolOf(from)}` },
          { label: copy.manager.buy, value: `≈ ${num(amount)} ${symbolOf(to)}` },
          ...(toUsdc ? [] : [{ label: symbolOf(to), note: appCopy.manager.ofMax(pct(after), pct(maxBps)), value: broken ? appCopy.manager.breaks : appCopy.manager.inside, valueClass: broken ? "text-loss" : "text-gain" }]),
        ]} />
        {!broken && (
          <label className="mt-4 block rounded-card bg-card px-4 py-3">
            <span className="text-[13px] font-medium text-muted">{appCopy.manager.whyLabel}</span>
            <textarea value={why} onChange={(e) => setWhy(e.target.value.slice(0, 200))} rows={2} placeholder={appCopy.manager.whyPlaceholder} data-testid="trade-why"
              className="mt-1 block w-full resize-none bg-transparent text-[15px] leading-[1.4] outline-none placeholder:text-faint" />
          </label>
        )}
        <Button className="mt-4" icon={<ScanSmiley weight="bold" />} loading={busy} disabled={broken} onClick={() => send()} testId="send-trade">{unlock.cta(appCopy.manager.tradeCta)}</Button>
        {broken && <Button className="mt-2.5" variant="outline" disabled={busy} onClick={() => send(true)} testId="send-anyway">{appCopy.manager.sendAnyway}</Button>}
      </Sheet>
    </Page>
  );
}

export default function TradePage() {
  return <Suspense><TradeScreen /></Suspense>;
}
