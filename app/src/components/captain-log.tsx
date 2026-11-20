"use client";
// The manager's decision log (file name kept: it reads /api/captain-log).
import { useEffect, useState } from "react";
import { ArrowsLeftRight, Clock, PauseCircle, X } from "@phosphor-icons/react";
import { IconTile, ListGroup, ListRow } from "./list-group";
import { Proof } from "./proof";
import { appCopy } from "@/lib/copy.app";
import { plainWords } from "@/lib/fund";

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

const TILE = {
  hold: <IconTile color="muted"><PauseCircle weight="fill" /></IconTile>,
  trade: <IconTile color="indigo"><ArrowsLeftRight weight="bold" /></IconTile>,
  blocked: <IconTile color="loss"><X weight="bold" /></IconTile>,
  error: <IconTile color="loss"><X weight="bold" /></IconTile>,
  keeper: <IconTile color="muted"><Clock weight="fill" /></IconTile>,
} as const;

const time = (at: string) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The manager's latest decisions with the number that drove each one. */
export function CaptainLog({ boat, limit = 5 }: { boat?: string; limit?: number }) {
  const log = useCaptainLog(boat);
  if (!log.length) return <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{appCopy.fund.noLog}</p>;
  return (
    <ListGroup testId="captain-log">
      {log.slice(0, limit).map((e, i) => (
        <ListRow key={i} dense leading={TILE[e.kind]} title={appCopy.manager.logTitles[e.kind]}
          sub={<span className="block whitespace-normal">{plainWords(e.message)}<span className="mt-0.5 flex flex-wrap gap-x-3">{time(e.at)}<Proof hash={e.txHash} /></span></span>} />
      ))}
    </ListGroup>
  );
}
