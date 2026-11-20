"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Chips } from "@/components/controls";
import { Sheet } from "@/components/sheet";
import { X } from "@phosphor-icons/react";
import { WebTopBar } from "@/components/web-top-bar";
import { BlockedSheet, type BlockedEvent } from "@/components/blocked-sheet";
import {
  EntryDetail, FeedRow, MonthCalendar, MoveDetail, WeekStrip, dayLabel, entryDay, filterEntries, todayKey, useFeed, weekOffsetOf, type FeedEntry, type Filter,
} from "@/components/activity-feed";
import { appCopy } from "@/lib/copy.app";

const A = appCopy.activityPage;

/** "Nov 12" for a day key ("2026-10-12", month 0-based). */
function dayTitle(k: string) {
  const [y, m, d] = k.split("-").map(Number);
  return y === undefined || m === undefined || d === undefined ? "" : new Date(y, m, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Rows grouped under "TODAY", "THU · NOV 19"… */
function Groups({ list, selected, onPick }: { list: FeedEntry[]; selected?: string; onPick: (e: FeedEntry) => void }) {
  const groups: { label: string; items: FeedEntry[] }[] = [];
  for (const e of list) {
    const label = dayLabel(e.when);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }
  return (
    <>
      {groups.map((g) => (
        <section key={g.label} className="mt-4">
          <p className="mb-1 px-2.5 font-mono text-[11px] tracking-[.07em] text-faint">{g.label}</p>
          {g.items.map((e) => <FeedRow key={e.key} e={e} selected={e.key === selected} onClick={() => onPick(e)} />)}
        </section>
      ))}
    </>
  );
}

function ActivityScreen() {
  const all = useFeed();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>("All");
  const today = todayKey();
  const [day, setDay] = useState(today);
  const [offset, setOffset] = useState(0);
  const [calendar, setCalendar] = useState(false);
  const showAll = () => { setDay(today); setOffset(0); };
  // Picking the selected day again (or Today) goes back to everything.
  const pickDay = (k: string) => (k === day || k === today ? showAll() : setDay(k));
  const dayDate = dayTitle(day);
  const [picked, setPicked] = useState<string | null>(null);
  const [sheet, setSheet] = useState<BlockedEvent | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Today shows everything; another day shows only that day.
  const list = filterEntries(all, filter).filter((e) => day === today || entryDay(e) === day);
  const open = params.get("item");
  const detail = all.find((e) => e.key === open);

  // Phone: a manager move opens A2 full screen (in the URL, so Back works). Web: it fills the right panel.
  const pick = (e: FeedEntry) => {
    if (e.blocked) return setSheet(e.blocked);
    if (wide) return setPicked(e.key);
    if (e.trade) return router.push(`/activity?item=${encodeURIComponent(e.key)}`);
    router.push(e.href);
  };

  if (detail?.trade && !wide)
    return (
      <Page testId="move">
        <TopBar left={<BackButton fallback="/activity" />} title={A.move} />
        <div className="mt-5"><MoveDetail e={detail} all={all} /></div>
      </Page>
    );

  const panel = list.find((e) => e.key === picked) ?? list.find((e) => e.trade) ?? list.find((e) => !e.blocked);

  return (
    <Page web="wide" testId="activity">
      <WebTopBar title={A.title} />
      <div className="lg:mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
        <div className="min-w-0">
          <h1 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.01em] lg:hidden">{A.title}</h1>
          <WeekStrip entries={all} day={day} onDay={pickDay} offset={offset} onOffset={setOffset} onCalendar={() => setCalendar(true)} />
          {day !== today && dayDate && (
            <button type="button" onClick={showAll} data-testid="show-all"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-card-2 pl-3.5 pr-2.5 text-[13px] font-semibold">
              {A.showingDay(dayDate)}<X weight="bold" className="size-3.5 text-muted" aria-label={A.showAll} />
            </button>
          )}
          <Chips options={A.filters} value={filter} onChange={setFilter} label={A.title} />
          {list.length ? (
            <Groups list={list} selected={wide ? panel?.key : undefined} onPick={pick} />
          ) : (
            <p className="mt-4 rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{day === today ? A.empty : A.nothingDay}</p>
          )}
          <div className="h-6" />
        </div>
        <aside className="sticky top-6 hidden rounded-[24px] border border-card-3 bg-white p-5 lg:block" data-testid="activity-panel">
          {panel ? (panel.trade ? <MoveDetail e={panel} all={all} /> : <EntryDetail e={panel} />) : <p className="text-[14px] text-muted">{A.pick}</p>}
        </aside>
      </div>
      <BlockedSheet event={sheet} onClose={() => setSheet(null)} />
      <Sheet open={calendar} onClose={() => setCalendar(false)} title={A.calendar} testId="calendar-sheet">
        <MonthCalendar entries={all} day={day} onDay={(d) => {
          const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (k === today) showAll(); else { setDay(k); setOffset(weekOffsetOf(d)); }
          setCalendar(false);
        }} />
      </Sheet>
    </Page>
  );
}

export default function ActivityPage() {
  return <Suspense><ActivityScreen /></Suspense>;
}
