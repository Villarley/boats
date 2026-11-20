import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export type FundsTableRow = { key: string; href: string; avatar: ReactNode; name: string; sub: string; status: ReactNode; value: string; today: ReactNode; worst: ReactNode };

const GRID = "grid grid-cols-[2fr_1fr_1fr_1fr_1fr_24px] items-center gap-3";
const DOTS = "[&+&]:bg-[linear-gradient(90deg,var(--bt-divider)_50%,transparent_0)] [&+&]:bg-[length:6px_1px] [&+&]:bg-repeat-x";

/** Web: the "Your funds" list becomes a table (status, value, today, worst case). */
export function FundsTable({ headers, rows }: { headers: readonly string[]; rows: FundsTableRow[] }) {
  return (
    <div className="rounded-[20px] bg-card px-5 py-1.5" data-testid="funds-table">
      <div className={`${GRID} ${DOTS} py-3 font-mono text-[11px] uppercase tracking-[.06em] text-muted`} role="row">
        {headers.map((h) => <span key={h} role="columnheader">{h}</span>)}
        <span />
      </div>
      {rows.map((r) => (
        <Link key={r.key} href={r.href} className={`${GRID} ${DOTS} py-3.5 text-[15px] font-medium`} role="row">
          <div className="flex min-w-0 items-center gap-3">
            {r.avatar}
            <div className="min-w-0">
              <b className="block truncate text-[15px] font-semibold">{r.name}</b>
              <span className="block text-[12.5px] font-normal leading-[1.3] text-muted">{r.sub}</span>
            </div>
          </div>
          <span>{r.status}</span>
          <span className="bt-num">{r.value}</span>
          <span className="bt-num">{r.today}</span>
          <span className="bt-num">{r.worst}</span>
          <CaretRight weight="bold" className="size-4 text-faint" />
        </Link>
      ))}
    </div>
  );
}
