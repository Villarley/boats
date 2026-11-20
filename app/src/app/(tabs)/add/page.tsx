"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, ExternalLink, Zap } from "lucide-react";
import { Amount, Button, Keypad, Meta, Notice, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { parseUsd } from "@/lib/format";

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
  const max = CHAIN_NAME === "local" ? 10_000 : 200;

  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet!.address, amount: amount.toString() }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "faucet");
      await refresh();
      router.push("/home");
    } catch {
      setErr("We couldn't add dollars right now. Nothing was charged. Try again.");
    } finally {
      setBusy(false);
    }
  };

  // On Arc testnet anyone can get free USDC from Circle's faucet: copy the address, open the faucet.
  const circleFaucet = async () => {
    try {
      await navigator.clipboard.writeText(wallet!.address);
    } catch {}
    window.open("https://faucet.circle.com", "_blank", "noopener");
  };

  if (CHAIN_NAME === "arc") {
    // Testnet: a fixed one-time gift from our faucet, or Circle's public faucet. No keypad: amounts aren't real here.
    const gift = async () => {
      setBusy(true);
      setErr(null);
      try {
        const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet!.address }) });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? "faucet");
        await refresh();
        router.push("/home");
      } catch (e) {
        const m = String((e as Error).message);
        setErr(m === "you already have dollars" ? "You already have test dollars. Pick a boat." : m === "already sent" ? "We already sent you test dollars. Use Circle's faucet for more." : "Our faucet is empty right now. Use Circle's faucet below.");
      } finally {
        setBusy(false);
      }
    };
    return (
      <Screen title="Add dollars" back="/home">
        <div className="flex gap-4 justify-center"><Meta icon={Zap}>Arrives in seconds</Meta><Meta icon={BadgeCheck}>No fees</Meta></div>
        <Notice tone="caution">This is Arc testnet: dollars are Circle's test USDC, with no real value. Card and bank deposits come later.</Notice>
        {err && <Notice tone="danger">{err}</Notice>}
        {faucetOn !== false && <Button onClick={gift} loading={busy || faucetOn === null} testId="confirm-add">Get $5 of test dollars</Button>}
        {wallet && <Button variant={faucetOn === false ? "primary" : "secondary"} icon={ExternalLink} onClick={circleFaucet} testId="circle-faucet">{faucetOn === false ? "Get test dollars from Circle" : "Get more from Circle's faucet"}</Button>}
        <p className="text-center text-ink-2 text-[13px]">For Circle's faucet we copy your address. Pick Arc Testnet and paste it.</p>
      </Screen>
    );
  }

  return (
    <Screen title="Add dollars" back="/home">
      <div className="flex gap-4 justify-center"><Meta icon={Zap}>Arrives in seconds</Meta><Meta icon={BadgeCheck}>No fees</Meta></div>
      <Amount value={v} />
      <Keypad value={v} onChange={setV} max={max} />
      <Notice tone="caution">Test dollars on the local chain. Card and bank deposits come later.</Notice>
      {err && <Notice tone="danger">{err}</Notice>}
      <Button onClick={add} disabled={amount === 0n} loading={busy} testId="confirm-add">Add ${v || "0"}</Button>
    </Screen>
  );
}
