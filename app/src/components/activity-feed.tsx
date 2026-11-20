"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowDownRight, ArrowUpRight, CalendarBlank, CaretLeft, CaretRight, CheckCircle, Coins, Flag as FlagGlyph, Play, ShieldWarning } from "@phosphor-icons/react";
import { ASSET_NAMES } from "@boats/sdk";
import { ManagerAvatar } from "./manager-avatar";
import { Proof } from "./proof";
import { useCaptainLog, type LogEntry } from "./captain-log";
import { useBlockTimes } from "./activity-items";
import type { BlockedEvent } from "./blocked-sheet";
import { useStore, type BoatView } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { symbolOf } from "@/lib/deployment";
import { fundHref, managerOf, plainWords } from "@/lib/fund";
import { assetName, dateShort, pct, usd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

const A = appCopy.activityPage;
export type Category = "money" | "manager" | "alert";
export type Filter = (typeof A.filters)[number];
const FILTER_CAT: Record<Filter, Category | null> = { All: null, "Your money": "money", Manager: "manager", Alerts: "alert" };

export type Trade = { fund: BoatView; tokenIn: string; tokenOut: string; dollars?: bigint; log?: LogEntry };
export type FeedEntry = {
  key: string;
  cat: Category;
  when?: number; // unix seconds, once known
  block?: bigint;
  fund: BoatView;
  leading: ReactNode;
  title: string;
  sub: string;
  amount?: ReactNode;
  hash?: string;
  href: string;
  trade?: Trade;
  blocked?: BlockedEvent;
};

/** Outline circle glyph (Activity rows): color carries the meaning, no filled tile. */
function Ring({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="grid size-10 flex-none place-items-center rounded-full border-[1.5px] [&_svg]:size-[18px]" style={{ borderColor: color, color }}>
      {children}
    </span>
  );
}

const assetIn = (msg: string) => Object.values(ASSET_NAMES).find((n) => n !== "Dollars" && msg.toLowerCase().includes(n.toLowerCase())) ?? (/bitcoin|btc/i.test(msg) ? "Bitcoin" : undefined);

/** The dollar size of a trade: the dollars side, when one side is dollars. */
function dollarsOf(tokenIn: string, tokenOut: string, amountIn: bigint, amountOut: bigint) {
  if (symbolOf(tokenIn) === "USDC") return amountIn;
  if (symbolOf(tokenOut) === "USDC") return amountOut;
  return undefined;
}

/**
 * The account's timeline: its own money (invested, withdrew, payouts), its managers' moves
 * (trades, start, their money in, their pay) and alerts (stopped trades, limits hit), newest first.
 */
export function useFeed(): FeedEntry[] {
  const { boats, wallet } = useStore();
  const acts = useActivityFeed();
  const log = useCaptainLog();
  const me = wallet?.address.toLowerCase();
  const entries = useMemo(() => {
    const byAddr = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b]));
    const logByTx = new Map(log.filter((e) => e.txHash).map((e) => [e.txHash!.toLowerCase(), e]));
    const out: FeedEntry[] = [];
    for (const a of acts) {
      const b = byAddr[a.boat.toLowerCase()];
      if (!b) continue;
      const inFund = b.position.deposit > 0n || b.position.isCaptain;
      const args = a.args as Record<string, bigint | string>;
      const mine = String(args.crew ?? "").toLowerCase() === me;
      const m = managerOf(b);
      const who = b.position.isCaptain ? A.you : m.first; // your own fund: "You moved…"
      const base = { fund: b, block: a.blockNumber, hash: a.txHash, href: fundHref(b) };
      const avatar = <ManagerAvatar manager={m} />;
      if (a.kind === "traded" && inFund) {
        const tokenIn = String(args.tokenIn), tokenOut = String(args.tokenOut);
        const dollars = dollarsOf(tokenIn, tokenOut, args.amountIn as bigint, args.amountOut as bigint);
        const entry = logByTx.get(a.txHash.toLowerCase());
        out.push({
          ...base, key: a.txHash + "t", cat: "manager", leading: avatar,
          title: dollars !== undefined ? A.moved(who, usd(dollars), assetName(tokenOut)) : A.movedTo(who, assetName(tokenOut)),
          sub: entry?.kind === "trade" ? plainWords(entry.message) : b.name,
          amount: dollars !== undefined ? usd(dollars, { cents: true }) : undefined,
          trade: { fund: b, tokenIn, tokenOut, dollars, log: entry?.kind === "trade" ? entry : undefined },
        });
      } else if (a.kind === "boarded" && mine) {
        out.push({ ...base, key: a.txHash + "b", cat: "money", leading: <Ring color="var(--bt-signal)"><ArrowDownLeft weight="bold" /></Ring>,
          title: A.youInvested(b.name), sub: A.youInvestedSub, amount: usd(args.amount as bigint, { cents: true, sign: true }) });
      } else if (a.kind === "withdrawn" && mine) {
        out.push({ ...base, key: a.txHash + "w", cat: "money", leading: <Ring color="var(--bt-ink)"><ArrowUpRight weight="bold" /></Ring>,
          title: A.youWithdrew(b.name), sub: A.youWithdrewSub, amount: usd(args.amount as bigint, { cents: true }) });
      } else if (a.kind === "returned" && b.position.deposit > 0n) {
        const diff = b.position.valueNow - b.position.deposit;
        const up = diff >= 0n;
        out.push({ ...base, key: a.txHash + "r", cat: "money", leading: <Ring color={up ? "var(--bt-gain)" : "var(--bt-loss)"}>{up ? <ArrowUpRight weight="bold" /> : <ArrowDownRight weight="bold" />}</Ring>,
          title: A.closedYou(b.name), sub: A.closedYouSub(usd(b.position.valueNow, { cents: true })),
          amount: <span className={up ? "text-gain" : "text-loss"}>{usd(diff, { cents: true, sign: true })}</span> });
      } else if (a.kind === "ended" && inFund) {
        const r = Number(args.reason);
        out.push({ ...base, key: a.txHash + "e", cat: "alert", leading: <Ring color={r === 2 ? "var(--bt-gain)" : "var(--bt-loss)"}><FlagGlyph weight="fill" /></Ring>,
          title: A.hitLimit(b.name, r === 2 ? A.limitWords.goal : r === 1 ? A.limitWords.floor : A.limitWords.date), sub: A.hitLimitSub });
      } else if (a.kind === "sailed" && inFund) {
        out.push({ ...base, key: a.txHash + "s", cat: "manager", leading: <Ring color="var(--bt-signal)"><Play weight="fill" /></Ring>,
          title: A.started(b.name), sub: A.startedSub(usd(args.startValue as bigint)) });
      } else if (a.kind === "staked" && inFund) {
        out.push({ ...base, key: a.txHash + "k", cat: "manager", leading: avatar, title: b.position.isCaptain ? A.youPut : A.put(m.first), sub: A.stakedSub(usd(args.amount as bigint)),
          amount: usd(args.amount as bigint, { cents: true }) });
      } else if (a.kind === "claimed" && inFund) {
        out.push({ ...base, key: a.txHash + "c", cat: "manager", leading: <Ring color="var(--bt-muted)"><Coins weight="fill" /></Ring>,
          title: A.paid(who), sub: A.claimedSub(usd(args.base as bigint), usd(args.fee as bigint)) });
      }
    }
    for (const e of log) {
      if (e.kind !== "blocked") continue;
      const b = byAddr[e.boat.toLowerCase()];
      if (!b || !(b.position.deposit > 0n || b.position.isCaptain)) continue;
      const asset = assetIn(e.message);
      out.push({
        key: "x" + e.at, cat: "alert", fund: b, when: Date.parse(e.at) / 1000, hash: e.txHash, href: fundHref(b),
        leading: <Ring color="var(--bt-loss)"><ShieldWarning weight="fill" /></Ring>,
        title: A.stoppedTitle, sub: asset ? A.stoppedSub(asset, b.name) : b.name,
        amount: <span className="text-loss">{A.blocked}</span>,
        blocked: { key: e.at, fund: b, entry: e },
      });
    }
    return out;
  }, [acts, boats, log, me]);

  const timeOf = useBlockTimes(entries.slice(0, 60).map((e) => e.block));
  return useMemo(
    () => entries.map((e) => ({ ...e, when: e.when ?? timeOf(e.block) })).sort((x, y) => (y.when ?? 0) - (x.when ?? 0) || Number((y.block ?? 0n) - (x.block ?? 0n))),
    [entries, timeOf], // timeOf is new whenever block times arrive

  );
}

export const filterEntries = (list: FeedEntry[], f: Filter) => (FILTER_CAT[f] ? list.filter((e) => e.cat === FILTER_CAT[f]) : list);

const dayKey = (unix: number) => { const d = new Date(unix * 1000); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
export const todayKey = () => dayKey(Date.now() / 1000);
export const entryDay = (e: FeedEntry) => (e.when ? dayKey(e.when) : todayKey());
export const timeShort = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
export function dayLabel(unix?: number) {
  if (!unix || dayKey(unix) === todayKey()) return A.todayLabel;
  const d = new Date(unix * 1000);
  return `${d.toLocaleDateString("en-US", { weekday: "short" })} · ${dateShort(unix)}`.toUpperCase();
}

const DOT: Record<Category, string> = { manager: "bg-signal", money: "bg-ink", alert: "bg-loss" };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Whole weeks between today and `d` (0 = this week of 7 days ending today). */
export const weekOffsetOf = (d: Date) => Math.max(0, Math.floor((startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / (7 * 86_400_000)));
const keyOfDate = (d: Date) => dayKey(d.getTime() / 1000);

function catsOn(entries: FeedEntry[], k: string) {
  return [...new Set(entries.filter((e) => entryDay(e) === k).map((e) => e.cat))].slice(0, 3);
}

function DayCell({ d, k, on, today, entries, onDay, label, tall = true, testId }: { d: Date; k: string; on: boolean; today: boolean; entries: FeedEntry[]; onDay: (k: string) => void; label?: string; tall?: boolean; testId?: string }) {
  const future = d.getTime() > Date.now();
  const cats = catsOn(entries, k);
  return (
    <button type="button" role="radio" aria-checked={on} disabled={future} onClick={() => onDay(k)} data-testid={testId}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-[18px] disabled:opacity-30 ${tall ? "h-[66px]" : "h-12"} ${on ? "bg-signal text-white shadow-[0_6px_16px_rgba(43,79,216,.28)]" : today ? "text-signal" : "text-ink"}`}>
      {label && <span className={`text-[11px] ${on ? "text-white/80" : "text-muted"}`}>{label}</span>}
      <b className={`bt-num font-semibold ${tall ? "text-[17px]" : "text-[15px]"}`}>{d.getDate()}</b>
      <span className="flex h-1.5 gap-[3px]">{cats.map((c) => <i key={c} className={`size-1.5 rounded-full ${on ? "bg-white" : DOT[c]}`} />)}</span>
    </button>
  );
}

/**
 * A week of days ending today (or `offset` weeks back), with dots for what happened each day.
 * Arrows move a week at a time; the calendar button opens the whole month.
 */
export function WeekStrip({ entries, day, onDay, offset, onOffset, onCalendar }: {
  entries: FeedEntry[]; day: string; onDay: (k: string) => void; offset: number; onOffset: (n: number) => void; onCalendar: () => void;
}) {
  const end = addDays(new Date(), -7 * offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6));
  const todayK = todayKey();
  const month = end.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nav = "grid size-9 place-items-center rounded-full bg-signal-50 text-signal disabled:opacity-35 [&_svg]:size-4";
  // Folder card like Home's Overview, in light signal: the month is the tab, the days the card.
  return (
    <section className="mt-4" data-testid="week-card">
      <div className="flex items-end justify-between gap-2">
        <span className="flex h-[38px] items-center rounded-t-[14px] bg-signal-50 px-[18px] text-[14px] font-semibold text-ink" data-testid="week-month">{month}</span>
        <div className="flex gap-1.5 pb-1.5">
          <button type="button" className={nav} onClick={() => onOffset(offset + 1)} aria-label={A.prevWeek} data-testid="week-prev"><CaretLeft weight="bold" /></button>
          <button type="button" className={nav} onClick={() => onOffset(offset - 1)} disabled={offset === 0} aria-label={A.nextWeek} data-testid="week-next"><CaretRight weight="bold" /></button>
          <button type="button" className={nav} onClick={onCalendar} aria-label={A.calendar} data-testid="calendar"><CalendarBlank weight="bold" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-[0_22px_22px_22px] bg-signal-50 p-2" role="radiogroup" aria-label={A.days} data-testid="week">
        {days.map((d) => {
          const k = keyOfDate(d);
          const isToday = k === todayK;
          return <DayCell key={k} d={d} k={k} on={k === day} today={isToday} entries={entries} onDay={onDay}
            label={isToday ? A.today : d.toLocaleDateString("en-US", { weekday: "short" })} testId={isToday ? "day-today" : `day-${k}`} />;
        })}
      </div>
    </section>
  );
}

/** The whole month, Monday first, with the same dots. Picking a day closes it and shows that day. */
export function MonthCalendar({ entries, day, onDay }: { entries: FeedEntry[]; day: string; onDay: (d: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const first = (month.getDay() + 6) % 7; // Monday = 0
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const thisMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();
  const todayK = todayKey();
  const nav = "grid size-9 place-items-center rounded-full bg-card-2 text-ink disabled:opacity-35 [&_svg]:size-4";
  return (
    <div data-testid="month">
      <div className="mt-3 flex items-center gap-2">
        <b className="flex-1 text-[16px] font-semibold">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</b>
        <button type="button" className={nav} aria-label={A.prevMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><CaretLeft weight="bold" /></button>
        <button type="button" className={nav} aria-label={A.nextMonth} disabled={thisMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><CaretRight weight="bold" /></button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {A.weekdays.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" role="radiogroup" aria-label={A.calendar}>
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const k = keyOfDate(d);
          return <DayCell key={k} d={d} k={k} on={k === day} today={k === todayK} entries={entries} onDay={() => onDay(d)} tall={false} />;
        })}
      </div>
    </div>
  );
}

/** One timeline row: leading, title, sub (+ from → to chips for trades), amount and time. */
export function FeedRow({ e, selected, onClick }: { e: FeedEntry; selected?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={selected || undefined} data-testid={e.blocked ? "blocked-row" : `feed-${e.cat}`}
      className={`relative grid w-full grid-cols-[40px_1fr_auto] items-start gap-x-3 rounded-[18px] px-2.5 py-3 text-left ${selected ? "bg-card before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-signal" : "hover:bg-card/60"}`}>
      {e.leading}
      <span className="min-w-0">
        <b className="block text-[15px] font-semibold leading-[1.3]">{e.title}</b>
        <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{e.sub}</span>
      </span>
      <span className="flex flex-col items-end gap-0.5">
        {e.amount && <b className="bt-num whitespace-nowrap text-[15px] font-semibold">{e.amount}</b>}
        <span className="whitespace-nowrap font-mono text-[11px] text-faint">{timeShort(e.when)}</span>
      </span>
      {e.trade && (
        <span className="col-span-2 col-start-2 mt-1.5 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[12px] font-medium text-muted">
          <Chip token={e.trade.tokenIn} /><CaretRight weight="bold" className="size-3 flex-none text-faint" /><Chip token={e.trade.tokenOut} />
        </span>
      )}
    </button>
  );
}

const TOKEN_COLOR: Record<string, string> = { USYC: "var(--bt-signal)", EURC: "var(--bt-teal)", USDC: "var(--bt-faint)", cirBTC: "var(--bt-indigo)" };
const colorOf = (token: string) => TOKEN_COLOR[symbolOf(token)] ?? "var(--bt-muted)";
function Chip({ token }: { token: string }) {
  return (
    <span className="inline-flex h-6 min-w-0 items-center gap-1.5 rounded-full bg-card px-2.5">
      <i className="size-2 flex-none rounded-full" style={{ background: colorOf(token) }} /><span className="truncate">{assetName(token)}</span>
    </span>
  );
}

/** Before/after weights for a trade, replayed back from the fund's holdings today (dollar side only). */
function useWeights(entry: FeedEntry, all: FeedEntry[]) {
  return useMemo(() => {
    const t = entry.trade;
    if (!t || t.dollars === undefined || t.fund.state === "Closed") return null;
    let state: Record<string, bigint> = Object.fromEntries(t.fund.holdings.map((h) => [h.token.toLowerCase(), h.value]));
    const trades = all.filter((e) => e.trade && e.fund.address === t.fund.address).sort((x, y) => Number((y.block ?? 0n) - (x.block ?? 0n)));
    for (const e of trades) {
      const d = e.trade!.dollars;
      if (d === undefined) return null;
      const before = { ...state };
      const inK = e.trade!.tokenIn.toLowerCase(), outK = e.trade!.tokenOut.toLowerCase();
      before[outK] = (before[outK] ?? 0n) > d ? before[outK]! - d : 0n;
      before[inK] = (before[inK] ?? 0n) + d;
      if (e.key === entry.key) return { before, after: state };
      state = before;
    }
    return null;
  }, [entry, all]);
}

function Bar({ w }: { w: Record<string, bigint> }) {
  const total = Object.values(w).reduce((s, v) => s + v, 0n) || 1n;
  return (
    <span className="flex h-2.5 flex-1 gap-[2px] overflow-hidden rounded-full">
      {Object.entries(w).filter(([, v]) => v > 0n).map(([t, v]) => (
        <i key={t} style={{ width: `${Number((v * 10_000n) / total) / 100}%`, background: colorOf(t) }} />
      ))}
    </span>
  );
}

/** A2: a manager's move, with before/after, the reason, and why it was allowed. */
export function MoveDetail({ e, all }: { e: FeedEntry; all: FeedEntry[] }) {
  const t = e.trade!;
  const m = managerOf(t.fund);
  const w = useWeights(e, all);
  const toUsdc = symbolOf(t.tokenOut) === "USDC";
  const holdings = t.fund.holdings.reduce((s, h) => s + h.value, 0n);
  const nowOut = t.fund.holdings.find((h) => h.token.toLowerCase() === t.tokenOut.toLowerCase())?.value ?? 0n;
  const nowBps = holdings ? Number((nowOut * 10_000n) / holdings) : 0;
  const maxBps = t.fund.maxWeightBps[t.tokenOut.toLowerCase()] ?? 10_000;
  const odds = t.log?.odds as { probability?: number; label?: string; source?: string } | undefined;
  const prob = odds?.probability !== undefined ? (odds.probability <= 1 ? odds.probability * 100 : odds.probability) : undefined;
  const after = w?.after;
  const total = after ? Object.values(after).reduce((s, v) => s + v, 0n) || 1n : 1n;
  const check = (title: string, note: string) => (
    <div className="flex items-center gap-2.5 py-2.5 text-[14px] [&+&]:border-t [&+&]:border-card-2">
      <CheckCircle weight="fill" className="size-[18px] flex-none text-gain" />
      <span className="flex-1">{title}</span>
      <span className="text-[13px] text-muted">{note}</span>
    </div>
  );
  return (
    <div data-testid="move-detail">
      <div className="flex items-center gap-3">
        <ManagerAvatar manager={m} className="!size-12" />
        <div className="min-w-0">
          <b className="block text-[20px] font-bold leading-[1.2] tracking-[-0.01em]">{e.title}</b>
          <span className="text-[13px] text-muted">{t.fund.name} · {e.when ? `${dayLabel(e.when) === A.todayLabel ? A.today : dateShort(e.when)}, ${timeShort(e.when)}` : ""}</span>
        </div>
      </div>
      {w && (
        <div className="mt-5">
          {([[A.before, w.before], [A.after, w.after]] as const).map(([label, x]) => (
            <div key={label} className="mt-2 flex items-center gap-3 text-[13px] text-muted"><span className="w-12">{label}</span><Bar w={x} /></div>
          ))}
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 pl-[60px] text-[12px] text-muted">
            {Object.entries(after!).filter(([, v]) => v > 0n).map(([tok, v]) => (
              <span key={tok} className="flex items-center gap-1.5"><i className="size-2 rounded-sm" style={{ background: colorOf(tok) }} />{assetName(tok)} {pct(Math.round(Number((v * 10_000n) / total) / 100) * 100)}</span>
            ))}
          </div>
        </div>
      )}
      {t.log && (
        <div className="mt-5 rounded-[18px] bg-card p-4">
          <span className="font-mono text-[11px] uppercase tracking-[.07em] text-faint">{A.why(m.first)}</span>
          <p className="mt-1.5 text-[15px] leading-[1.45]">&ldquo;{plainWords(t.log.message)}&rdquo;</p>
          {prob !== undefined && (
            <div className="mt-2.5 flex items-center justify-between text-[13px]">
              <span className="text-muted">Gemini · {odds?.label}</span>
              <b className="font-semibold text-gain">{A.yes(`${Math.round(prob)}%`)}</b>
            </div>
          )}
        </div>
      )}
      <div className="mt-4">
        {toUsdc ? check(A.dollarsAlways, A.allowedNote) : check(A.allowed(assetName(t.tokenOut)), A.allowedNote)}
        {!toUsdc && check(A.underMax(pct(maxBps)), A.nowAt(pct(Math.round(nowBps / 100) * 100)))}
        {check(A.nobodyWithdrew, A.onlyTrade)}
      </div>
      <div className="mt-3 flex justify-center"><Proof hash={e.hash} label={A.seeOn} /></div>
    </div>
  );
}

/** Web panel for anything that isn't a manager move: what, where, when, and the receipt. */
export function EntryDetail({ e }: { e: FeedEntry }) {
  const rows: [string, ReactNode][] = [
    [A.detailFund, e.fund.name],
    ...(e.amount ? [[A.detailAmount, e.amount] as [string, ReactNode]] : []),
    ...(e.when ? [[A.detailWhen, `${dateShort(e.when)}, ${timeShort(e.when)}`] as [string, ReactNode]] : []),
  ];
  return (
    <div data-testid="entry-detail">
      <div className="flex items-center gap-3">
        {e.leading}
        <b className="text-[20px] font-bold leading-[1.2] tracking-[-0.01em]">{e.title}</b>
      </div>
      <p className="mt-2 text-[14px] text-muted">{e.sub}</p>
      <div className="mt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2.5 text-[14px] [&+&]:border-t [&+&]:border-card-2"><span className="text-muted">{k}</span><b className="bt-num font-semibold">{v}</b></div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Link href={e.href} className="text-[14px] font-semibold text-signal">{A.openFund}</Link>
        <Proof hash={e.hash} label={A.seeOn} />
      </div>
    </div>
  );
}
