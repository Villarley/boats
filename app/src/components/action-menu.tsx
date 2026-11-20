"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, ArrowsDownUp, ChartLineUp, Plus, RocketLaunch, UserPlus } from "@phosphor-icons/react";
import { HelmIcon } from "./brand";
import { copy } from "@/lib/copy";
import { useStore } from "@/lib/store";
import { openWithdraw } from "@/lib/ui-state";
import { appCopy } from "@/lib/copy.app";

// `hide`: screens that already show this action as a button, so the menu doesn't repeat it.
type Action = { key: string; title: string; sub: string; icon: ReactNode; href?: string; run?: () => void; hide?: (path: string) => boolean };
const A = appCopy.actions;
const on = (...paths: string[]) => (path: string) => paths.includes(path);
const isFund = (path: string) => /^\/boat\/[^/]+$/.test(path);

const MANAGER: Action[] = [
  { key: "create", ...A.create, href: "/captain/launch", icon: <RocketLaunch weight="fill" />, hide: on("/captain", "/captain/launch") },
  { key: "trade", ...A.trade, href: "/captain/trade", icon: <ArrowsDownUp weight="bold" />, hide: on("/captain", "/captain/trade") },
  { key: "invite", ...A.inviteInvestors, href: "/invite", icon: <UserPlus weight="fill" />, hide: on("/invite") },
  { key: "add", ...A.add, href: "/add", icon: <Plus weight="bold" />, hide: on("/add") },
];
const INVESTOR: Action[] = [
  { key: "invest", ...A.invest, href: "/explore", icon: <ChartLineUp weight="bold" />, hide: (p) => p === "/home" || p === "/explore" || isFund(p) },
  { key: "add", ...A.add, href: "/add", icon: <Plus weight="bold" />, hide: on("/add") },
  { key: "withdraw", ...A.withdraw, run: openWithdraw, icon: <ArrowDown weight="bold" />, hide: on("/home") },
  { key: "invite", ...A.invite, href: "/invite", icon: <UserPlus weight="fill" />, hide: on("/home", "/invite") },
  // Only where the others are hidden (Home), so the menu still has something to offer.
  { key: "manage", title: copy.profile.manageOthers, sub: copy.profile.manageOthersSub, href: "/manager", icon: <HelmIcon size={20} />, hide: (p) => p !== "/home" },
];

/** Quick actions for this screen: ways to move money (investor) or run a fund (manager), minus what's already on screen. */
export function useActions(): Action[] {
  const { mode, captainOf } = useStore();
  const path = usePathname();
  // Someone who already manages a fund gets their dashboard instead of "Manage money for others".
  const investor = captainOf.length ? INVESTOR.map((a) => (a.key === "manage" ? { ...a, ...A.dashboard, href: "/captain" } : a)) : INVESTOR;
  return (mode === "captain" ? MANAGER : investor).filter((a) => !a.hide?.(path));
}

/**
 * Quick actions that unfold upward from the FAB (mobile) or the sidebar button (web):
 * a white floating card of rows over a light scrim. Esc or a tap outside closes it.
 */
export function ActionMenu({ open, onClose, className = "" }: { open: boolean; onClose: () => void; className?: string }) {
  const actions = useActions();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const row = "flex w-full items-center gap-3 rounded-[18px] px-2.5 py-2.5 text-left active:bg-card";
  return (
    <>
      <div className="fixed inset-0 z-30 bg-[rgba(11,26,48,.18)] lg:bg-transparent" onClick={onClose} aria-hidden />
      <div role="menu" aria-label={appCopy.nav.actions} data-testid="action-menu"
        className={`z-40 flex origin-bottom-right animate-[menu-in_.16s_ease-out] flex-col rounded-[24px] bg-white p-1.5 shadow-float ${className}`}>
        {actions.map((a) => {
          const inner = (
            <>
              <span className="grid size-10 flex-none place-items-center rounded-full bg-card-2 text-ink [&_svg]:size-5">{a.icon}</span>
              <span className="min-w-0">
                <b className="block text-[15px] font-semibold">{a.title}</b>
                <span className="block text-[13px] leading-[1.3] text-muted">{a.sub}</span>
              </span>
            </>
          );
          return a.href ? (
            <Link key={a.key} role="menuitem" href={a.href} onClick={onClose} className={row} data-testid={`action-${a.key}`}>{inner}</Link>
          ) : (
            <button key={a.key} role="menuitem" type="button" onClick={() => { onClose(); a.run?.(); }} className={row} data-testid={`action-${a.key}`}>{inner}</button>
          );
        })}
      </div>
    </>
  );
}
