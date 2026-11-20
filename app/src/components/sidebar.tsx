"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, User, X } from "@phosphor-icons/react";
import { ActionMenu } from "./action-menu";
import { HelmIcon, Wordmark } from "./brand";
import { Button } from "./button";
import { UserAvatar } from "./user-avatar";
import { INVESTOR_NAV, MANAGER_NAV, isActive } from "./tab-bar";
import { useStore } from "@/lib/store";
import { useDisplayName } from "@/lib/names";
import { terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { usd } from "@/lib/format";

/** Investor / Manager segmented switch. Only for managers with an active path. */
export function ModeSwitch({ className = "" }: { className?: string }) {
  const { mode, setMode } = useStore();
  const router = useRouter();
  const opts = [
    { key: "crew" as const, label: terms.investor, icon: <User weight="fill" className="size-4" />, href: "/home" },
    { key: "captain" as const, label: terms.manager, icon: <HelmIcon size={16} />, href: "/captain" },
  ];
  return (
    <div role="radiogroup" aria-label={appCopy.nav.modeSwitch} className={`grid w-full grid-cols-2 rounded-[22px] bg-card-2 p-1 ${className}`}>
      {opts.map((o) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={mode === o.key}
          onClick={() => { setMode(o.key); router.push(o.href); }}
          className={`flex h-9 items-center justify-center gap-1.5 rounded-[18px] text-[14px] font-semibold ${mode === o.key ? "bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-muted"}`}
          data-testid={`mode-${o.key === "crew" ? "investor" : "manager"}`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Web ≥1024: the tab bar becomes a 240px sidebar. */
export function Sidebar() {
  const path = usePathname();
  const { mode, captainOf, wallet, cash } = useStore();
  const items = mode === "captain" ? MANAGER_NAV : INVESTOR_NAV;
  const [open, setOpen] = useState(false);
  const name = useDisplayName(wallet?.address);
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-1 px-4 py-6 lg:flex">
      <Link href="/home" className="px-2.5 pb-6 pt-1 text-ink"><Wordmark width={112} /></Link>
      {captainOf.length > 0 && <ModeSwitch className="mb-[18px]" />}
      {items.map((item) => {
        const on = isActive(path, item);
        const I = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-[46px] items-center gap-3 rounded-[23px] px-3.5 text-[15px] font-medium ${on ? "bg-card-2 text-ink" : "text-muted"}`}
          >
            <I weight={item.weight} className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <span className="flex-1" />
      <div className="relative mb-3">
        <ActionMenu open={open} onClose={() => setOpen(false)} className="absolute bottom-[calc(100%+10px)] left-0 w-[300px]" />
        <Button onClick={() => setOpen((o) => !o)} icon={open ? <X weight="bold" /> : <Plus weight="bold" />} testId="sidebar-actions"
          className={`relative z-40 ${mode === "captain" ? "!bg-navy" : ""}`}>{appCopy.nav.actions}</Button>
      </div>
      <Link href="/me" className="flex items-center gap-2.5 rounded-2xl bg-card p-2.5 text-[14px] font-semibold" data-testid="sidebar-profile">
        <UserAvatar name={name} href={null} manager={mode === "captain"} />
        <div className="min-w-0">
          {name}
          <small className="bt-num block truncate text-[12px] font-normal text-muted">{mode === "captain" ? `${appCopy.nav.managerRole} · ${usd(cash, { cents: true })}` : appCopy.nav.available(usd(cash, { cents: true }))}</small>
        </div>
      </Link>
    </aside>
  );
}
