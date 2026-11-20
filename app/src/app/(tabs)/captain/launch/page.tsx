"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, ScanFace } from "lucide-react";
import { RISK_OF, buildCreateBoatCall, friendlyError, score, type AssetRisk } from "@boats/sdk";
import { Button, Card, Notice, ScoreBadge, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { deployment } from "@/lib/deployment";
import { ASSET_NAMES } from "@boats/sdk";

const ASSETS = ["USYC", "EURC", "cirBTC"] as const;
const STEPS = ["Name", "What can you buy?", "Floor and goal", "Your stake and fee", "Review"] as const;

export default function Launch() {
  const { wallet, refresh, setMode } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Family Harbor");
  const [weights, setWeights] = useState<Record<string, number>>({ USYC: 70, EURC: 30, cirBTC: 0 });
  const [floor, setFloor] = useState(10);
  const [goal, setGoal] = useState(15);
  const [days, setDays] = useState(30);
  const [stakePct, setStakePct] = useState(10);
  const [fee, setFee] = useState(20);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const s = useMemo(() => score({
    crewTotal: 9_000_000_000n, captainStake: BigInt(Math.round((9_000 * stakePct) / (100 - stakePct))) * 1_000_000n, stopLossBps: floor * 100,
    assets: ASSETS.filter((a) => weights[a]! > 0).map((a) => ({ symbol: ASSET_NAMES[a]!, maxWeightBps: weights[a]! * 100, risk: (RISK_OF[a] ?? "medium") as AssetRisk })),
    track: [],
  }), [weights, floor, stakePct]);

  const floorTooWide = floor > 25;
  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const chosen = ASSETS.filter((a) => weights[a]! > 0);
      const now = BigInt(Math.floor(Date.now() / 1000));
      const r = await wallet!.send([buildCreateBoatCall(deployment.factory, {
        name, captain: wallet!.address, usdc: deployment.tokens.USDC, oracle: deployment.oracle, router: deployment.adapter,
        assets: chosen.map((a) => deployment.tokens[a]), maxWeightBps: chosen.map((a) => weights[a]! * 100),
        stopLossBps: floor * 100, takeProfitBps: goal * 100, endTime: now + BigInt(days * 86_400), feeBps: fee * 100, vestingDuration: 3n * 86_400n,
      })]);
      if (r.status !== "success") throw new Error("reverted");
      await refresh();
      setMode("captain");
      router.push("/captain");
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const slider = (label: string, value: number, set: (n: number) => void, min: number, max: number, unit = "%") => (
    <label className="block py-2">
      <div className="flex justify-between"><span>{label}</span><b>{value}{unit}</b></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full accent-[var(--bt-primary)] h-11" />
    </label>
  );

  return (
    <Screen title="Set rules your crew can trust." actions={<ScoreBadge value={s.total} />}>
      <div className="label">Step {step + 1} of 5: {STEPS[step]}</div>
      <Card>
        {step === 0 && (
          <label className="block"><div className="label mb-2">Boat name</div><input className="w-full text-[20px] font-semibold bg-transparent border-b border-hair py-2 outline-none" value={name} onChange={(e) => setName(e.target.value.slice(0, 32))} /></label>
        )}
        {step === 1 && ASSETS.map((a) => slider(`${ASSET_NAMES[a]} (max share)`, weights[a]!, (n) => setWeights((w) => ({ ...w, [a]: n })), 0, 100))}
        {step === 2 && (<>{slider("Floor: the voyage ends if the boat falls", floor, setFloor, 5, 40)}{slider("Goal: the voyage ends if the boat gains", goal, setGoal, 5, 50)}{slider("Length", days, setDays, 7, 90, " days")}</>)}
        {step === 3 && (<>{slider("Your stake, lost first (share of the boat)", stakePct, setStakePct, 1, 30)}{slider("Your fee, only on the crew's profit", fee, setFee, 0, 30)}</>)}
        {step === 4 && (
          <div className="text-[15px] flex flex-col gap-1">
            <div className="font-semibold text-[18px]">{name}</div>
            <div>Buys: {ASSETS.filter((a) => weights[a]! > 0).map((a) => `${ASSET_NAMES[a]} up to ${weights[a]}%`).join(", ") || "dollars only"}</div>
            <div>Floor −{floor}%, goal +{goal}%, {days} days</div>
            <div>You put in about {stakePct}% and lose it first. Fee {fee}% of the crew's profit.</div>
          </div>
        )}
      </Card>
      <Card>
        {s.factors.map((f) => <div key={f.key} className="flex justify-between text-[15px] py-0.5"><span className="text-ink-2">{f.label}</span><b>{f.points}/{f.max}</b></div>)}
        <p className="text-[13px] text-ink-2 mt-2">{s.factors.find((f) => f.points < f.max * 0.7)?.why ?? "Every choice moves the score."}</p>
      </Card>
      {floorTooWide && <Notice tone="danger">Floors wider than −25% aren't allowed here. Your crew would lose too much before the voyage stops.</Notice>}
      {err && <Notice tone="danger">{err}</Notice>}
      <div className="flex gap-2">
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 4 ? <Button onClick={() => setStep(step + 1)} disabled={step === 2 && floorTooWide}>Next</Button> : <Button icon={ScanFace} loading={busy} onClick={create} disabled={floorTooWide}>Launch with Face ID</Button>}
      </div>
      <p className="text-[13px] text-ink-2 text-center flex items-center justify-center gap-1"><Rocket size={13} /> The boat comes from the same factory as every other boat. After launch, put in your stake from the Bridge.</p>
    </Screen>
  );
}
