"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { CircleNotch } from "@phosphor-icons/react";

type Variant = "primary" | "secondary" | "outline" | "white";
type Size = "md" | "dense" | "sm";

const VARIANT: Record<Variant, string> = {
  primary: "bg-signal text-white",
  secondary: "bg-card-2 text-ink",
  outline: "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--bt-card-3)]",
  white: "bg-white text-ink", // secondary on a card-colored surface (web balance card)
};
const SIZE: Record<Size, string> = {
  md: "h-[52px] px-5 text-[16px] gap-2 [&_svg]:size-[18px]",
  dense: "h-[46px] px-5 text-[15px] gap-2 [&_svg]:size-[17px]",
  sm: "h-[38px] px-4 text-[14px] gap-1.5 [&_svg]:size-[15px]",
};

/** Pill button. h52 (46 dense, 38 sm). One action color: primary = Signal. */
export function Button({
  children, href, onClick, variant = "primary", size = "md", icon, loading, disabled, type = "button", block = true, className = "", testId, ariaLabel,
}: {
  children: ReactNode; href?: string; onClick?: () => void; variant?: Variant; size?: Size; icon?: ReactNode; loading?: boolean; disabled?: boolean;
  type?: "button" | "submit"; block?: boolean; className?: string; testId?: string; ariaLabel?: string;
}) {
  const cls = `inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[transform,opacity] duration-150 active:scale-[.98] disabled:opacity-45 ${VARIANT[variant]} ${SIZE[size]} ${block ? "w-full" : ""} ${className}`;
  const inner = (
    <>
      {loading ? <CircleNotch weight="bold" className="animate-spin" /> : icon}
      <span>{children}</span>
    </>
  );
  if (href && !disabled) return <Link href={href} className={cls} data-testid={testId} aria-label={ariaLabel}>{inner}</Link>;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || loading} data-testid={testId} aria-label={ariaLabel} aria-busy={loading}>
      {inner}
    </button>
  );
}

/** 38px round grey button for the top bar (search, bell, back). */
export function IconButton({ children, href, onClick, label, className = "" }: { children: ReactNode; href?: string; onClick?: () => void; label: string; className?: string }) {
  const cls = `grid size-[38px] flex-none place-items-center rounded-full bg-card-2 text-ink [&_svg]:size-[18px] ${className}`;
  if (href) return <Link href={href} className={cls} aria-label={label}>{children}</Link>;
  return <button type="button" className={cls} onClick={onClick} aria-label={label}>{children}</button>;
}
