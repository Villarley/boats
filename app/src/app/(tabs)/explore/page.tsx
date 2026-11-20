"use client";
import { useMemo, useState } from "react";
import { Bot, Calendar, ShieldCheck, TrendingUp, UserRound } from "lucide-react";
import { Flag } from "@/components/flags";
import { Card, Meta, ScoreBadge, Screen } from "@/components/ui";
import { OddsChip } from "@/components/odds";
import { useStore } from "@/lib/store";
import { boatScore, captainName, FLAG_OF, isAiCaptain, statusLabel, worstCase } from "@/lib/boat";
import { daysLeft, pct, usd } from "@/lib/format";

const FILTERS = ["Calm only", "Family captains", "AI captains", "Boarding now"] as const;

export default function Explore() {
  const { boats, loading } = useStore();
  const [on, setOn] = useState<string[]>([]);
  const list = useMemo(() => {
    let l = boats.map((b) => ({ b, s: boatScore(b), w: worstCase(b) }));
    if (on.includes("Calm only")) l = l.filter((x) => x.s.total >= 80);
    if (on.includes("Family captains")) l = l.filter((x) => !isAiCaptain(x.b));
    if (on.includes("AI captains")) l = l.filter((x) => isAiCaptain(x.b));
    if (on.includes("Boarding now")) l = l.filter((x) => x.b.state === "Open");
    return l.sort((a, b) => a.w.bps - b.w.bps); // safest first
  }, [boats, on]);
  const toggle = (f: string) => setOn((o) => (o.includes(f) ? o.filter((x) => x !== f) : [...o, f]));

  return (
    <Screen title="Pick a boat.">
      <p className="text-ink-2 -mt-2">You see the worst case before you board.</p>
      <div className="hscroll">
        {FILTERS.map((f) => (
          <button key={f} className="chip" aria-pressed={on.includes(f)} onClick={() => toggle(f)}>{f}</button>
        ))}
      </div>
      <div className="label">Sorted by worst case, safest first</div>
      {loading && !boats.length && [0, 1, 2].map((i) => <Card key={i}><div className="h-20 animate-pulse bg-hair rounded" /></Card>)}
      <div className="stack">
        {list.map(({ b, s, w }) => (
          <Card key={b.address} href={`/boat/${b.address}`} testId={`boat-card-${b.name}`}>
            <div className="flex items-start gap-3">
              <Flag code={FLAG_OF[b.name] ?? "P"} size={20} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[18px]">{b.name}</div>
                <div className="flex gap-3 flex-wrap mt-1">
                  <Meta icon={isAiCaptain(b) ? Bot : UserRound}>{captainName(b)}</Meta>
                  <Meta icon={Calendar}>{statusLabel(b)}</Meta>
                </div>
              </div>
              <ScoreBadge value={s.total} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div><div className="label">Worst case</div><div className="font-semibold text-down" data-testid="worst">{pct(-w.bps)}</div></div>
              <div><div className="label">Goal</div><div className="font-semibold">+{pct(b.takeProfitBps)}</div></div>
              <div><div className="label">Ends in</div><div className="font-semibold">{daysLeft(b.endTime)} days</div></div>
            </div>
            <div className="flex gap-3 flex-wrap mt-3">
              <Meta icon={ShieldCheck}>Captain puts in {usd(b.captainStake)} and loses it first</Meta>
            </div>
            {isAiCaptain(b) && <div className="mt-3"><OddsChip /></div>}
          </Card>
        ))}
      </div>
      {!loading && list.length === 0 && <Card><p className="text-ink-2">No boats match these filters.</p></Card>}
      <div className="flex gap-4 text-ink-2 text-[13px] justify-center"><Meta icon={TrendingUp}>Scores are computed from on-chain rules</Meta><Meta icon={Calendar}>Live</Meta></div>
    </Screen>
  );
}
