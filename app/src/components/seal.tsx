import { ShieldCheck } from "@phosphor-icons/react";

/** 64px signal circle with a white shield-check and a 6px signal-50 ring (blocked sheet). */
export function Seal({ className = "" }: { className?: string }) {
  return (
    <span className={`mx-auto mb-1 mt-3.5 grid size-16 place-items-center rounded-full bg-signal text-white shadow-[0_0_0_6px_var(--bt-signal-50)] ${className}`} aria-hidden>
      <ShieldCheck weight="fill" className="size-[30px]" />
    </span>
  );
}
