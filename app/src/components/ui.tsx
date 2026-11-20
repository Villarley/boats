"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Delete, ExternalLink, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { explorer } from "@/lib/deployment";

export function Screen({ title, back, children, actions, tone = "paper" }: { title?: ReactNode; back?: string | true; children: ReactNode; actions?: ReactNode; tone?: "paper" | "navy" }) {
  const router = useRouter();
  return (
    <main className={`screen ${tone === "navy" ? "screen-navy" : ""}`}>
      {(title || back) && (
        <header className="flex items-center gap-2 min-h-[52px]">
          {back && (
            <button aria-label="Back" className="icon-btn -ml-2" onClick={() => (back === true ? router.back() : router.push(back))}>
              <ChevronLeft size={24} strokeWidth={1.5} />
            </button>
          )}
          {title && <h1 className="bt-title flex-1">{title}</h1>}
          {actions}
        </header>
      )}
      {children}
    </main>
  );
}

export function Button({
  children, onClick, href, variant = "primary", loading, disabled, icon: Icon, type = "button", testId,
}: { children: ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; loading?: boolean; disabled?: boolean; icon?: LucideIcon; type?: "button" | "submit"; testId?: string }) {
  const cls = `btn btn-${variant}`;
  const inner = (
    <>
      {loading ? <Loader2 size={20} className="animate-spin" /> : Icon ? <Icon size={20} strokeWidth={1.5} /> : null}
      <span>{children}</span>
    </>
  );
  if (href && !disabled) return <Link className={cls} href={href} data-testid={testId}>{inner}</Link>;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading} data-testid={testId} aria-busy={loading}>
      {inner}
    </button>
  );
}

export function Meta({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-ink-2 text-[13px]">
      <Icon size={13} strokeWidth={1.5} aria-hidden /> {children}
    </span>
  );
}

export function Card({ children, className = "", href, testId }: { children: ReactNode; className?: string; href?: string; testId?: string }) {
  if (href) return <Link href={href} className={`card block ${className}`} data-testid={testId}>{children}</Link>;
  return <div className={`card ${className}`} data-testid={testId}>{children}</div>;
}

export function ScoreBadge({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-tint-blue text-crew" : value >= 60 ? "bg-tint-yellow text-ink" : "bg-tint-red text-captain";
  return <span className={`score ${tone}`} aria-label={`Seaworthiness ${value} of 100`}>{value}</span>;
}

export function Notice({ tone = "info", icon: Icon, title, children }: { tone?: "info" | "danger" | "ok" | "caution"; icon?: LucideIcon; title?: ReactNode; children?: ReactNode }) {
  const bg = { info: "bg-tint-blue", danger: "bg-tint-red", ok: "bg-tint-blue", caution: "bg-tint-yellow" }[tone];
  return (
    <div className={`notice ${bg}`} role={tone === "danger" ? "alert" : "status"}>
      {Icon && <Icon size={20} strokeWidth={1.5} className="flex-none mt-[2px]" />}
      <div>
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-ink-2 text-[15px]">{children}</div>}
      </div>
    </div>
  );
}

export function Proof({ hash, label = "Proof" }: { hash?: string; label?: string }) {
  if (!hash) return null;
  if (!explorer) return <span className="text-ink-2 text-[13px]" title={hash}>{label}: local chain</span>;
  return (
    <a className="proof" href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
      {label} <ExternalLink size={13} strokeWidth={1.5} />
    </a>
  );
}

export function Keypad({ value, onChange, max }: { value: string; onChange: (v: string) => void; max?: number }) {
  const press = (k: string) => {
    let v = value;
    if (k === "del") v = v.slice(0, -1);
    else if (k === ".") v = v.includes(".") ? v : (v || "0") + ".";
    else {
      if (v.includes(".") && v.split(".")[1]!.length >= 2) return;
      v = v === "0" ? k : v + k;
    }
    if (max !== undefined && Number(v || 0) > max) return;
    onChange(v);
  };
  return (
    <div className="keypad" role="group" aria-label="Amount keypad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"].map((k) => (
        <button key={k} className="key" onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k} data-testid={`key-${k}`}>
          {k === "del" ? <Delete size={24} strokeWidth={1.5} /> : k}
        </button>
      ))}
    </div>
  );
}

export function Amount({ value, label }: { value: string; label?: string }) {
  return (
    <div className="text-center py-6">
      {label && <div className="text-ink-2 mb-1">{label}</div>}
      <div className="bt-giant" data-testid="amount">${value || "0"}</div>
    </div>
  );
}

/** Voyage gauge: floor on the left, goal on the right, the boat's position as a marker. */
export function Gauge({ value, floorLabel, goalLabel, nowLabel }: { value: number; floorLabel: string; goalLabel: string; nowLabel: string }) {
  const left = `${Math.round(value * 100)}%`;
  return (
    <div className="py-2" aria-label={`Voyage position ${nowLabel}`}>
      <div className="relative h-2 rounded-full bg-hair">
        <div className="absolute inset-y-0 left-0 rounded-full bg-crew" style={{ width: left }} />
        <div className="absolute -top-1.5 h-5 w-1 rounded bg-ink" style={{ left: `calc(${left} - 2px)` }} />
      </div>
      <div className="flex justify-between text-[13px] text-ink-2 mt-2">
        <span>Floor {floorLabel}</span>
        <span className="text-ink font-semibold">{nowLabel}</span>
        <span>Goal {goalLabel}</span>
      </div>
    </div>
  );
}

export function Row({ icon: Icon, title, sub, right, testId }: { icon: LucideIcon; title: ReactNode; sub?: ReactNode; right?: ReactNode; testId?: string }) {
  return (
    <div className="row" data-testid={testId}>
      <span className="tile"><Icon size={18} strokeWidth={1.5} /></span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{title}</div>
        {sub && <div className="text-ink-2 text-[13px] flex flex-wrap gap-3">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Sample() {
  return <span className="sample">Sample</span>;
}
