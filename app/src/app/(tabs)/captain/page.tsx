"use client";
import { useState } from "react";
import { ArrowLeftRight, Anchor, Coins, Gauge as GaugeIcon, Users, ShieldCheck } from "lucide-react";
import { buildClaimCaptainCall, buildSailCall, buildStakeCalls, friendlyError } from "@boats/sdk";
import { Flag } from "@/components/flags";
import { Button, Card, Gauge, Meta, Notice, Proof, Screen } from "@/components/ui";
import { CaptainLog } from "@/components/captain-log";
import { useStore, type BoatView } from "@/lib/store";
import { FLAG_OF, statusLabel } from "@/lib/boat";
import { pct, usd } from "@/lib/format";

function BoatBridge({ b }: { b: BoatView }) {
  const { wallet, refresh, cash } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "danger" | "ok"; text: string; hash?: string } | null>(null);
  const run = async (label: string, fn: () => Promise<{ hash: string; status: string }>) => {
    setBusy(label);
    setMsg(null);
    try {
      const r = await fn();
      if (r.status !== "success") throw new Error("reverted");
      setMsg({ tone: "ok", text: `${label}: done.`, hash: r.hash });
      refresh();
    } catch (e) {
      setMsg({ tone: "danger", text: friendlyError(e) });
    } finally {
      setBusy(null);
    }
  };
  // ~10% of the boat, capped by what the captain holds (keep a little for gas: USDC is Arc's gas token).
  const want = b.crewTotal > 0n ? b.crewTotal / 9n : 1_000_000_000n;
  const spendable = cash > 200_000n ? cash - 200_000n : 0n;
  const stake = want < spendable ? want : spendable;
  const checkNow = async () => {
    setBusy("Check limits");
    try {
      const r = await fetch("/api/keeper", { method: "POST" });
      if (!r.ok) {
        setMsg({ tone: "ok", text: "Limits are checked automatically every 10 minutes. Anyone can also trigger it on chain." });
        return;
      }
      const j = await r.json();
      const mine = (j.results ?? []).find((x: { boat: string }) => x.boat.toLowerCase() === b.address.toLowerCase());
      setMsg({ tone: "ok", text: mine?.message ?? "Checked.", hash: mine?.txHash });
      refresh();
    } catch {
      setMsg({ tone: "danger", text: "Couldn't reach the keeper. Try again." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card testId={`bridge-${b.name}`}>
      <div className="flex items-center gap-2"><Flag code={FLAG_OF[b.name] ?? "P"} size={18} /><span className="font-semibold text-[18px] flex-1">{b.name}</span><span className="text-ink-2 text-[15px]">{statusLabel(b)}</span></div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div><div className="label">Boat value</div><div className="font-semibold">{usd(b.nav || b.crewTotal + b.captainStake)}</div></div>
        <div><div className="label">My stake</div><div className="font-semibold text-captain">{usd(b.captainStake)}</div></div>
      </div>
      <div className="flex gap-3 flex-wrap mt-2"><Meta icon={Users}>{usd(b.crewTotal)} from the crew</Meta><Meta icon={ShieldCheck}>Floor {pct(-b.stopLossBps)}, goal +{pct(b.takeProfitBps)}</Meta></div>
      {b.state === "Sailing" && <Gauge value={b.gauge} floorLabel={pct(-b.stopLossBps)} goalLabel={`+${pct(b.takeProfitBps)}`} nowLabel={pct(b.changeBps, { sign: true, digits: 1 })} />}
      {msg && <div className="mt-2"><Notice tone={msg.tone === "ok" ? "ok" : "danger"}>{msg.text} <Proof hash={msg.hash} /></Notice></div>}
      <div className="flex flex-col gap-2 mt-3">
        {b.state === "Open" && b.captainStake === 0n && <Button icon={Coins} disabled={stake === 0n} loading={busy === "Stake"} onClick={() => run("Stake", () => wallet!.send(buildStakeCalls(b.address, b.usdc, stake)))} testId="stake">Put in my stake ({usd(stake)})</Button>}
        {b.state === "Open" && b.captainStake > 0n && (
          <Button icon={Anchor} loading={busy === "Set sail"} disabled={b.crewTotal === 0n} onClick={() => run("Set sail", () => wallet!.send([buildSailCall(b.address)]))} testId="sail">Close boarding and set sail</Button>
        )}
        {b.state === "Sailing" && <Button icon={ArrowLeftRight} href={`/captain/trade?boat=${b.address}`} testId="trade">Trade</Button>}
        {(b.state === "Sailing" || b.state === "Returning") && <Button variant="secondary" icon={GaugeIcon} loading={busy === "Check limits"} onClick={checkNow} testId="check-now">Check limits now</Button>}
        {b.state === "Closed" && <Button icon={Coins} loading={busy === "Claim"} onClick={() => run("Claim", () => wallet!.send([buildClaimCaptainCall(b.address)]))} testId="claim">Claim my stake and fee</Button>}
      </div>
    </Card>
  );
}

export default function Bridge() {
  const { boats, captainOf } = useStore();
  const mine = boats.filter((b) => captainOf.some((a) => a.toLowerCase() === b.address.toLowerCase()));
  return (
    <Screen title="Bridge">
      <p className="text-ink-2 -mt-2">You trade inside the rules. You can never take the crew's money out.</p>
      {mine.length === 0 && <Card><p className="text-ink-2">You don't captain a boat yet.</p><div className="mt-3"><Button href="/captain/launch">Launch a boat</Button></div></Card>}
      <div className="stack">{mine.map((b) => <BoatBridge key={b.address} b={b} />)}</div>
      {mine.length > 0 && (
        <Card><div className="font-semibold">Decision log</div><CaptainLog /></Card>
      )}
    </Screen>
  );
}
