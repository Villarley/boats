"use client";
import { useState } from "react";
import { ChatCircle, Copy } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { ListGroup, ListRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { useStore } from "@/lib/store";
import { deployment } from "@/lib/deployment";
import { managerOf, worstCaseBps } from "@/lib/fund";
import { worstCase } from "@/lib/boat";
import { pct } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";
import { terms } from "@/lib/copy";

const I = appCopy.invite;

/** Invite family to a fund that is still open: yours if you manage one, else the safest open one. */
export default function Invite() {
  const { boats } = useStore();
  const open = boats.filter((x) => x.state === "Open");
  const featured = new Set(deployment.boats.map((x) => x.address.toLowerCase()));
  const b = open.find((x) => x.position.isCaptain) ?? [...open].sort((x, y) => Number(featured.has(y.address.toLowerCase())) - Number(featured.has(x.address.toLowerCase())) || worstCase(x).bps - worstCase(y).bps)[0];
  const [copied, setCopied] = useState(false);
  const worst = b ? pct(worstCase(b).bps) : "1%";
  const msg = I.message(worst);
  const link = typeof window !== "undefined" && b ? `${location.origin}/boat/${b.address}` : "";
  return (
    <Page testId="invite">
      <TopBar left={<BackButton />} title={I.title} />
      <p className="mt-4 text-[15px] leading-[1.45] text-muted">{I.sub}</p>
      {b && (
        <ListGroup className="mt-4">
          <ListRow leading={<ManagerAvatar manager={managerOf(b)} />} title={b.name} sub={`${managerOf(b).name} · ${terms.status.open}`}
            trailing={<span className="text-[13px] font-semibold text-loss">{I.worst(pct(-worstCaseBps(b)))}</span>} />
        </ListGroup>
      )}
      <div className="mt-3.5 rounded-card bg-card p-4">
        <span className="font-mono text-[11px] uppercase tracking-[.07em] text-faint">{I.messageLabel}</span>
        <div className="mt-2 rounded-[18px_18px_18px_6px] bg-white px-3.5 py-2.5 text-[15px] leading-[1.4]">{msg}</div>
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button icon={<ChatCircle weight="fill" />} href={`https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}`}>{I.whatsapp}</Button>
        <Button variant="secondary" icon={<Copy weight="bold" />} onClick={() => { navigator.clipboard?.writeText(`${msg} ${link}`); setCopied(true); }}>{copied ? I.copied : I.copy}</Button>
      </div>
    </Page>
  );
}
