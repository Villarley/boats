"use client";
import { useEffect, useMemo, useState } from "react";
import { CaretRight, CheckCircle, ShieldCheck, X } from "@phosphor-icons/react";
import { ASSET_NAMES } from "@boats/sdk";
import { Sheet } from "./sheet";
import { Seal } from "./seal";
import { Button } from "./button";
import { IconTile, ListGroup, ListRow } from "./list-group";
import { Proof } from "./proof";
import { useCaptainLog, type LogEntry } from "./captain-log";
import { useStore, type BoatView } from "@/lib/store";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { usd } from "@/lib/format";

export type BlockedEvent = { key: string; fund: BoatView; entry: Pick<LogEntry, "message" | "txHash"> };

const assetIn = (msg: string) => Object.values(ASSET_NAMES).find((n) => n !== "Dollars" && msg.toLowerCase().includes(n.toLowerCase())) ?? (/bitcoin|btc/i.test(msg) ? "Bitcoin" : undefined);

/** "Your money is safe": what happened to your money first; the revert lives in technical details. */
export function BlockedSheet({ event, onClose }: { event: BlockedEvent | null; onClose: () => void }) {
  const [tech, setTech] = useState(false);
  if (!event) return null;
  const { fund, entry } = event;
  const yours = fund.position.valueNow || fund.position.deposit;
  return (
    <Sheet open onClose={() => { setTech(false); onClose(); }} center testId="blocked-sheet">
      <Seal />
      <b className="mt-1 text-[26px] font-semibold leading-[1.2]">{copy.blocked.title}</b>
      <p className="mt-2.5 text-[15px] leading-[1.45] text-muted">{appCopy.blocked.body(fund.name, assetIn(entry.message))}</p>
      <ListGroup className="mt-[18px] text-left">
        <ListRow dense leading={<IconTile color="gain"><CheckCircle weight="fill" /></IconTile>} title={copy.blocked.rows[0].title(usd(yours, { cents: true }))} sub={copy.blocked.rows[0].sub} />
        <ListRow dense leading={<IconTile color="loss"><X weight="bold" /></IconTile>} title={copy.blocked.rows[1].title} sub={copy.blocked.rows[1].sub} />
        <ListRow dense leading={<IconTile color="signal"><ShieldCheck weight="fill" /></IconTile>} title={copy.blocked.rows[2].title} sub={copy.blocked.rows[2].sub} />
      </ListGroup>
      <Button className="mt-5" onClick={() => { setTech(false); onClose(); }} testId="blocked-ok">{copy.blocked.ok}</Button>
      <button type="button" onClick={() => setTech((t) => !t)} className="mx-auto mt-3.5 flex items-center gap-1 text-[14px] font-semibold" aria-expanded={tech}>
        {copy.blocked.details} <CaretRight weight="bold" className={`size-3.5 transition-transform ${tech ? "rotate-90" : ""}`} />
      </button>
      {tech && (
        <div className="mt-3 rounded-input bg-card px-3.5 py-3 text-left text-[13px] leading-[1.5] text-muted">
          <b className="block text-ink">{appCopy.blocked.techTitle}</b>
          {appCopy.blocked.techBody}
          <div className="mt-1"><Proof hash={entry.txHash} label={appCopy.blocked.proof} /></div>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The newest stopped trade on a fund you're in that you haven't seen yet.
 * Seen state is per device (localStorage).
 */
export function useBlockedAlert() {
  const { boats } = useStore();
  const log = useCaptainLog();
  const [seen, setSeen] = useState<string[] | null>(null);
  useEffect(() => {
    try { setSeen(JSON.parse(localStorage.getItem("boats.blocked.seen") ?? "[]")); } catch { setSeen([]); }
  }, []);
  const event = useMemo<BlockedEvent | null>(() => {
    if (!seen) return null;
    for (const e of log) {
      if (e.kind !== "blocked") continue;
      const fund = boats.find((b) => b.address.toLowerCase() === e.boat.toLowerCase() && b.position.deposit > 0n && b.state !== "Closed");
      const key = `${e.boat}:${e.at}`;
      if (fund && !seen.includes(key)) return { key, fund, entry: e };
    }
    return null;
  }, [log, boats, seen]);
  const dismiss = () => {
    if (!event) return;
    const next = [...(seen ?? []), event.key].slice(-50);
    setSeen(next);
    try { localStorage.setItem("boats.blocked.seen", JSON.stringify(next)); } catch {}
  };
  return { event, dismiss };
}
