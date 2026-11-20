"use client";
import { Backspace } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** Big centered amount: "$" in signal, 64/700. */
export function AmountDisplay({ value, caption, size = 64, className = "" }: { value: string; caption?: ReactNode; size?: number; className?: string }) {
  return (
    <div className={`text-center ${className}`}>
      <p className="bt-num font-bold leading-none tracking-[-0.02em]" style={{ fontSize: size }} data-testid="amount">
        <span className="text-signal">$</span>{value || "0"}
      </p>
      {caption && <p className="mt-2.5 text-[14px] text-muted">{caption}</p>}
    </div>
  );
}

/** Applies one key to a dollar string ("100.5"). Two decimals max; `max` in dollars. */
export function pressKey(value: string, k: string, max?: number) {
  let v = value;
  if (k === "del") v = v.slice(0, -1);
  else if (k === ".") v = v.includes(".") ? v : (v || "0") + ".";
  else {
    if (v.includes(".") && v.split(".")[1]!.length >= 2) return value;
    v = v === "0" ? k : v + k;
  }
  if (max !== undefined && Number(v || 0) > max) return value;
  return v;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

/**
 * Keypad with an optional quick column (MAX / 50% / 25% / Clear) on the left.
 * `quick` items: label + the value they set.
 */
export function Keypad({ value, onChange, max, quick }: { value: string; onChange: (v: string) => void; max?: number; quick?: { label: string; value: string }[] }) {
  const rows = [0, 1, 2, 3].map((r) => KEYS.slice(r * 3, r * 3 + 3));
  return (
    <div className={`bt-num mt-[22px] grid items-center gap-x-2 gap-y-2.5 ${quick ? "grid-cols-[76px_1fr_1fr_1fr]" : "grid-cols-3"}`} role="group" aria-label="Amount keypad">
      {rows.map((row, r) => (
        <div key={r} className="contents">
          {quick && (
            <button type="button" className="grid h-10 place-items-center rounded-full bg-card text-[13px] font-semibold text-signal" onClick={() => onChange(quick[r]?.value ?? "")} data-testid={`quick-${r}`}>
              {quick[r]?.label}
            </button>
          )}
          {row.map((k) => (
            <button key={k} type="button" className="grid h-[52px] place-items-center rounded-input text-[28px] font-normal active:bg-card" onClick={() => onChange(pressKey(value, k, max))} aria-label={k === "del" ? "Delete" : k} data-testid={`key-${k}`}>
              {k === "del" ? <Backspace weight="fill" className="size-6" /> : k}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
