"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ArrowsLeftRight, Coins, Flag as FlagGlyph, Play, X } from "@phosphor-icons/react";
import { IconTile } from "./list-group";
import { useCaptainLog } from "./captain-log";
import type { BlockedEvent } from "./blocked-sheet";
import { useStore } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { deployment } from "@/lib/deployment";
import { fundHref } from "@/lib/fund";
import { assetName, dateShort, usd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

export type ActivityEntry = {
  key: string;
  /** Block the event happened in (chain events); order and time come from it. */
  block?: bigint;
  /** Unix seconds, when known up front (stopped trades carry their own time). */
  at?: number;
  tile: ReactNode;
  title: string;
  sub: string;
  hash?: string;
  href?: string;
  blocked?: BlockedEvent;
};

const A = appCopy.activityPage;
export const activityTile = {
  in: <IconTile color="teal"><ArrowDownLeft weight="bold" /></IconTile>,
  out: <IconTile color="sky"><ArrowUpRight weight="bold" /></IconTile>,
  trade: <IconTile color="indigo"><ArrowsLeftRight weight="bold" /></IconTile>,
  start: <IconTile color="signal"><Play weight="fill" /></IconTile>,
  stake: <IconTile color="teal"><Coins weight="fill" /></IconTile>,
  end: <IconTile color="muted"><FlagGlyph weight="fill" /></IconTile>,
  blocked: <IconTile color="loss"><X weight="bold" /></IconTile>,
};

/**
 * Everything that happened on the funds, as rows: `yours` (your money, or funds you're in or run),
 * `everyone` (all funds), and `stopped` (trades the rules blocked on your funds), newest first.
 */
export function useActivityItems() {
  const { boats, wallet } = useStore();
  const acts = useActivityFeed();
  const log = useCaptainLog();
  const byAddr = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b]));
  const mineOrManaged = new Set(boats.filter((b) => b.position.deposit > 0n || b.position.isCaptain).map((b) => b.address.toLowerCase()));
  const me = wallet?.address.toLowerCase();

  const yours: ActivityEntry[] = [];
  const everyone: ActivityEntry[] = [];
  for (const a of acts) {
    const b = byAddr[a.boat.toLowerCase()];
    if (!b) continue;
    const fund = b.name;
    const args = a.args as Record<string, bigint | string>;
    const base = { block: a.blockNumber, hash: a.txHash, href: fundHref(b) };
    const mine = String(args.crew ?? "").toLowerCase() === me;
    const relevant = mineOrManaged.has(a.boat.toLowerCase());
    let item: ActivityEntry | null = null;
    if (a.kind === "boarded") item = { ...base, key: a.txHash, tile: activityTile.in, title: mine ? appCopy.activity.invested(fund) : A.someoneInvested(fund), sub: usd(args.amount as bigint) };
    else if (a.kind === "traded") item = { ...base, key: a.txHash, tile: activityTile.trade, title: A.traded(fund), sub: A.tradedSub(assetName(String(args.tokenIn)), assetName(String(args.tokenOut))) };
    else if (a.kind === "sailed") item = { ...base, key: a.txHash + "s", tile: activityTile.start, title: A.started(fund), sub: A.startedSub(usd(args.startValue as bigint)) };
    else if (a.kind === "staked") item = { ...base, key: a.txHash + "k", tile: activityTile.stake, title: A.staked(fund), sub: A.stakedSub(usd(args.amount as bigint)) };
    else if (a.kind === "ended") {
      const r = Number(args.reason);
      item = { ...base, key: a.txHash + "e", tile: activityTile.end, title: A.hitLimit(fund, r === 2 ? A.limitWords.goal : r === 1 ? A.limitWords.floor : A.limitWords.date), sub: A.hitLimitSub };
    } else if (a.kind === "returned") item = { ...base, key: a.txHash + "r", tile: activityTile.end, title: appCopy.activity.closed(fund), sub: A.finalValue(usd(args.finalValue as bigint)) };
    else if (a.kind === "withdrawn") item = { ...base, key: a.txHash + "w", tile: activityTile.out, title: mine ? appCopy.activity.withdrew(fund) : A.someoneWithdrew(fund), sub: usd(args.amount as bigint) };
    else if (a.kind === "claimed") item = { ...base, key: a.txHash + "c", tile: activityTile.stake, title: A.claimed(fund), sub: A.claimedSub(usd(args.base as bigint), usd(args.fee as bigint)) };
    if (!item) continue;
    everyone.push(item);
    if (mine || (relevant && ["traded", "sailed", "ended", "returned", "claimed"].includes(a.kind))) yours.push(item);
  }
  const byBlock = (x: ActivityEntry, y: ActivityEntry) => Number((y.block ?? 0n) - (x.block ?? 0n));
  yours.sort(byBlock);
  everyone.sort(byBlock);

  // Stopped trades on funds you're in (from the decision log, or the deployment's recorded proofs).
  const firstFund = boats.find((b) => b.position.deposit > 0n) ?? boats[0];
  const logged: ActivityEntry[] = log
    .filter((e) => e.kind === "blocked" && mineOrManaged.has(e.boat.toLowerCase()))
    .slice(0, 3)
    .flatMap((e) => {
      const fund = byAddr[e.boat.toLowerCase()];
      if (!fund) return [];
      return [{ key: e.at, at: Date.parse(e.at) / 1000, tile: activityTile.blocked, title: appCopy.blocked.activityRow, sub: fund.name, hash: e.txHash, blocked: { key: e.at, fund, entry: e } }];
    });
  const stopped: ActivityEntry[] = logged.length || !firstFund ? logged : (deployment.demo.blocked ?? []).slice(0, 2).map((p) => ({
    key: p.txHash, tile: activityTile.blocked, title: appCopy.blocked.activityRow, sub: firstFund.name, hash: p.txHash, blocked: { key: p.txHash, fund: firstFund, entry: p },
  }));

  return { yours, everyone, stopped };
}

/** Unix time of each block (fetched once per block, shared across the app). */
const blockTimes = new Map<string, number>();
export function useBlockTimes(blocks: (bigint | undefined)[]) {
  const [, bump] = useState(0);
  const missing = [...new Set(blocks.filter((b): b is bigint => b !== undefined).map(String))].filter((b) => !blockTimes.has(b));
  const want = missing.join(",");
  useEffect(() => {
    if (!want) return;
    let alive = true;
    import("@/lib/client").then(({ publicClient }) =>
      Promise.all(want.split(",").map((b) => publicClient().getBlock({ blockNumber: BigInt(b) }).then((x) => blockTimes.set(b, Number(x.timestamp))).catch(() => {}))),
    ).then(() => alive && bump((n) => n + 1));
    return () => { alive = false; };
  }, [want]);
  return (block?: bigint) => (block === undefined ? undefined : blockTimes.get(String(block)));
}

/** "Just now", "5m ago", "3h ago", "2d ago", then "Nov 18". */
export function ago(unix?: number) {
  if (!unix) return "";
  const s = Math.max(0, Date.now() / 1000 - unix);
  if (s < 60) return appCopy.notifications.justNow;
  if (s < 3600) return appCopy.notifications.minutes(Math.floor(s / 60));
  if (s < 86_400) return appCopy.notifications.hours(Math.floor(s / 3600));
  if (s < 7 * 86_400) return appCopy.notifications.days(Math.floor(s / 86_400));
  return dateShort(unix);
}
