"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Zap } from "lucide-react";
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

  return (
    <Screen title="Add dollars" back="/home">
      <div className="flex gap-4 justify-center"><Meta icon={Zap}>Arrives in seconds</Meta><Meta icon={BadgeCheck}>No fees</Meta></div>
      <Amount value={v} />
      <Keypad value={v} onChange={setV} max={max} />
      <Notice tone="caution">Test dollars on {CHAIN_NAME === "arc" ? "Arc testnet" : "the local chain"}. Card and bank deposits come later.</Notice>
      {err && <Notice tone="danger">{err}</Notice>}
      <Button onClick={add} disabled={amount === 0n} loading={busy} testId="confirm-add">Add ${v || "0"}</Button>
    </Screen>
  );
}
