import { CheckCircle, Sparkle } from "@phosphor-icons/react";
import type { Manager } from "@/lib/fund";

/**
 * The fund's face everywhere: the manager. Person = initials on navy, AI = signal + sparkle,
 * unverified = slate. Verified adds a white badge with a signal check.
 */
export function ManagerAvatar({ manager, size = "md", className = "" }: { manager: Pick<Manager, "initials" | "kind" | "verified" | "name">; size?: "md" | "sm" | "xs"; className?: string }) {
  const bg = manager.kind === "ai" ? "bg-signal" : manager.verified ? "bg-navy" : "bg-muted";
  const dim = size === "md" ? "size-10 text-[14px]" : size === "sm" ? "size-7 text-[11px]" : "size-5 text-[8px]";
  const badge = size === "md" ? "size-[17px] -right-[3px] -bottom-[3px] [&_svg]:size-[15px]" : "size-[13px] -right-[2px] -bottom-[2px] [&_svg]:size-[11px]";
  return (
    <span className={`relative inline-grid flex-none place-items-center rounded-full font-semibold tracking-[.02em] text-white ${bg} ${dim} ${className}`} aria-label={manager.name} role="img">
      {manager.kind === "ai" ? <Sparkle weight="fill" className={size === "md" ? "size-[19px]" : "size-3"} /> : manager.initials}
      {manager.verified && size !== "xs" && (
        <span className={`absolute grid place-items-center rounded-full bg-white text-signal ${badge}`}>
          <CheckCircle weight="fill" />
        </span>
      )}
    </span>
  );
}
