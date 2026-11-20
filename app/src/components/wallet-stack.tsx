"use client";
import type { ReactNode } from "react";
import { ACCENT_BG, PersonDot, type Accent } from "./ticket";

export type StackStrip = {
  id: string;
  fund: string;
  /** "From Diego" (shown in mono caps). */
  from: string;
  initial: string;
  accent: Accent;
  avatar: Accent;
  /** Accessible name for the strip button ("Show Ruiz Friends Fund"). */
  label: string;
};

/**
 * Several invites as an Apple Wallet stack: the others show only their 44px header strip, each in
 * its own accent color, and the active Ticket sits in front. One invite → just the Ticket.
 */
export function WalletStack({ strips, onSelect, children, className = "" }: { strips: StackStrip[]; onSelect?: (id: string) => void; children: ReactNode; className?: string }) {
  return (
    <div className={`mt-1.5 flex flex-col ${className}`} data-testid="wallet-stack">
      {strips.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect?.(s.id)}
          aria-label={s.label}
          className={`-mb-[22px] flex h-[66px] items-start gap-2.5 rounded-t-[22px] px-[18px] pt-3.5 text-left text-white shadow-[0_-4px_14px_rgba(11,26,48,.10)] ${ACCENT_BG[s.accent]}`}
        >
          <b className="mt-px min-w-0 flex-1 truncate text-[16px] font-bold">{s.fund}</b>
          <span className="mt-[5px] flex-none font-mono text-[10.5px] uppercase tracking-[.08em] text-white/75">{s.from}</span>
          <PersonDot initial={s.initial} color={s.avatar} size={26} ring="0 0 0 2px rgba(255,255,255,.35)" />
        </button>
      ))}
      {children}
    </div>
  );
}
