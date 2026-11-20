"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowsDownUp, ClockCounterClockwise, Compass, House, Plus, RocketLaunch } from "@phosphor-icons/react";
import { HelmIcon } from "./brand";
import type { Icon, IconWeight } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

type IconLike = Icon | ((p: { weight?: IconWeight; className?: string }) => React.ReactNode);
export type NavItem = { href: string; label: string; icon: IconLike; weight: IconWeight; exact?: boolean };

/** Manager mode glyph: the ship's wheel (not a Phosphor icon). */
const Helm = ({ className }: { weight?: IconWeight; className?: string }) => <HelmIcon className={className} />;

export const INVESTOR_NAV: NavItem[] = [
  { href: "/home", label: copy.tabs.home, icon: House, weight: "fill" },
  { href: "/explore", label: copy.tabs.explore, icon: Compass, weight: "fill" },
  { href: "/activity", label: copy.tabs.activity, icon: ClockCounterClockwise, weight: "bold" },
];
export const MANAGER_NAV: NavItem[] = [
  { href: "/captain", label: copy.managerTabs.dashboard, icon: Helm, weight: "fill", exact: true },
  { href: "/captain/trade", label: copy.managerTabs.trade, icon: ArrowsDownUp, weight: "bold" },
  { href: "/activity", label: copy.managerTabs.activity, icon: ClockCounterClockwise, weight: "bold" },
];

export const isActive = (path: string, item: NavItem) => (item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/"));

/** Where the round FAB / sidebar button goes: Invest (investor) or Create (manager). */
export function useMainAction() {
  const { mode, boats } = useStore();
  if (mode === "captain") return { href: "/captain/launch", label: appCopy.nav.create, manager: true };
  const mine = boats.find((b) => b.position.deposit > 0n && !b.position.withdrawn && b.state === "Open");
  return { href: mine ? `/boat/${mine.address}/board` : "/explore", label: appCopy.nav.invest, manager: false };
}

/**
 * Floating pill tab bar (no border, blur) with 3 tabs, plus a separate round FAB:
 * signal Invest for investors, navy Create for managers. Mobile and tablet only.
 */
export function TabBar() {
  const path = usePathname();
  const { mode } = useStore();
  const items = mode === "captain" ? MANAGER_NAV : INVESTOR_NAV;
  const main = useMainAction();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[420px] gap-3 px-4 lg:hidden">
      <nav
        aria-label={mode === "captain" ? copy.managerTabs.dashboard : copy.tabs.home}
        className="pointer-events-auto grid h-16 flex-1 grid-cols-3 items-center rounded-full bg-white/[.86] px-1.5 shadow-tabbar backdrop-blur-[24px] backdrop-saturate-[1.6]"
      >
        {items.map((item) => {
          const on = isActive(path, item);
          const I = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`flex h-[52px] flex-col items-center justify-center gap-[3px] rounded-full text-[10.5px] font-medium ${on ? "bg-card-2 text-ink" : "text-muted"}`}
            >
              <I weight={item.weight} className="size-[21px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href={main.href}
        aria-label={main.label}
        data-testid="fab"
        className={`pointer-events-auto grid size-16 flex-none place-items-center rounded-full text-white ${main.manager ? "bg-navy shadow-fab-navy" : "bg-signal shadow-fab"}`}
      >
        {main.manager ? <RocketLaunch weight="fill" className="size-6" /> : <Plus weight="bold" className="size-6" />}
      </Link>
    </div>
  );
}
