import type { Status } from "@/lib/fund";
import { statusWord } from "@/lib/fund";

const COLOR: Record<Status, string> = {
  open: "bg-[var(--bt-status-open)]",
  active: "bg-[var(--bt-status-active)]",
  closing: "bg-[var(--bt-status-closing)]",
  closed: "bg-[var(--bt-status-closed)]",
};

/** Status = colored dot + word. Replaces the v3 signal flags. */
export function StatusDot({ status, label, className = "" }: { status: Status; label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center text-[13px] font-medium ${className}`}>
      <span className={`mr-1.5 inline-block size-[7px] flex-none rounded-full ${COLOR[status]}`} aria-hidden />
      {label ?? statusWord(status)}
    </span>
  );
}
