import type { ReactNode } from "react";
import { Ribbons, Sparkle } from "./brand";

/**
 * Light signal-50 art panel with ribbons + sparkles and ONE white floating card on top.
 * The only place ribbons/sparkles are allowed. Never inside blue blocks, never with the logo.
 */
export function ArtBanner({ children, chip, className = "", minHeight = 210 }: { children: ReactNode; chip?: ReactNode; className?: string; minHeight?: number }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-hero bg-signal-50 p-[18px] ${className}`} style={{ minHeight }}>
      <Ribbons />
      <Sparkle size={16} className="absolute left-[22px] top-5 text-white" />
      <Sparkle size={11} className="absolute bottom-6 right-[26px] text-white" />
      <div className="relative w-[250px] max-w-full rounded-card bg-white px-4 py-3.5 shadow-[0_14px_30px_rgba(11,26,48,.16)]">{children}</div>
      {chip && (
        <span className="absolute bottom-4 left-3.5 flex -rotate-[7deg] items-center gap-1.5 rounded-[14px] bg-white px-3 py-2 text-[12px] font-semibold shadow-[0_10px_22px_rgba(11,26,48,.14)]">
          {chip}
        </span>
      )}
    </div>
  );
}
