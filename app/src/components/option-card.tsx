import type { ReactNode } from "react";

/**
 * Selectable path card: picture row + radio, title, description, dotted facts.
 * Selected = white with a 2px signal inset ring; otherwise card bg.
 */
export function OptionCard({
  selected, onSelect, picture, title, desc, facts, testId,
}: { selected: boolean; onSelect: () => void; picture: ReactNode; title: string; desc: string; facts: readonly (readonly [string, string])[]; testId?: string }) {
  return (
    <div
      role="radio"
      tabIndex={0}
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onSelect(); } }}
      data-testid={testId}
      className={`mt-3.5 flex w-full cursor-pointer flex-col rounded-hero p-4 text-left ${selected ? "bg-white shadow-[inset_0_0_0_2px_var(--bt-signal),0_6px_18px_rgba(43,79,216,.10)]" : "bg-card"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        {picture}
        <span className={`size-6 flex-none rounded-full ${selected ? "shadow-[inset_0_0_0_7px_var(--bt-signal)]" : "shadow-[inset_0_0_0_2px_var(--bt-faint)]"}`} aria-hidden />
      </div>
      <b className="text-[18px] font-semibold">{title}</b>
      <p className="mt-1 text-[14px] leading-[1.4] text-muted">{desc}</p>
      <div className="mt-3 flex flex-col">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2.5 bg-[linear-gradient(90deg,var(--bt-divider)_50%,transparent_0)] bg-[length:6px_1px] bg-repeat-x py-2 text-[13.5px]">
            <span className="text-muted">{k}</span><b className="text-right font-semibold">{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
