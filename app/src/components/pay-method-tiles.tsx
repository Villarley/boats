"use client";
import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react";

export type PayMethod = {
  id: string;
  /** 58×30 mark (Apple Pay black, VISA navy gradient, balance signal). */
  mark: ReactNode;
  markClass: string;
  title: string;
  sub: string;
};

/** Three equal tiles: inset 1.5px card-2; selected = 2px signal + check badge. */
export function PayMethodTiles({ methods, value, onChange, label }: { methods: PayMethod[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-2.5 grid gap-2" style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }} data-testid="pay-methods">
      {methods.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m.id)}
            className={`relative flex h-[104px] flex-col justify-between rounded-[18px] px-2.5 py-3 text-left ${on ? "shadow-[inset_0_0_0_2px_var(--bt-signal)]" : "shadow-[inset_0_0_0_1.5px_var(--bt-card-2)]"}`}
            data-testid={`pay-${m.id}`}
          >
            <span className={`flex h-[30px] w-[58px] items-center justify-center gap-0.5 whitespace-nowrap rounded-[8px] text-[12.5px] font-bold ${m.markClass}`}>{m.mark}</span>
            {on && (
              <span className="absolute right-[9px] top-[9px] grid size-4 place-items-center rounded-full bg-signal text-white" aria-hidden>
                <Check weight="bold" className="size-[10px]" />
              </span>
            )}
            <span className="block">
              <b className="block text-[13.5px] font-semibold leading-[1.25]">{m.title}</b>
              <span className="block text-[11.5px] text-muted">{m.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
