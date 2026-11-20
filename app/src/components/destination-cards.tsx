"use client";
import { Bank } from "@phosphor-icons/react";
import { Badge } from "./badge";

export type Destination = {
  id: string;
  kind: "card" | "bank";
  title: string;
  sub: string;
  badge: string;
  /** Fast = solid green ("Minutes"); slow = neutral grey ("1–2 days"). */
  fast?: boolean;
  /** Text on the mini card ("VISA"). */
  brand?: string;
};

/** Withdraw destinations: card (VISA mini) or bank. Selected = 2px signal. */
export function DestinationCards({ options, value, onChange, label }: { options: Destination[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="mt-2.5 flex flex-col gap-2.5" data-testid="destinations">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] p-3.5 text-left ${on ? "shadow-[inset_0_0_0_2px_var(--bt-signal)]" : "shadow-[inset_0_0_0_1.5px_var(--bt-card-2)]"}`}
            data-testid={`dest-${o.id}`}
          >
            {o.kind === "card" ? (
              <span className="flex h-[30px] w-[46px] items-end justify-end rounded-[6px] bg-[linear-gradient(135deg,#1a1f71,#2c3a9e)] px-[5px] py-[3px] text-[9px] font-extrabold italic text-white" aria-hidden>{o.brand}</span>
            ) : (
              <span className="grid h-[30px] w-[46px] place-items-center rounded-[6px] bg-card text-ink" aria-hidden><Bank weight="fill" className="size-[17px]" /></span>
            )}
            <span className="min-w-0">
              <b className="block truncate text-[15px] font-semibold">{o.title}</b>
              <span className="block truncate text-[12.5px] text-muted">{o.sub}</span>
            </span>
            <Badge tone={o.fast ? "gain" : "neutral"} className="!font-bold">{o.badge}</Badge>
          </button>
        );
      })}
    </div>
  );
}
