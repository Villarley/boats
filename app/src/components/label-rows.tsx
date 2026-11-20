import type { ReactNode } from "react";

export type LabelRow = { label: string; note?: ReactNode; value: ReactNode; valueClass?: string; testId?: string };

/** Apple Pay style rows, no icons: mono caps label · muted note · value right (600). */
export function LabelRows({ rows, className = "" }: { rows: LabelRow[]; className?: string }) {
  return (
    <div className={`mt-3 ${className}`}>
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[118px_1fr_auto] items-center border-b border-card-2 py-[11px] text-[14.5px] last:border-0">
          <span className="font-mono text-[11px] uppercase tracking-[.07em] text-faint">{r.label}</span>
          <em className="text-[13px] not-italic text-muted">{r.note}</em>
          <b className={`bt-num text-right font-semibold ${r.valueClass ?? ""}`} data-testid={r.testId}>{r.value}</b>
        </div>
      ))}
    </div>
  );
}
