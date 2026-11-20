"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { AmountDisplay, Keypad } from "@/components/amount-input";
import { Button } from "@/components/button";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { parseUsd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

const A = appCopy.add;

/** Demo only: test dollars from the faucet (production uses D1 "Pay with"). */
export default function AddDollars() {
  const { wallet, refresh } = useStore();
  const router = useRouter();
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [faucetOn, setFaucetOn] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/faucet").then((r) => r.json()).then((j) => setFaucetOn(Boolean(j.enabled))).catch(() => setFaucetOn(false));
  }, []);
  const amount = parseUsd(v);

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
      setErr(m === "you already have dollars" ? A.alreadyHave : m === "already sent" ? A.alreadySent : CHAIN_NAME === "arc" ? A.empty : A.error);
    } finally {
      setBusy(false);
    }
  };
  const circle = async () => {
    try { await navigator.clipboard.writeText(wallet!.address); } catch {}
    window.open("https://faucet.circle.com", "_blank", "noopener");
  };

  return (
    <Page testId="add">
      <TopBar left={<BackButton fallback="/home" />} title={A.title} />
      {CHAIN_NAME === "arc" ? (
        <div className="mt-6 flex flex-col gap-3">
          <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{A.noteArc}</p>
          {err && <p role="alert" className="text-[14px] text-loss">{err}</p>}
          {faucetOn !== false && <Button onClick={() => post({})} loading={busy || faucetOn === null} testId="confirm-add">{A.gift}</Button>}
          <Button variant={faucetOn === false ? "primary" : "secondary"} icon={<ArrowSquareOut weight="bold" />} onClick={circle} testId="circle-faucet">{faucetOn === false ? A.circle : A.circleMore}</Button>
          <p className="text-center text-[13px] text-muted">{A.circleHint}</p>
        </div>
      ) : (
        <>
          <AmountDisplay value={v} className="mt-[46px]" />
          <Keypad value={v} onChange={setV} max={10_000} />
          <p className="mt-4 text-center text-[13px] text-muted">{A.note}</p>
          {err && <p role="alert" className="mt-2 text-center text-[14px] text-loss">{err}</p>}
          <Button className="mb-6 mt-4" onClick={() => post({ amount: amount.toString() })} disabled={amount === 0n} loading={busy} testId="confirm-add">{A.cta(v || "0")}</Button>
        </>
      )}
    </Page>
  );
}
