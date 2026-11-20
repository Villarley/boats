"use client";
import { useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowsLeftRight, Coins, Flag as FlagGlyph, Play, X } from "@phosphor-icons/react";
import { Page } from "@/components/top-bar";
import { IconTile, ListGroup, ListRow, TitleRow } from "@/components/list-group";
import { Proof } from "@/components/proof";
import { WebTopBar } from "@/components/web-top-bar";
import { useCaptainLog } from "@/components/captain-log";
import { BlockedSheet, type BlockedEvent } from "@/components/blocked-sheet";
import { useStore } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { deployment } from "@/lib/deployment";
import { assetName, usd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

type Item = { key: string; when: number; tile: ReactNode; title: string; sub: string; hash?: string };
const A = appCopy.activityPage;

const tile = {
  in: <IconTile color="teal"><ArrowDownLeft weight="bold" /></IconTile>,
  out: <IconTile color="sky"><ArrowUpRight weight="bold" /></IconTile>,
  trade: <IconTile color="indigo"><ArrowsLeftRight weight="bold" /></IconTile>,
  start: <IconTile color="signal"><Play weight="fill" /></IconTile>,
  stake: <IconTile color="teal"><Coins weight="fill" /></IconTile>,
  end: <IconTile color="muted"><FlagGlyph weight="fill" /></IconTile>,
  blocked: <IconTile color="loss"><X weight="bold" /></IconTile>,
};

export default function ActivityPage() {
  const { boats, wallet } = useStore();
  const acts = useActivityFeed();
  const log = useCaptainLog();
  const [sheet, setSheet] = useState<BlockedEvent | null>(null);
  const byAddr = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b]));
  const names = (a: string) => byAddr[a.toLowerCase()]?.name ?? "";
  const mineOrManaged = new Set(boats.filter((b) => b.position.deposit > 0n || b.position.isCaptain).map((b) => b.address.toLowerCase()));
  const me = wallet?.address.toLowerCase();

  const yours: Item[] = [];
  const everyone: Item[] = [];
  for (const a of acts) {
    const fund = names(a.boat);
    if (!fund) continue;
    const args = a.args as Record<string, bigint | string>;
    const when = Number(a.blockNumber);
    const mine = String(args.crew ?? "").toLowerCase() === me;
    const relevant = mineOrManaged.has(a.boat.toLowerCase());
    let item: Item | null = null;
    if (a.kind === "boarded") item = { key: a.txHash, when, tile: tile.in, title: mine ? appCopy.activity.invested(fund) : A.someoneInvested(fund), sub: usd(args.amount as bigint), hash: a.txHash };
    else if (a.kind === "traded") item = { key: a.txHash, when, tile: tile.trade, title: A.traded(fund), sub: A.tradedSub(assetName(String(args.tokenIn)), assetName(String(args.tokenOut))), hash: a.txHash };
    else if (a.kind === "sailed") item = { key: a.txHash + "s", when, tile: tile.start, title: A.started(fund), sub: A.startedSub(usd(args.startValue as bigint)), hash: a.txHash };
    else if (a.kind === "staked") item = { key: a.txHash + "k", when, tile: tile.stake, title: A.staked(fund), sub: A.stakedSub(usd(args.amount as bigint)), hash: a.txHash };
    else if (a.kind === "ended") {
      const r = Number(args.reason);
      item = { key: a.txHash + "e", when, tile: tile.end, title: A.hitLimit(fund, r === 2 ? A.limitWords.goal : r === 1 ? A.limitWords.floor : A.limitWords.date), sub: A.hitLimitSub, hash: a.txHash };
    } else if (a.kind === "returned") item = { key: a.txHash + "r", when, tile: tile.end, title: appCopy.activity.closed(fund), sub: A.finalValue(usd(args.finalValue as bigint)), hash: a.txHash };
    else if (a.kind === "withdrawn") item = { key: a.txHash + "w", when, tile: tile.out, title: mine ? appCopy.activity.withdrew(fund) : A.someoneWithdrew(fund), sub: usd(args.amount as bigint), hash: a.txHash };
    else if (a.kind === "claimed") item = { key: a.txHash + "c", when, tile: tile.stake, title: A.claimed(fund), sub: A.claimedSub(usd(args.base as bigint), usd(args.fee as bigint)), hash: a.txHash };
    if (!item) continue;
    everyone.push(item);
    if (mine || (relevant && ["traded", "sailed", "ended", "returned", "claimed"].includes(a.kind))) yours.push(item);
  }
  everyone.sort((x, y) => y.when - x.when);

  // Stopped trades on funds you're in (from the decision log, or the deployment's recorded proofs).
  const stopped = log.filter((e) => e.kind === "blocked" && mineOrManaged.has(e.boat.toLowerCase())).slice(0, 3);
  const proofs = stopped.length ? [] : (deployment.demo.blocked ?? []).slice(0, 2);
  const firstFund = boats.find((b) => b.position.deposit > 0n) ?? boats[0];

  const row = (i: Item) => <ListRow key={i.key} dense leading={i.tile} title={i.title} sub={<span className="flex flex-wrap gap-x-3">{i.sub}<Proof hash={i.hash} /></span>} />;

  return (
    <Page web="wide" testId="activity">
      <WebTopBar title={A.title} />
      <h1 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.01em] lg:hidden">{A.title}</h1>
      {(stopped.length > 0 || proofs.length > 0) && (
        <ListGroup className="mt-4">
          {stopped.map((e) => {
            const fund = byAddr[e.boat.toLowerCase()];
            return <ListRow key={e.at} dense testId="blocked-row" leading={tile.blocked} title={appCopy.blocked.activityRow} sub={fund?.name}
              onClick={fund ? () => setSheet({ key: e.at, fund, entry: e }) : undefined} />;
          })}
          {proofs.map((p) => <ListRow key={p.txHash} dense testId="blocked-row" leading={tile.blocked} title={appCopy.blocked.activityRow}
            sub={<Proof hash={p.txHash} />} onClick={firstFund ? () => setSheet({ key: p.txHash, fund: firstFund, entry: p }) : undefined} />)}
        </ListGroup>
      )}
      <TitleRow title={A.yours} />
      {yours.length ? <ListGroup>{yours.slice(0, 12).map(row)}</ListGroup> : <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{A.empty}</p>}
      {everyone.length > 0 && (
        <>
          <TitleRow title={A.everyone} />
          <ListGroup testId="live-feed">{everyone.slice(0, 12).map(row)}</ListGroup>
        </>
      )}
      <p className="mb-6 mt-4 text-center text-[13px] text-muted">{A.quiet}</p>
      <BlockedSheet event={sheet} onClose={() => setSheet(null)} />
    </Page>
  );
}
