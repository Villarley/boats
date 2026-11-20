import type { ReactNode } from "react";
import { BoatsIcon } from "./brand";
import { ManagerAvatar } from "./manager-avatar";
import type { Manager } from "@/lib/fund";

export type Accent = "navy" | "signal" | "slate" | "sky" | "teal" | "indigo";

/** Solid accent fills for people avatars and stacked invite strips. Never used for text. */
export const ACCENT_BG: Record<Accent, string> = {
  navy: "bg-navy", signal: "bg-signal", slate: "bg-muted", sky: "bg-sky", teal: "bg-teal", indigo: "bg-indigo",
};

/** A person who isn't a fund (an investor, a joiner): initial on an accent color. */
export function PersonDot({ initial, color, size = 24, ring, className = "" }: { initial: string; color: Accent; size?: number; ring?: string; className?: string }) {
  return (
    <span
      className={`inline-grid flex-none place-items-center rounded-full font-semibold text-white ${ACCENT_BG[color]} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), boxShadow: ring }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export type TicketProps = {
  kicker: string;
  fund: string;
  manager: Pick<Manager, "initials" | "kind" | "verified" | "name" | "first">;
  /** "Carlos invited you": the manager's first name is bolded. */
  invitedYou: string;
  managerNote: string;
  stats: { label: string; value: string; testId?: string }[];
  spotsLabel: string;
  taken: number;
  max: number;
  members: { initial: string; color: Accent }[];
  codeLabel: string;
  code: string;
  expiresLabel: string;
  expires: string;
  /** In a WalletStack the ticket also casts a shadow upward onto the strips behind it. */
  stacked?: boolean;
  className?: string;
  testId?: string;
};

/**
 * Private invite as a boarding pass: signal gradient, perforation with white notches, 3 stats,
 * spots taken, and a navy stub with the invite code.
 */
export function Ticket(p: TicketProps) {
  const first = p.manager.first;
  const rest: ReactNode = p.invitedYou.startsWith(first) ? <><b className="font-semibold text-white">{first}</b>{p.invitedYou.slice(first.length)}</> : p.invitedYou;
  return (
    <article
      className={`relative z-[2] overflow-hidden rounded-[24px] bg-[linear-gradient(160deg,#3A5DEB_0%,#2B4FD8_45%,#2443BF_100%)] text-white ${p.stacked ? "shadow-[0_-6px_18px_rgba(11,26,48,.14),0_18px_38px_rgba(43,79,216,.30)]" : "shadow-ticket"} ${p.className ?? ""}`}
      data-testid={p.testId}
    >
      <div className="px-[18px] pb-5 pt-[18px]">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[12px] uppercase tracking-[.08em] text-white/[.72]">{p.kicker}</p>
          <BoatsIcon size={24} className="opacity-90" />
        </div>
        <h2 className="mt-2.5 text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{p.fund}</h2>
        <div className="mt-3.5 flex items-center gap-2.5 text-[14px] leading-[1.3] text-white/85">
          <ManagerAvatar manager={p.manager} className="!text-[15px] shadow-[0_0_0_2px_rgba(255,255,255,.35)]" />
          <span>
            {rest}
            <small className="block text-[12.5px] text-white/70">{p.managerNote}</small>
          </span>
        </div>
      </div>

      {/* perforation: dashed line + 22px white notches */}
      <div className="relative h-[22px]" aria-hidden>
        <i className="absolute inset-x-[22px] top-[10px] border-t-2 border-dashed border-white/35" />
        <i className="absolute -left-[11px] top-0 size-[22px] rounded-full bg-white" />
        <i className="absolute -right-[11px] top-0 size-[22px] rounded-full bg-white" />
      </div>

      <dl className="grid grid-cols-3 gap-2 px-[18px] pb-1.5 pt-4">
        {p.stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[11.5px] text-white/70">{s.label}</dt>
            <dd className="bt-num mt-[3px] text-[19px] font-bold" data-testid={s.testId}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="px-[18px] pb-4 pt-2.5">
        <div className="flex items-center justify-between text-[12.5px] text-white/80">
          <span>{p.spotsLabel}</span>
          <span className="flex pl-[7px]">
            {p.members.map((m, i) => <PersonDot key={i} {...m} size={24} ring="0 0 0 2px #2B4FD8" className="-ml-[7px] !text-[10px]" />)}
          </span>
        </div>
        <div className="mt-2.5 grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${p.max}, 1fr)` }} role="img" aria-label={p.spotsLabel}>
          {Array.from({ length: p.max }, (_, i) => <i key={i} className={`h-2 rounded-[4px] ${i < p.taken ? "bg-white" : "bg-white/[.22]"}`} />)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 bg-[rgba(11,26,48,.22)] px-[18px] py-3 font-mono">
        <div>
          <span className="block text-[10px] uppercase tracking-[.08em] text-white/60">{p.codeLabel}</span>
          <b className="text-[13px] font-semibold tracking-[.06em]">{p.code}</b>
        </div>
        <i className="h-[26px] flex-1 rounded-[2px] bg-[repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_4px,#fff_4px_5px,transparent_5px_8px,#fff_8px_11px,transparent_11px_12px)] opacity-85" aria-hidden />
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-[.08em] text-white/60">{p.expiresLabel}</span>
          <b className="text-[13px] font-semibold tracking-[.06em]">{p.expires}</b>
        </div>
      </div>
    </article>
  );
}
