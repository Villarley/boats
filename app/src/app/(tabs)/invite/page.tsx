"use client";
import { useState } from "react";
import { ChatCircle, Copy } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { Chips } from "@/components/controls";
import { ListGroup, ListRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { useStore } from "@/lib/store";
import { managerOf } from "@/lib/fund";
import { worstCase } from "@/lib/boat";
import { inviteLink } from "@/lib/invitations";
import { useDisplayName } from "@/lib/names";
import { pct } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";
import { terms } from "@/lib/copy";

const I = appCopy.invite;

/**
 * Managers invite investors to a fund of theirs that is still open. The link opens the
 * investor's Invitations with this fund as a ticket.
 */
export default function Invite() {
  const { boats, captainOf, wallet } = useStore();
  const me = useDisplayName(wallet?.address);
  const mine = boats.filter((x) => x.state === "Open" && captainOf.some((a) => a.toLowerCase() === x.address.toLowerCase()));
  const [pick, setPick] = useState<string | null>(null);
  const b = mine.find((x) => x.name === pick) ?? mine.at(-1);
  const [copied, setCopied] = useState(false);

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

  // One number everywhere: what an investor putting in $100 could lose at the loss limit.
  const worst = pct(worstCase(b).bps);
  const msg = I.message(worst);
  const link = typeof window !== "undefined" ? inviteLink(location.origin, b.address, me) : "";
  return (
    <Page testId="invite">
      <TopBar left={<BackButton fallback="/captain" />} title={I.title} />
      <p className="mt-4 text-[15px] leading-[1.45] text-muted">{I.sub}</p>
      {mine.length > 1 && <Chips options={mine.map((x) => x.name)} value={b.name} onChange={setPick} label={I.title} />}
      <ListGroup className="mt-4">
        <ListRow leading={<ManagerAvatar manager={managerOf(b)} />} title={b.name} sub={terms.status.open}
          trailing={<span className="text-[13px] font-semibold text-loss">{I.worst(`−${worst}`)}</span>} />
      </ListGroup>
      <div className="mt-3.5 rounded-card bg-card p-4">
        <span className="font-mono text-[11px] uppercase tracking-[.07em] text-faint">{I.messageLabel}</span>
        <div className="mt-2 rounded-[18px_18px_18px_6px] bg-white px-3.5 py-2.5 text-[15px] leading-[1.4]">{msg}</div>
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button icon={<ChatCircle weight="fill" />} href={`https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}`}>{I.whatsapp}</Button>
        <Button variant="secondary" icon={<Copy weight="bold" />} onClick={() => { navigator.clipboard?.writeText(`${msg} ${link}`); setCopied(true); }} testId="invite-copy">{copied ? I.copied : I.copy}</Button>
      </div>
    </Page>
  );
}
