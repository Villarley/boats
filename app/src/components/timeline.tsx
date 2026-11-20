import type { ReactNode } from "react";

export type TimelineEvent = { key: string; time: string; title: ReactNode; sub?: ReactNode; amount?: ReactNode; amountClass?: string; color: string };

/** 2px card-3 rail, 10px ring dots colored by event, mono caps time, title 15.5/600, amount right. */
export function Timeline({ events, className = "" }: { events: TimelineEvent[]; className?: string }) {
  return (
    <ol className={`relative mt-4 pl-5 before:absolute before:bottom-[22px] before:left-1 before:top-2 before:w-0.5 before:bg-card-3 ${className}`}>
      {events.map((e, i) => (
        <li key={e.key} className={`relative ${i === events.length - 1 ? "" : "pb-4"}`}>
          <span className="absolute -left-5 top-[5px] size-2.5 rounded-full bg-white" style={{ boxShadow: `inset 0 0 0 2.5px ${e.color}` }} aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[.04em] text-faint">{e.time}</p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2.5">
            <b className="text-[15.5px] font-semibold">{e.title}</b>
            {e.amount && <span className={`bt-num whitespace-nowrap text-[15px] font-bold ${e.amountClass ?? ""}`}>{e.amount}</span>}
          </div>
          {e.sub && <p className="mt-0.5 text-[13px] text-muted">{e.sub}</p>}
        </li>
      ))}
    </ol>
  );
}
