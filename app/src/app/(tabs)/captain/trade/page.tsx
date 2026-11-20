"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ScanFace, ShieldCheck, Ban } from "lucide-react";
import { buildSwapCall, checkTrade, friendlyError } from "@boats/sdk";
import { Amount, Button, Card, Keypad, Notice, Proof, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { publicClient } from "@/lib/client";
import { deployment } from "@/lib/deployment";
import { assetName, parseUsd, pct, usd } from "@/lib/format";

const priceAbi = [{ type: "function", name: "getPrice", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }] as const;

function Ticket() {
  const params = useSearchParams();
  const { boats, captainOf, wallet, refresh } = useStore();
  const sailing = boats.filter((b) => b.state === "Sailing" && captainOf.some((a) => a.toLowerCase() === b.address.toLowerCase()));
  const [boatAddr, setBoatAddr] = useState<string | null>(params.get("boat"));
  const b = sailing.find((x) => x.address.toLowerCase() === (boatAddr ?? "").toLowerCase()) ?? sailing[0];
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; text: string; hash?: string } | null>(null);

  useEffect(() => {
    if (b && !from) { setFrom(b.usdc); setTo(b.assets[0]!); }
  }, [b, from]);

  const amount = parseUsd(v);
  const check = useMemo(() => (b && from && to ? checkTrade(b.holdings, b.usdc, from as `0x${string}`, to as `0x${string}`, amount, 10) : null), [b, from, to, amount]);

  if (!b) return <Screen title="Trade"><Card><p className="text-ink-2">No boat is sailing yet. Set sail from the Bridge first.</p></Card></Screen>;
  const tokens = [b.usdc, ...b.assets];
  const holding = (t: string) => b.holdings.find((h) => h.token.toLowerCase() === t.toLowerCase());

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
      setRes({ ok: true, text: `Moved ${usd(amount)} from ${assetName(from)} to ${assetName(to)}. Your crew got the alert.`, hash: r.hash });
      setV("");
      refresh();
    } catch (e) {
      const text = friendlyError(e);
      setRes({ ok: false, text });
      if (anyway) {
        fetch("/api/captain-log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ at: new Date().toISOString(), boat: b.address, kind: "blocked", message: `Captain tried ${usd(amount)} into ${assetName(to)}. ${check && !check.ok ? check.message : ""}` }) }).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Trade">
      {sailing.length > 1 && (
        <div className="hscroll">{sailing.map((s) => <button key={s.address} className="chip" aria-pressed={s.address === b.address} onClick={() => { setBoatAddr(s.address); setFrom(""); }}>{s.name}</button>)}</div>
      )}
      <Card>
        <div className="label">From</div>
        <select className="w-full bg-transparent text-[18px] font-semibold py-2" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="from">
          {tokens.map((t) => <option key={t} value={t}>{assetName(t)} ({usd(holding(t)?.value ?? 0n)})</option>)}
        </select>
        <div className="flex justify-center -my-1"><ArrowDown size={18} className="text-ink-2" /></div>
        <div className="label">To</div>
        <select className="w-full bg-transparent text-[18px] font-semibold py-2" value={to} onChange={(e) => setTo(e.target.value)} data-testid="to">
          {tokens.map((t) => <option key={t} value={t}>{assetName(t)}{t === b.usdc ? "" : ` (max ${pct(b.maxWeightBps[t.toLowerCase()] ?? 0)})`}</option>)}
        </select>
      </Card>
      <Amount value={v} />
      {amount > 0n && check && (check.ok ? (
        <Notice tone="ok" icon={ShieldCheck} title="Inside the rules">{to.toLowerCase() === b.usdc.toLowerCase() ? "Back to dollars is always allowed." : `This makes ${assetName(to)} ${pct(check.weightAfterBps)} of the boat.`}</Notice>
      ) : (
        <Notice tone="danger" icon={Ban} title="Breaks a rule">
          <span data-testid="rule">{check.message}</span>
          {check.maxAllowed !== undefined && check.maxAllowed > 0n && <span> Try {usd(check.maxAllowed)} or less.</span>}
        </Notice>
      ))}
      {res && <Notice tone={res.ok ? "ok" : "danger"} title={res.ok ? "Done" : "The contract said no."}><span data-testid="trade-result">{res.text}</span> <Proof hash={res.hash} /></Notice>}
      <Keypad value={v} onChange={setV} />
      {check && !check.ok && check.maxAllowed !== undefined && check.maxAllowed > 0n ? (
        <Button onClick={() => setV(String(Number(check.maxAllowed) / 1e6))} testId="use-max">Use {usd(check.maxAllowed)}</Button>
      ) : (
        <Button icon={ScanFace} onClick={() => send()} loading={busy} disabled={!check?.ok || amount === 0n} testId="send-trade">Trade with Face ID</Button>
      )}
      {check && !check.ok && amount > 0n && <Button variant="ghost" onClick={() => send(true)} disabled={busy} testId="send-anyway">Send it anyway (the contract will check)</Button>}
    </Screen>
  );
}

export default function TradePage() {
  return <Suspense><Ticket /></Suspense>;
}
