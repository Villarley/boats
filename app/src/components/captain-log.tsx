"use client";
import { useEffect, useState } from "react";
import { Ban, Clock, PauseCircle, ArrowLeftRight } from "lucide-react";
import { Proof } from "./ui";

export type LogEntry = { at: string; boat: string; kind: "hold" | "trade" | "blocked" | "error" | "keeper"; message: string; txHash?: string };

export function useCaptainLog(boat?: string) {
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/captain-log${boat ? `?boat=${boat}` : ""}`).then((r) => r.json()).then((j) => alive && setLog(j.entries ?? [])).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [boat]);
  return log;
}

const ICON = { hold: PauseCircle, trade: ArrowLeftRight, blocked: Ban, error: Ban, keeper: Clock } as const;
const TITLE = { hold: "Held position", trade: "Traded inside the rules", blocked: "The contract said no.", error: "Didn't go through", keeper: "Keeper" } as const;

export function CaptainLog({ boat, limit = 5 }: { boat?: string; limit?: number }) {
  const log = useCaptainLog(boat);
  if (!log.length) return <p className="text-ink-2 text-[15px] mt-2">No decisions yet. Every decision will show here with the number that drove it.</p>;
  return (
    <div className="mt-2" data-testid="captain-log">
      {log.slice(0, limit).map((e, i) => {
        const Icon = ICON[e.kind];
        return (
          <div key={i} className={`row ${e.kind === "blocked" ? "text-captain" : ""}`}>
            <span className={`tile ${e.kind === "blocked" ? "!bg-tint-red" : ""}`}><Icon size={18} strokeWidth={1.5} /></span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{TITLE[e.kind]}</div>
              <div className="text-ink-2 text-[13px]">{e.message}</div>
              <div className="flex gap-3 text-[13px] text-ink-2 mt-0.5"><span className="inline-flex items-center gap-1"><Clock size={13} strokeWidth={1.5} />{new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span><Proof hash={e.txHash} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
