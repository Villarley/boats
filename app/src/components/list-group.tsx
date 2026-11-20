import Link from "next/link";
import type { ReactNode } from "react";

/** Grouped list card (card bg, r18) with dotted dividers between rows. */
export function ListGroup({ children, className = "", testId }: { children: ReactNode; className?: string; testId?: string }) {
  return <div className={`rounded-card bg-card px-4 ${className}`} data-testid={testId}>{children}</div>;
}

const DOTS = "[&+&]:bg-[linear-gradient(90deg,var(--bt-divider)_50%,transparent_0)] [&+&]:bg-[length:6px_1px] [&+&]:bg-repeat-x";

/**
 * One row: leading (avatar or icon tile), title + sub, trailing value. `dense` = web side lists.
 */
export function ListRow({
  leading, title, sub, trailing, href, onClick, dense, testId, dividerInset = 52,
}: {
  leading?: ReactNode; title: ReactNode; sub?: ReactNode; trailing?: ReactNode; href?: string; onClick?: () => void; dense?: boolean; testId?: string; dividerInset?: number;
}) {
  const cls = `grid grid-cols-[auto_1fr_auto] items-center gap-3 ${dense ? "py-[11px]" : "py-[13px]"} ${DOTS}`;
  const style = { backgroundPosition: `${dividerInset}px 0` };
  const inner = (
    <>
      {leading ?? <span />}
      <div className="min-w-0">
        <b className={`block truncate ${dense ? "text-[15px] font-medium" : "text-[16px] font-semibold"}`}>{title}</b>
        {sub && <span className="mt-px line-clamp-2 block text-[13px] text-muted">{sub}</span>}
      </div>
      <div className="flex items-center gap-2 text-right">{trailing}</div>
    </>
  );
  if (href) return <Link href={href} onClick={onClick} className={cls} style={style} data-testid={testId}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left`} style={style} data-testid={testId}>{inner}</button>;
  return <div className={cls} style={style} data-testid={testId}>{inner}</div>;
}

/**
 * 30px colored icon tile with a white glyph. Only for Profile/settings, the "Your money is safe"
 * sheet and activity rows (as in the brandbook).
 */
export function IconTile({ children, color }: { children: ReactNode; color: "signal" | "teal" | "indigo" | "sky" | "gain" | "loss" | "muted" }) {
  const bg = { signal: "bg-signal", teal: "bg-teal", indigo: "bg-indigo", sky: "bg-sky", gain: "bg-gain", loss: "bg-loss", muted: "bg-muted" }[color];
  return <span className={`grid size-[30px] flex-none place-items-center rounded-tile text-white [&_svg]:size-[17px] ${bg}`}>{children}</span>;
}

/** Section title row: "Your funds ........ See all >". */
export function TitleRow({ title, action, className = "" }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 mt-[26px] flex items-baseline justify-between ${className}`}>
      <h2 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h2>
      {action}
    </div>
  );
}
