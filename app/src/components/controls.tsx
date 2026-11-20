"use client";
import type { ReactNode } from "react";

/** iOS toggle: card-3 off, signal on. */
export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative inline-block h-7 w-[46px] flex-none rounded-[14px] transition-colors disabled:opacity-50 ${on ? "bg-signal" : "bg-card-3"}`}
    >
      <span className={`absolute top-[3px] size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`} />
    </button>
  );
}

/**
 * Segmented choice. `tone` colors the selected cell solid (loss limit red, profit target green,
 * max share indigo); default is a white pill on card.
 */
export function Segmented<T extends string | number>({
  options, value, onChange, tone, onWhite, label,
}: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; tone?: "loss" | "gain" | "indigo"; onWhite?: boolean; label: string }) {
  const on = tone === "loss" ? "bg-loss text-white" : tone === "gain" ? "bg-gain text-white" : tone === "indigo" ? "bg-indigo text-white" : "bg-white text-ink shadow-[0_1px_3px_rgba(11,26,48,.12),0_0_0_1px_rgba(11,26,48,.04)]";
  return (
    <div role="radiogroup" aria-label={label} className={`grid rounded-input p-1 ${onWhite ? "bg-white shadow-[0_0_0_1px_var(--bt-card-3)]" : "mt-2 bg-card"}`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`grid h-9 place-items-center rounded-[10px] text-[14px] font-semibold ${o.value === value ? on : "text-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Filter chips row (36px pills, selected = signal). */
export function Chips<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-5 mt-[18px] flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === value} onClick={() => onChange(o)}
          className={`flex h-9 flex-none items-center whitespace-nowrap rounded-full px-[15px] text-[14px] font-medium ${o === value ? "bg-signal text-white" : "bg-card-2 text-ink"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

/** Sticky action pair above the tab bar (max 420 on tablets). */
export function StickyActions({ children, single, aboveTabs = true }: { children: ReactNode; single?: boolean; aboveTabs?: boolean }) {
  return (
    <>
      <div className="h-24 lg:hidden" aria-hidden />
      <div
        className={`pointer-events-none fixed inset-x-0 z-10 mx-auto max-w-[452px] bg-[linear-gradient(180deg,rgba(255,255,255,0),#fff_45%)] px-4 pt-10 lg:hidden ${aboveTabs ? "bottom-[calc(max(16px,env(safe-area-inset-bottom))+64px)] pb-3" : "bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]"}`}
      >
        <div className={`pointer-events-auto grid gap-2.5 ${single ? "grid-cols-1" : "grid-cols-2"}`}>{children}</div>
      </div>
    </>
  );
}
