"use client";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, Ban, Anchor, Flag as FlagIcon, ArrowUpRight, Coins } from "lucide-react";
import type { Activity } from "@boats/sdk";
import { Card, Proof, Row, Screen } from "@/components/ui";
import { useCaptainLog } from "@/components/captain-log";
import { useStore } from "@/lib/store";
import { deployment } from "@/lib/deployment";
import { assetName, usd } from "@/lib/format";

// The server sends bigints as strings; turn the amounts back into bigints.
const NUM = new Set(["amount", "startValue", "base", "fee", "amountIn", "amountOut", "finalValue", "crewPayout", "nav", "navAfter"]);
function revive(a: Activity): Activity {
  const args = Object.fromEntries(Object.entries(a.args as Record<string, unknown>).map(([k, v]) => [k, NUM.has(k) && typeof v === "string" ? BigInt(v) : v]));
  return { ...a, blockNumber: BigInt(a.blockNumber as unknown as string), args };
}

type Item = { key: string; when: number; icon: typeof Ban; title: string; sub: string; hash?: string; danger?: boolean };

export default function ActivityPage() {
  const { boats, wallet } = useStore();
  const [acts, setActs] = useState<Activity[]>([]);
  const log = useCaptainLog();
  const names = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b.name]));
  const mineOrCaptained = new Set(boats.filter((b) => b.position.deposit > 0n || b.position.isCaptain).map((b) => b.address.toLowerCase()));

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/activity")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((j: { activity: Activity[] }) => alive && setActs(j.activity.map(revive)))
        .catch(() => {});
    load();
    const id = setInterval(() => !document.hidden && load(), 10_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const me = wallet?.address.toLowerCase();
  const items: Item[] = [];
  for (const a of acts) {
    const boat = names[a.boat.toLowerCase()] ?? "A boat";
    const relevant = mineOrCaptained.has(a.boat.toLowerCase());
    const args = a.args as Record<string, bigint | string>;
    const when = Number(a.blockNumber);
    if (a.kind === "boarded" && String(args.crew).toLowerCase() === me) items.push({ key: a.txHash, when, icon: ArrowDownLeft, title: `You boarded ${boat}`, sub: usd(args.amount as bigint), hash: a.txHash });
    else if (a.kind === "traded" && relevant) items.push({ key: a.txHash, when, icon: ArrowLeftRight, title: `Captain traded on ${boat}`, sub: `${assetName(String(args.tokenIn))} to ${assetName(String(args.tokenOut))}`, hash: a.txHash });
    else if (a.kind === "sailed" && relevant) items.push({ key: a.txHash, when, icon: Anchor, title: `${boat} set sail`, sub: `${usd(args.startValue as bigint)} on board`, hash: a.txHash });
    else if (a.kind === "ended" && relevant) items.push({ key: a.txHash + "e", when, icon: FlagIcon, title: `${boat} hit a limit`, sub: "Returning to port", hash: a.txHash });
    else if (a.kind === "returned" && relevant) items.push({ key: a.txHash + "r", when, icon: Anchor, title: `${boat} is back in port`, sub: "Ready to withdraw", hash: a.txHash });
    else if (a.kind === "withdrawn" && String(args.crew).toLowerCase() === me) items.push({ key: a.txHash, when, icon: ArrowUpRight, title: `You withdrew from ${boat}`, sub: usd(args.amount as bigint), hash: a.txHash });
    else if (a.kind === "claimed" && relevant) items.push({ key: a.txHash, when, icon: Coins, title: `Captain claimed on ${boat}`, sub: `${usd(args.base as bigint)} stake + ${usd(args.fee as bigint)} fee`, hash: a.txHash });
  }
  const blocked = log.filter((e) => e.kind === "blocked");
  // Everything that happened on every boat, newest first: what a new visitor sees before they board.
  const live: Item[] = [];
  for (const a of acts) {
    const boat = names[a.boat.toLowerCase()] ?? "A boat";
    const args = a.args as Record<string, bigint | string>;
    const when = Number(a.blockNumber);
    if (a.kind === "traded") live.push({ key: "l" + a.txHash, when, icon: ArrowLeftRight, title: `Captain traded on ${boat}`, sub: `${assetName(String(args.tokenIn))} to ${assetName(String(args.tokenOut))}`, hash: a.txHash });
    else if (a.kind === "boarded") live.push({ key: "l" + a.txHash, when, icon: ArrowDownLeft, title: String(args.crew).toLowerCase() === me ? `You boarded ${boat}` : `Someone boarded ${boat}`, sub: usd(args.amount as bigint), hash: a.txHash });
    else if (a.kind === "sailed") live.push({ key: "l" + a.txHash, when, icon: Anchor, title: `${boat} set sail`, sub: `${usd(args.startValue as bigint)} on board`, hash: a.txHash });
    else if (a.kind === "staked") live.push({ key: "l" + a.txHash, when, icon: Coins, title: `Captain staked on ${boat}`, sub: `${usd(args.amount as bigint)} that loses first`, hash: a.txHash });
    else if (a.kind === "ended") live.push({ key: "l" + a.txHash + "e", when, icon: FlagIcon, title: `${boat} hit its ${Number(args.reason) === 2 ? "goal" : Number(args.reason) === 1 ? "floor" : "end date"}`, sub: "The contract ended the voyage", hash: a.txHash });
    else if (a.kind === "returned") live.push({ key: "l" + a.txHash + "r", when, icon: Anchor, title: `${boat} is back in port`, sub: `${usd(args.finalValue as bigint)} final value`, hash: a.txHash });
    else if (a.kind === "withdrawn") live.push({ key: "l" + a.txHash, when, icon: ArrowUpRight, title: String(args.crew).toLowerCase() === me ? `You withdrew from ${boat}` : `Crew withdrew from ${boat}`, sub: usd(args.amount as bigint), hash: a.txHash });
  }
  live.sort((x, y) => y.when - x.when);
  const proofs = deployment.demo.blocked ?? [];
  const shownBlocked = blocked.length ? blocked.slice(0, 3) : proofs;

  return (
    <Screen title="Activity">
      {shownBlocked.length > 0 && (
        <Card>
          {shownBlocked.map((e, i) => (
            <Row key={i} icon={Ban} title={<span className="text-captain font-semibold">The contract said no.</span>} sub={<><span>{e.message}</span><Proof hash={e.txHash} /></>} testId="blocked-row" />
          ))}
        </Card>
      )}
      <Card>
        {items.length === 0 && <p className="text-ink-2">Nothing of yours yet. Your deposits, your captain's trades and withdrawals show here, each with its proof.</p>}
        {items.map((i) => <Row key={i.key} icon={i.icon} title={i.title} sub={<><span>{i.sub}</span><Proof hash={i.hash} /></>} />)}
      </Card>
      {live.length > 0 && (
        <>
          <h2 className="bt-title text-[1.15rem] mt-2">Live on Arc</h2>
          <Card testId="live-feed">
            {live.slice(0, 12).map((i) => <Row key={i.key} icon={i.icon} title={i.title} sub={<><span>{i.sub}</span><Proof hash={i.hash} /></>} />)}
          </Card>
        </>
      )}
      <p className="text-[13px] text-ink-2 text-center">Quiet by design: only trades, blocked attempts, deposits and returns.</p>
    </Screen>
  );
}
