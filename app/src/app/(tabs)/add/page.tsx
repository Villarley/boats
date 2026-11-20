"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { AmountDisplay, Keypad } from "@/components/amount-input";
import { Button } from "@/components/button";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { parseUsd, usd } from "@/lib/format";
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
  // Arc: the faucet hands out up to its drip (FAUCET_DRIP_USD); local mints up to $10,000.
  const [maxUsd, setMaxUsd] = useState(CHAIN_NAME === "arc" ? 5 : 10_000);
  useEffect(() => {
    fetch("/api/faucet").then((r) => r.json()).then((j) => {
      setFaucetOn(Boolean(j.enabled));
      if (j.drip) setMaxUsd(Number(j.drip) / 1e6);
    }).catch(() => setFaucetOn(false));
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
      {CHAIN_NAME === "arc" && (
        <>
          <Button className="mt-2.5" variant="secondary" icon={<ArrowSquareOut weight="bold" />} onClick={circle} testId="circle-faucet">{A.circleMore}</Button>
          <p className="mb-6 mt-2 text-center text-[13px] text-muted">{A.circleHint}</p>
        </>
      )}
    </Page>
  );
}
