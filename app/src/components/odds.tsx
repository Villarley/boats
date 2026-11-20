"use client";
import { ChartNoAxesColumn } from "lucide-react";
import { useOdds } from "@/lib/odds";
import { Sample } from "./ui";

export function OddsChip() {
  const o = useOdds();
  if (!o) return null;
  const p = Math.round(o.probability * 100);
  return (
    <div className="flex items-center gap-2 text-[13px]" data-testid="odds">
      <ChartNoAxesColumn size={13} strokeWidth={1.5} />
      <span className="text-ink-2">Market odds of a Fed cut</span>
      <span className="relative inline-block w-16 h-1.5 rounded-full bg-hair overflow-hidden"><span className="absolute inset-y-0 left-0 bg-caution" style={{ width: `${p}%` }} /></span>
      <b>{p}%</b>
      {o.sample && <Sample />}
    </div>
  );
}
