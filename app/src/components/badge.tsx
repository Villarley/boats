import type { ReactNode } from "react";

/**
 * Badges are neutral grey (card-2 + ink). Never pastel tints. A badge that needs color is solid
 * (e.g. green "Minutes") — pass tone="gain" for that.
 */
export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "gain" | "signal"; className?: string }) {
  const t = tone === "gain" ? "bg-gain text-white" : tone === "signal" ? "bg-signal text-white" : "bg-card-2 text-ink";
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-chip px-[9px] py-1 text-[12px] font-semibold ${t} ${className}`}>{children}</span>;
}
