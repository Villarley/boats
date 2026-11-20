"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, CheckCircle, CreditCard, Flask, HourglassMedium } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { AmountDisplay, Keypad } from "@/components/amount-input";
import { Button } from "@/components/button";
import { PayMethodTiles } from "@/components/pay-method-tiles";
import { OnrampWidget, type OnrampOutcome } from "@/components/onramp-widget";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { parseUsd, usd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

const A = appCopy.add;
type Onramp = { enabled: boolean; sandbox: boolean; widget: string };

/**
 * Add dollars. On Arc: pay by card / Apple Pay / Google Pay through Circle's checkout (sandbox
 * with a test key), or take free test dollars from the faucet. Locally: only the faucet.
 */
export default function AddDollars() {
  const [onramp, setOnramp] = useState<Onramp | null>(null);
  const [how, setHow] = useState<"card" | "test" | null>(null);
  const [inCheckout, setInCheckout] = useState(false);
  useEffect(() => {
    if (CHAIN_NAME !== "arc") return setOnramp({ enabled: false, sandbox: true, widget: "" });
    fetch("/api/onramp").then((r) => r.json()).then(setOnramp).catch(() => setOnramp({ enabled: false, sandbox: true, widget: "" }));
  }, []);
  const method = how ?? (onramp?.enabled ? "card" : "test");

  return (
    <Page testId="add">
      <TopBar left={<BackButton fallback="/home" />} title={onramp?.enabled ? A.titleCard : A.title} />
      {onramp?.enabled && !inCheckout && (
        <>
          <p className="mt-4 text-[13px] font-semibold text-muted">{A.howLabel}</p>
          <PayMethodTiles
            label={A.howLabel}
            value={method}
            onChange={(id) => setHow(id as "card" | "test")}
            methods={[
              { id: "card", mark: <CreditCard weight="fill" className="size-[18px]" />, markClass: "bg-navy text-white", title: A.payCard, sub: A.payCardSub },
              { id: "test", mark: <Flask weight="fill" className="size-[18px]" />, markClass: "bg-signal-50 text-signal", title: A.payTest, sub: A.payTestSub },
            ]}
          />
        </>
      )}
      {onramp === null ? null : method === "card" && onramp.enabled ? <CardDeposit onramp={onramp} onCheckout={setInCheckout} /> : <TestDollars />}
    </Page>
  );
}

/** Card / Apple Pay / Google Pay through Circle's hosted checkout. */
function CardDeposit({ onramp, onCheckout }: { onramp: Onramp; onCheckout: (on: boolean) => void }) {
  const { wallet, cash, refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [session, setSession] = useState<unknown>(null);
  const [phase, setPhase] = useState<"amount" | "checkout" | "waiting" | "arrived">("amount");
  const base = useRef(0n);
  useEffect(() => onCheckout(phase === "checkout"), [phase, onCheckout]);

  const open = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/onramp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet!.address }) });
      if (!r.ok) throw new Error(r.status === 429 ? "busy" : "fail");
      setSession(await r.json());
      base.current = cash;
      setPhase("checkout");
    } catch (e) {
      setErr((e as Error).message === "busy" ? A.cardBusy : A.cardError);
    } finally {
      setBusy(false);
    }
  };

  const onEvent = (o: OnrampOutcome) => {
    if (o.kind === "submitted" || o.kind === "settled") setPhase((p) => (p === "arrived" ? p : "waiting"));
    else if (o.kind === "cancelled") { setPhase("amount"); setErr(A.cancelled); }
    else if (o.kind === "expired") { setPhase("amount"); setErr(A.expired); }
    else if (o.kind === "error") { setPhase("amount"); setErr(A.cardError); }
  };

  // Arrival is the balance going up on-chain (the widget's events are only hints).
  useEffect(() => {
    if (phase !== "waiting" && phase !== "checkout") return;
    if (cash > base.current) return setPhase("arrived");
    const t = setInterval(() => refresh(), 10_000);
    return () => clearInterval(t);
  }, [phase, cash, refresh]);

  if (phase === "arrived")
    return (
      <div className="mt-10 text-center" data-testid="onramp-arrived">
        <CheckCircle weight="fill" className="mx-auto size-14 text-gain" />
        <p className="mt-3 text-[22px] font-bold">{A.arrived(usd(cash - base.current, { cents: true }))}</p>
        <p className="mt-1 text-[15px] text-muted">{A.arrivedSub}</p>
        <Button className="mt-6" href="/explore">{A.explore}</Button>
        <Button className="mt-2.5" variant="secondary" href="/home">{A.goHome}</Button>
      </div>
    );

  if (phase === "waiting")
    return (
      <div className="mt-10 text-center" data-testid="onramp-waiting">
        <HourglassMedium weight="fill" className="mx-auto size-14 text-signal" />
        <p className="mt-3 text-[22px] font-bold">{A.onTheWay}</p>
        <p className="mx-auto mt-1 max-w-[340px] text-[15px] text-muted">{A.onTheWaySub}</p>
        <Button className="mt-6" variant="secondary" href="/home">{A.goHome}</Button>
      </div>
    );

  if (phase === "checkout")
    return (
      <>
        <OnrampWidget session={session} widget={onramp.widget} title={A.widgetTitle} onEvent={onEvent} />
        {onramp.sandbox && <p className="mt-3 rounded-input bg-signal-50 px-3.5 py-2.5 text-[13px] leading-[1.45] text-signal-deep" data-testid="onramp-sandbox-tips">{A.sandboxTips}</p>}
        <Button className="mt-3" variant="secondary" onClick={() => { setPhase("amount"); setSession(null); }} testId="onramp-back">{A.changeAmount}</Button>
      </>
    );

  return (
    <>
      <ul className="mt-6 flex flex-col gap-3 rounded-card bg-card p-4 text-[14.5px]" data-testid="onramp-steps">
        {A.cardSteps.map((t, i) => (
          <li key={t} className="flex items-start gap-3">
            <span className="bt-num grid size-6 shrink-0 place-items-center rounded-full bg-signal-50 text-[12.5px] font-bold text-signal">{i + 1}</span>
            <span className="pt-0.5 leading-[1.4]">{t}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-[13px] text-muted">{onramp.sandbox ? A.cardNoteSandbox : A.cardNoteLive}</p>
      {err && <p role="alert" className="mt-2 text-center text-[14px] text-loss">{err}</p>}
      <Button className="mt-4" icon={<CreditCard weight="fill" />} onClick={open} disabled={!wallet} loading={busy} testId="onramp-continue">{A.openCheckout}</Button>
    </>
  );
}

/** Test dollars: the faucet (mints locally, Circle's faucet or ours on Arc testnet). */
function TestDollars() {
  const { wallet, refresh } = useStore();
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [faucetOn, setFaucetOn] = useState<boolean | null>(null);
  // Arc: the faucet hands out up to its drip (FAUCET_DRIP_USD); local mints up to $10,000.
  const [maxUsd, setMaxUsd] = useState(CHAIN_NAME === "arc" ? 5 : 10_000);
  const [fixed, setFixed] = useState(false); // Circle's faucet: one fixed amount
  useEffect(() => {
    fetch("/api/faucet").then((r) => r.json()).then((j) => {
      setFaucetOn(Boolean(j.enabled));
      if (j.drip) setMaxUsd(Number(j.drip) / 1e6);
      if (j.fixed) setFixed(true);
    }).catch(() => setFaucetOn(false));
  }, []);
  const amount = parseUsd(v);
  if (CHAIN_NAME === "arc" && faucetOn === null) return null; // wait: Circle's faucet is a fixed amount, not the keypad

  const post = async (body: object) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet!.address, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "faucet");
      await refresh();
      router.push("/home");
    } catch (e) {
      const m = String((e as Error).message);
      setErr(m === "you already have dollars" ? A.alreadyHave : m === "already sent" ? A.alreadySent : m === "circle limit" ? A.limit : CHAIN_NAME === "arc" ? A.empty : A.error);
    } finally {
      setBusy(false);
    }
  };
  const circle = async () => {
    try { await navigator.clipboard.writeText(wallet!.address); } catch {}
    window.open("https://faucet.circle.com", "_blank", "noopener");
  };

  return (
    <>
      {fixed ? (
        <>
          <AmountDisplay value={String(maxUsd)} caption={A.fixed} className="mt-[46px]" />
          <p className="mt-6 text-center text-[13px] text-muted">{A.noteArc}</p>
          {err && <p role="alert" className="mt-2 text-center text-[14px] text-loss">{err}</p>}
          <Button className="mt-4" onClick={() => post({})} loading={busy} testId="confirm-add">{A.cta(String(maxUsd))}</Button>
        </>
      ) : (
        <>
          <AmountDisplay value={v} caption={A.upTo(usd(BigInt(Math.round(maxUsd * 1e6)), { cents: false }))} className="mt-[46px]" />
          <Keypad value={v} onChange={setV} max={maxUsd} quick={[
            { label: "MAX", value: String(maxUsd) },
            { label: "50%", value: String(Math.floor(maxUsd * 50) / 100) },
            { label: "25%", value: String(Math.floor(maxUsd * 25) / 100) },
            { label: A.clear, value: "" },
          ]} />
          <p className="mt-4 text-center text-[13px] text-muted">{CHAIN_NAME === "arc" ? A.noteArc : A.note}</p>
          {err && <p role="alert" className="mt-2 text-center text-[14px] text-loss">{err}</p>}
          <Button className="mt-4" onClick={() => post({ amount: amount.toString() })} disabled={amount === 0n || faucetOn === false} loading={busy} testId="confirm-add">{A.cta(v || "0")}</Button>
        </>
      )}
      {CHAIN_NAME === "arc" && (
        <>
          <Button className="mt-2.5" variant="secondary" icon={<ArrowSquareOut weight="bold" />} onClick={circle} testId="circle-faucet">{A.circleMore}</Button>
          <p className="mb-6 mt-2 text-center text-[13px] text-muted">{A.circleHint}</p>
        </>
      )}
    </>
  );
}
