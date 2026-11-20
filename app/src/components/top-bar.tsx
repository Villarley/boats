"use client";
import { useRouter } from "next/navigation";
import { CaretLeft, X } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { IconButton } from "./button";

const BACK = "Back";
const CLOSE = "Close";

/** Round back button: a route, router.back() (true) or a handler. */
export function BackButton({ to = true }: { to?: string | true | (() => void) }) {
  const router = useRouter();
  if (typeof to === "string") return <IconButton href={to} label={BACK}><CaretLeft weight="bold" /></IconButton>;
  return <IconButton label={BACK} onClick={() => (to === true ? router.back() : to())}><CaretLeft weight="bold" /></IconButton>;
}

export function CloseButton({ to = "/home" }: { to?: string | (() => void) }) {
  if (typeof to === "string") return <IconButton href={to} label={CLOSE}><X weight="bold" /></IconButton>;
  return <IconButton label={CLOSE} onClick={to}><X weight="bold" /></IconButton>;
}

/** Mobile screen header (44px): left control, centered title, right control. */
export function TopBar({ left, title, right, className = "" }: { left?: ReactNode; title?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`grid h-11 grid-cols-[38px_1fr_38px] items-center gap-2 ${className}`}>
      <div className="flex">{left}</div>
      <div className="flex min-w-0 items-center justify-center gap-2 truncate text-[16px] font-semibold">{title}</div>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}

/**
 * Page wrapper for mobile-first screens: 20px gutter, max 600, room under the tab bar.
 * ≥1024: `narrow` (flows, forms) stays a centered 600 column; `wide` fills the main area.
 */
export function Page({ children, className = "", testId, web = "narrow" }: { children: ReactNode; className?: string; testId?: string; web?: "narrow" | "wide" }) {
  const lg = web === "wide" ? "lg:max-w-[1280px] lg:mx-0 lg:pl-4 lg:pr-8" : "lg:pt-6";
  return (
    <main className={`mx-auto flex w-full max-w-[600px] flex-col px-5 pt-[calc(8px+env(safe-area-inset-top))] lg:pt-6 ${lg} ${className}`} data-testid={testId}>
      {children}
    </main>
  );
}
