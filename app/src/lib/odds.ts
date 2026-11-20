"use client";
import { useEffect, useState } from "react";

export type OddsView = { probability: number; label: string; event: string; title: string; fetchedAt: string; sample?: boolean };

/** Gemini odds via our API route (cached server-side). Returns null while loading or if unavailable. */
export function useOdds() {
  const [odds, setOdds] = useState<OddsView | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch("/api/odds").then((r) => (r.ok ? r.json() : null)).then((j) => alive && j && !j.error && setOdds(j)).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return odds;
}
