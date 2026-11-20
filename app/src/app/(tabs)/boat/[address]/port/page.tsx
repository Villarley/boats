"use client";
import { use, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { buildWithdrawCall, friendlyError, portSummary } from "@boats/sdk";
import { Button, Card, Notice, Proof, Screen } from "@/components/ui";
import { Flag } from "@/components/flags";
import { useBoat, useStore } from "@/lib/store";
import { captainName } from "@/lib/boat";
import { pct, usd } from "@/lib/format";

export default function Port({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  const { wallet, refresh } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hash, setHash] = useState<string>();

  if (!b) return <Screen back="/home"><div /></Screen>;
  if (b.state !== "Closed") return <Screen back={`/boat/${address}`} title="Back in port"><Notice title="Still at sea">This boat hasn't returned yet.</Notice></Screen>;

  const p = b.position;
  const sum = portSummary(b.startValue, b.finalValue, p.deposit, p.valueNow);
  const won = sum.youBps >= 0;

  const withdraw = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await wallet!.send([buildWithdrawCall(b.address)]);
      if (r.status !== "success") throw new Error("reverted");
      setHash(r.hash);
      refresh();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen tone="navy" back="/home">
      <div className="flex items-center gap-2"><Flag code="Q" size={16} /><span className="label text-white/70">Back in port</span></div>
      <div className="pt-6 flex flex-col gap-3" data-testid="port">
        <p className="text-[22px] text-white/80">{won ? `The boat made ${pct(sum.boatBps)}.` : `The market fell ${pct(-sum.boatBps)}.`}</p>
        <div className="bt-giant text-white" data-testid="port-you">{pct(sum.youBps, { sign: true, digits: 1 })}</div>
        <p className="text-[22px] font-semibold">{won ? `You made ${pct(sum.youBps, { digits: 1 })}.` : "That's all you lost."}</p>
        {!won && <p className="text-white/70">{captainName(b)}'s {usd(b.captainStake)} took the hit first.</p>}
      </div>
      <Card className="!bg-white/10 !border-white/15 text-white">
        <div className="flex justify-between"><span className="text-white/70">You put in</span><b>{usd(p.deposit)}</b></div>
        <div className="flex justify-between mt-2"><span className="text-white/70">You get back</span><b data-testid="port-back">{usd(p.valueNow)}</b></div>
      </Card>
      {err && <Notice tone="danger">{err}</Notice>}
      {p.withdrawn || hash ? (
        <div className="flex flex-col items-center gap-2 text-center" data-testid="withdrawn">
          <CheckCircle2 size={40} strokeWidth={1.25} />
          <p>{usd(p.valueNow)} is back in your dollars.</p>
          <Proof hash={hash} />
          <Button href="/explore" variant="secondary">Board the next voyage</Button>
        </div>
      ) : (
        <button className="btn bg-white text-[#0B1A30]" onClick={withdraw} disabled={busy || p.deposit === 0n} data-testid="withdraw">
          {busy ? "Withdrawing…" : `Withdraw ${usd(p.valueNow)}`}
        </button>
      )}
      <p className="text-white/60 text-[13px] text-center">No deadline. Your money waits in dollars.</p>
    </Screen>
  );
}
