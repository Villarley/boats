"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CaretRight } from "@phosphor-icons/react";
import { BlockedSheet, type BlockedEvent } from "./blocked-sheet";
import { ago, useActivityItems, useBlockTimes, type ActivityEntry } from "./activity-items";
import { useStore } from "@/lib/store";
import { appCopy } from "@/lib/copy.app";

const N = appCopy.notifications;
const SHOW = 6;

function useSeen(address?: string) {
  const key = `boats.notif.seen.${address?.toLowerCase() ?? ""}`;
  const [seen, setSeen] = useState<string[] | null>(null);
  useEffect(() => {
    try { setSeen(JSON.parse(localStorage.getItem(key) ?? "[]")); } catch { setSeen([]); }
  }, [key]);
  const markSeen = (keys: string[]) => {
    const next = [...new Set([...(seen ?? []), ...keys])].slice(-100);
    setSeen(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  return { seen, markSeen };
}

/**
 * Round bell (top right). Opens a small panel under it with the account's latest activity:
 * stopped trades first, then your investments, your managers' trades and payouts, newest first.
 * A red dot marks activity you haven't opened yet.
 */
export function NotificationBell() {
  const { wallet } = useStore();
  const { yours, stopped } = useActivityItems();
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<BlockedEvent | null>(null);
  const { seen, markSeen } = useSeen(wallet?.address);
  // What was already seen when the panel opened, so its "new" dots stay while it's open.
  const [seenAtOpen, setSeenAtOpen] = useState<string[]>([]);
  const items = useMemo(() => [...stopped, ...yours].slice(0, SHOW), [stopped, yours]);
  const timeOf = useBlockTimes(open ? items.map((i) => i.block) : []);
  const unread = seen !== null && items.some((i) => !seen.includes(i.key));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    if (!open) { setSeenAtOpen(seen ?? []); markSeen(items.map((i) => i.key)); }
    setOpen(!open);
  };

  const row = (i: ActivityEntry) => {
    const isNew = !seenAtOpen.includes(i.key);
    const when = ago(i.at ?? timeOf(i.block));
    const inner = (
      <>
        <span className="[&>*]:!size-9">{i.tile}</span>
        <span className="min-w-0 flex-1">
          <b className="block text-[14.5px] font-semibold leading-[1.3]">{i.title}</b>
          <span className="block truncate text-[13px] text-muted">{i.sub}</span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1 self-start pt-0.5">
          {when && <span className="font-mono text-[11px] text-faint">{when}</span>}
          {isNew && <i className="size-2 rounded-full bg-signal" aria-label={N.unread} />}
        </span>
      </>
    );
    const cls = "flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2.5 text-left hover:bg-card";
    if (i.blocked) return <button key={i.key} type="button" className={cls} onClick={() => { setOpen(false); setSheet(i.blocked!); }} data-testid="notif-blocked">{inner}</button>;
    if (i.href) return <Link key={i.key} href={i.href} className={cls} onClick={() => setOpen(false)} data-testid="notif-item">{inner}</Link>;
    return <div key={i.key} className={cls}>{inner}</div>;
  };

  return (
    <div className="relative">
      <button type="button" onClick={toggle} aria-label={N.title} aria-expanded={open} aria-haspopup="dialog" data-testid="bell"
        className="relative grid size-[38px] place-items-center rounded-full bg-card-2 text-ink [&_svg]:size-[18px]">
        <Bell weight="fill" />
        {unread && <i className="absolute right-[7px] top-[7px] size-2 rounded-full bg-loss shadow-[0_0_0_2px_var(--bt-card-2)]" data-testid="bell-dot" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div role="dialog" aria-label={N.title} data-testid="notifications"
            className="absolute right-0 top-[calc(100%+10px)] z-40 flex max-h-[min(560px,75dvh)] w-[min(380px,calc(100vw-32px))] origin-top-right animate-[menu-in_.16s_ease-out] flex-col rounded-[24px] bg-white p-2 shadow-float">
            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2">
              <b className="text-[17px] font-semibold">{N.title}</b>
            </div>
            <div className="min-h-0 overflow-y-auto">
              {items.length ? items.map(row) : <p className="px-2.5 py-3 text-[14px] leading-[1.45] text-muted">{N.empty}</p>}
            </div>
            <Link href="/activity" onClick={() => setOpen(false)} data-testid="notif-all"
              className="mt-1 flex items-center justify-center gap-1 rounded-[16px] bg-card py-3 text-[14px] font-semibold">
              {N.seeAll}<CaretRight weight="bold" className="size-3.5" />
            </Link>
          </div>
        </>
      )}
      <BlockedSheet event={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
