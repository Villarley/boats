"use client";
import { use } from "react";
import { Bot, Calendar, Lock, ShieldCheck, UserRound, Ban, Check } from "lucide-react";
import { Flag } from "@/components/flags";
import { Button, Card, Gauge, Meta, Notice, ScoreBadge, Screen } from "@/components/ui";
import { OddsChip } from "@/components/odds";
import { useBoat } from "@/lib/store";
import { boatScore, captainName, FLAG_OF, isAiCaptain, scoreWord, statusLabel, worstCase } from "@/lib/boat";
import { assetName, dateShort, pct, usd } from "@/lib/format";
import { CaptainLog } from "@/components/captain-log";

export default function BoatPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  if (!b) return <Screen back="/explore" title="Boat"><Card><div className="h-24 animate-pulse bg-hair rounded" /></Card></Screen>;
  const s = boatScore(b);
  const w = worstCase(b);
  const p = b.position;
  const onBoard = p.deposit > 0n && !p.withdrawn;

  return (
    <Screen back="/explore" title={<span className="flex items-center gap-2"><Flag code={FLAG_OF[b.name] ?? "P"} size={18} />{b.name}</span>} actions={<ScoreBadge value={s.total} />}>
      <div className="flex gap-3 flex-wrap -mt-2">
        <Meta icon={isAiCaptain(b) ? Bot : UserRound}>{captainName(b)}</Meta>
        <Meta icon={Calendar}>{statusLabel(b)}</Meta>
      </div>

      {onBoard && (
        <Card testId="your-share">
          <div className="label">Your share</div>
          <div className="bt-big mt-1">{usd(p.valueNow)}</div>
          <div className={`text-[15px] ${p.valueNow < p.deposit ? "text-down" : "text-up"}`}>{usd(p.valueNow - p.deposit, { sign: true })} since you boarded {usd(p.deposit)}</div>
        </Card>
      )}

      {b.state !== "Open" && (
        <Card>
          <div className="flex justify-between items-baseline"><div className="label">{b.state === "Closed" ? "Final value" : "The boat"}</div><div className="font-semibold">{usd(b.state === "Closed" ? b.finalValue : b.nav)}</div></div>
          <Gauge value={b.state === "Closed" ? (b.endReason === "TakeProfit" ? 1 : b.endReason === "StopLoss" ? 0 : b.gauge) : b.gauge} floorLabel={pct(-b.stopLossBps)} goalLabel={`+${pct(b.takeProfitBps)}`} nowLabel={pct(b.changeBps, { sign: true, digits: 1 })} />
        </Card>
      )}

      {b.state === "Closed" && b.crewTotal > 0n && (
        <Notice tone={b.crewPayout >= b.crewTotal ? "ok" : "caution"} title={b.endReason === "TakeProfit" ? "Goal reached. Back in port." : b.endReason === "StopLoss" ? "Floor hit. Back in port." : "Voyage over. Back in port."}>
          The crew put in {usd(b.crewTotal)} and gets back {usd(b.crewPayout)} ({pct(Number(((b.crewPayout - b.crewTotal) * 10_000n) / b.crewTotal), { sign: true, digits: 1 })}), after the captain's fee.
        </Notice>
      )}
      {b.state === "Closed" && onBoard && <Button href={`/boat/${b.address}/port`} testId="go-port">Back in port: see what you get</Button>}
      {b.state === "Returning" && <Notice tone="caution" title="Returning to port">The voyage hit a limit. The boat is going back to dollars.</Notice>}

      {b.state !== "Closed" && <Card>
        <div className="flex items-center gap-2"><ShieldCheck size={20} strokeWidth={1.5} /><span className="font-semibold">Worst case: you lose about {pct(w.bps)}</span></div>
        <p className="text-ink-2 text-[15px] mt-1">If the boat falls {pct(b.stopLossBps)}, the voyage ends on its own. The captain's {usd(b.captainStake)} takes the loss first.</p>
        <div className="flex items-center gap-2 mt-3"><Lock size={20} strokeWidth={1.5} /><span>Locked until {dateShort(b.endTime)}, the {pct(-b.stopLossBps)} floor or the +{pct(b.takeProfitBps)} goal. Whichever comes first.</span></div>
      </Card>}

      <Card>
        <div className="flex justify-between items-center"><span className="font-semibold">Seaworthiness</span><span className="text-ink-2">{scoreWord(s.total)}</span></div>
        <div className="mt-2">
          {s.factors.map((f) => (
            <div key={f.key} className="py-2 border-b border-hair last:border-0">
              <div className="flex justify-between"><span>{f.label}</span><b>{f.points}<span className="text-ink-2 font-normal">/{f.max}</span></b></div>
              <div className="h-1 bg-hair rounded mt-1"><div className="h-1 bg-crew rounded" style={{ width: `${(f.points / f.max) * 100}%` }} /></div>
              <div className="text-ink-2 text-[13px] mt-1">{f.why}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="font-semibold mb-2">What the captain can buy</div>
        <div className="flex justify-between py-1.5"><span className="flex items-center gap-2"><Check size={16} />Dollars</span><span className="text-ink-2">any</span></div>
        {b.assets.map((a) => (
          <div key={a} className="flex justify-between py-1.5"><span className="flex items-center gap-2"><Check size={16} />{assetName(a)}</span><span className="text-ink-2">up to {pct(b.maxWeightBps[a.toLowerCase()] ?? 0)}</span></div>
        ))}
        <div className="flex justify-between py-1.5 text-ink-2"><span className="flex items-center gap-2"><Ban size={16} />Anything else</span><span>blocked by the contract</span></div>
        <p className="text-[13px] text-ink-2 mt-2">The captain can only trade between these. Nobody can take money out of the boat except the crew, at the end.</p>
      </Card>

      {isAiCaptain(b) && (
        <Card>
          <div className="font-semibold mb-2">AI captain</div>
          <OddsChip />
          <CaptainLog boat={b.address} />
        </Card>
      )}

      {b.state === "Open" && (
        <div className="bottom-cta">
          <Button href={`/boat/${b.address}/board`} testId="board-cta">Board {b.name}</Button>
        </div>
      )}
    </Screen>
  );
}
