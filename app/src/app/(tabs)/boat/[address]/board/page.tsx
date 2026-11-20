"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ScanFace, ShieldCheck, Plus, CheckCircle2 } from "lucide-react";
import { buildBoardCalls, friendlyError } from "@boats/sdk";
import { Amount, Button, Card, Keypad, Notice, Proof, Screen } from "@/components/ui";
import { useBoat, useStore } from "@/lib/store";
import { worstCase } from "@/lib/boat";
import { dateShort, parseUsd, pct, usd } from "@/lib/format";

export default function Board({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  const { wallet, cash, refresh } = useStore();
  const router = useRouter();
  const [v, setV] = useState("");
  const [step, setStep] = useState<"amount" | "review" | "done">("amount");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hash, setHash] = useState<string>();

  if (!b) return <Screen back title="Board" ><Card><div className="h-24 animate-pulse bg-hair rounded" /></Card></Screen>;
  if (b.state !== "Open" && step !== "done")
    return <Screen back={`/boat/${address}`} title={`Board ${b.name}`}><Notice tone="caution" title="Boarding is closed">This voyage already left. We'll let you know when the next one opens.</Notice></Screen>;

  const amount = parseUsd(v);
  const short = amount > cash;
  const w = worstCase(b, amount || 1_000_000n);

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await wallet!.send(buildBoardCalls(b.address, b.usdc, amount));
      if (r.status !== "success") throw new Error("reverted");
      setHash(r.hash);
      setStep("done");
      refresh();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  if (step === "done")
    return (
      <Screen>
        <div className="flex flex-col items-center text-center gap-3 pt-16" data-testid="boarded">
          <CheckCircle2 size={56} strokeWidth={1.25} className="text-crew" />
          <h1 className="bt-title">You're on board.</h1>
          <p className="text-ink-2">The voyage starts when boarding closes. You put in {usd(amount)}.</p>
          <Proof hash={hash} label="Receipt" />
        </div>
        <Button onClick={() => router.push(`/boat/${b.address}`)}>See my boat</Button>
      </Screen>
    );

  if (step === "review")
    return (
      <Screen back={() => setStep("amount")} title="Review">
        <Card>
          <div className="flex justify-between py-2"><span className="text-ink-2">You put in</span><b data-testid="review-amount">{usd(amount)}</b></div>
          <div className="flex justify-between py-2 border-t border-hair"><span className="text-ink-2 flex items-center gap-2"><ShieldCheck size={18} strokeWidth={1.5} />Worst case, you keep</span><b data-testid="review-worst">{usd(amount - w.dollars)}</b></div>
          <p className="text-[13px] text-ink-2">That's a loss of about {usd(w.dollars)} ({pct(w.bps)}) if the boat hits its {pct(-b.stopLossBps)} floor. The captain loses {usd(b.captainStake)} first.</p>
          <div className="flex gap-2 py-2 mt-2 border-t border-hair"><Lock size={18} strokeWidth={1.5} className="flex-none mt-0.5" /><span>Locked until {dateShort(b.endTime)}, the floor or the goal. You can't take it out mid-voyage.</span></div>
        </Card>
        {err && <Notice tone="danger">{err}</Notice>}
        <div className="bottom-cta"><Button icon={ScanFace} onClick={confirm} loading={busy} testId="confirm-board">{wallet?.kind === "passkey" ? "Board with Face ID" : "Board"}</Button></div>
      </Screen>
    );

  return (
    <Screen back={`/boat/${b.address}`} title={`Board ${b.name}`}>
      <Amount value={v} label="How much?" />
      {short && amount > 0n ? (
        <Notice tone="caution" title={`You have ${usd(cash)}.`}>
          <span>Add dollars or board with less.</span>
          <div className="mt-2"><Button variant="secondary" icon={Plus} href="/add">Add {usd(amount - cash)}</Button></div>
        </Notice>
      ) : (
        <p className="text-center text-ink-2 text-[15px]">{amount > 0n ? `Worst case, you keep ${usd(amount - w.dollars)}.` : `You have ${usd(cash)} in dollars.`}</p>
      )}
      <Keypad value={v} onChange={setV} />
      <Button onClick={() => setStep("review")} disabled={amount === 0n || short} testId="review">Review</Button>
    </Screen>
  );
}
