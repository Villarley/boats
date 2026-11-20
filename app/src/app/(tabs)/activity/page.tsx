"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, Ban, Anchor, Flag as FlagIcon, ArrowUpRight, Coins } from "lucide-react";
import { getActivity, type Activity } from "@boats/sdk";
import { Card, Proof, Row, Screen } from "@/components/ui";
import { useCaptainLog } from "@/components/captain-log";
import { useStore } from "@/lib/store";
import { publicClient } from "@/lib/client";
import { deployment } from "@/lib/deployment";
import { assetName, usd } from "@/lib/format";

type Item = { key: string; when: number; icon: typeof Ban; title: string; sub: string; hash?: string; danger?: boolean };

export default function ActivityPage() {
  const { boats, wallet } = useStore();
  const [acts, setActs] = useState<Activity[]>([]);
  const log = useCaptainLog();
  const names = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b.name]));
  const mineOrCaptained = new Set(boats.filter((b) => b.position.deposit > 0n || b.position.isCaptain).map((b) => b.address.toLowerCase()));

  const addrsRef = useRef<`0x${string}`[]>([]);
  addrsRef.current = boats.map((b) => b.address);
  useEffect(() => {
    let alive = true;
    const load = () => getActivity(publicClient(), addrsRef.current, BigInt(deployment.startBlock ?? 0)).then((a) => alive && setActs(a)).catch(() => {});
    load();
    const id = setInterval(load, 5000);
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

  return (
    <Screen title="Activity">
      {blocked.length > 0 && (
        <Card>
          {blocked.slice(0, 3).map((e, i) => (
            <Row key={i} icon={Ban} title={<span className="text-captain font-semibold">The contract said no.</span>} sub={<><span>{e.message}</span><Proof hash={e.txHash} /></>} testId="blocked-row" />
          ))}
        </Card>
      )}
      <Card>
        {items.length === 0 && <p className="text-ink-2">Nothing yet. Every trade, deposit and withdrawal shows here with its proof.</p>}
        {items.map((i) => <Row key={i.key} icon={i.icon} title={i.title} sub={<><span>{i.sub}</span><Proof hash={i.hash} /></>} />)}
      </Card>
      <p className="text-[13px] text-ink-2 text-center">Quiet by design: only trades, blocked attempts, deposits and returns.</p>
    </Screen>
  );
}
