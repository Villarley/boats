"use client";
import { useState } from "react";
import { isAddress } from "viem";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { Chips } from "@/components/controls";
import { ListGroup, ListRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { PersonDot } from "@/components/ticket";
import { useStore } from "@/lib/store";
import { managerOf } from "@/lib/fund";
import { worstCase } from "@/lib/boat";
import { sendInvitation, useSentInvitations } from "@/lib/invitations";
import { useDisplayName } from "@/lib/names";
import { pct } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";
import { terms } from "@/lib/copy";

const I = appCopy.invite;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * Managers invite investors by account ID to a fund of theirs that is still open. The invite
 * shows up in that account's Invitations as a ticket.
 */
export default function Invite() {
  const { boats, captainOf, wallet } = useStore();
  const me = useDisplayName(wallet?.address);
  const mine = boats.filter((x) => x.state === "Open" && captainOf.some((a) => a.toLowerCase() === x.address.toLowerCase()));
  const [pick, setPick] = useState<string | null>(null);
  const b = mine.find((x) => x.name === pick) ?? mine.at(-1);
  const sent = useSentInvitations(b?.address);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  if (!b)
    return (
      <Page testId="invite">
        <TopBar left={<BackButton fallback="/captain" />} title={I.title} />
        <div className="mt-6 rounded-card bg-card p-4">
          <p className="text-[14px] leading-[1.45] text-muted">{I.noFunds}</p>
          <div className="mt-3"><Button href="/captain/launch" size="dense" block={false}>{I.create}</Button></div>
        </div>
      </Page>
    );

  const addr = to.trim();
  const valid = isAddress(addr);
  const self = valid && wallet && addr.toLowerCase() === wallet.address.toLowerCase();
  const send = async () => {
    setBusy(true);
    setNote(null);
    const ok = await sendInvitation(addr, b.address, me);
    setNote(ok ? { ok: true, text: I.sent(short(addr)) } : { ok: false, text: I.failed });
    if (ok) { setTo(""); sent.reload(); }
    setBusy(false);
  };

  return (
    <Page testId="invite">
      <TopBar left={<BackButton fallback="/captain" />} title={I.title} />
      <p className="mt-4 text-[15px] leading-[1.45] text-muted">{I.sub}</p>
      {mine.length > 1 && <Chips options={mine.map((x) => x.name)} value={b.name} onChange={(n) => { setPick(n); setNote(null); }} label={I.title} />}
      <ListGroup className="mt-4">
        <ListRow leading={<ManagerAvatar manager={managerOf(b)} />} title={b.name} sub={terms.status.open}
          trailing={<span className="text-[13px] font-semibold text-loss">{I.worst(`−${pct(worstCase(b).bps)}`)}</span>} />
      </ListGroup>

      <label className="mt-3.5 block rounded-card bg-card px-4 py-3">
        <span className="text-[13px] font-medium text-muted">{I.toLabel}</span>
        <input value={to} onChange={(e) => { setTo(e.target.value); setNote(null); }} placeholder="0x…" spellCheck={false} autoComplete="off" data-testid="invite-to"
          className="mt-1 block w-full bg-transparent font-mono text-[16px] font-medium outline-none placeholder:text-faint" />
      </label>
      <p className={`mt-2 text-[13px] ${addr && !valid ? "text-loss" : "text-muted"}`}>
        {addr && !valid ? I.badAddress : self ? I.notYourself : I.toHint}
      </p>
      {note && <p role="status" className={`mt-2 rounded-input bg-card px-3.5 py-2.5 text-[14px] ${note.ok ? "" : "text-loss"}`} data-testid="invite-note">{note.text}</p>}
      <Button className="mt-4" icon={<PaperPlaneTilt weight="fill" />} onClick={send} loading={busy} disabled={!valid || Boolean(self)} testId="invite-send">{I.send}</Button>

      {sent.list.length > 0 && (
        <>
          <p className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[.06em] text-muted">{I.invited}</p>
          <ListGroup>
            {sent.list.map((i) => (
              <ListRow key={i.to} dense leading={<PersonDot initial={i.to.slice(2, 3).toUpperCase()} color="slate" size={32} />}
                title={<span className="font-mono text-[14px]">{short(i.to)}</span>} sub={I.waiting} />
            ))}
          </ListGroup>
        </>
      )}
    </Page>
  );
}
