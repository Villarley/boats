"use client";
import { useMemo, useState } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { Ticket, type Accent } from "@/components/ticket";
import { WalletStack } from "@/components/wallet-stack";
import type { BoatView } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { dismissInvitation, inviteCode, useInvitations, type Invitation, inviterOf } from "@/lib/invitations";
import { managerOf, type Manager } from "@/lib/fund";
import { dateShort, pct, usd } from "@/lib/format";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const J = copy.privateJoin;
const I = appCopy.invitations;
const ACCENTS: Accent[] = ["navy", "teal", "indigo", "sky", "slate"];
const MAX = 10; // family funds: up to 10 people (design M1)

/** The inviter is the fund's manager (the on-chain invite comes from their account). */
const inviter = (_inv: Invitation, b: BoatView): Manager => inviterOf(b);

/** P1 · Invitations: funds a manager invited you to, as tickets in a wallet stack. */
export default function Invitations() {
  const acts = useActivityFeed();
  const all = useInvitations();
  const list = useMemo(() => all.map((inv) => ({ inv, b: inv.boat })), [all]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = list.find((x) => x.inv.fund === activeId) ?? list[0];

  const joined = (b: BoatView) => new Set(acts.filter((a) => a.kind === "boarded" && a.boat.toLowerCase() === b.address.toLowerCase()).map((a) => String((a.args as { crew?: string }).crew).toLowerCase())).size;

  if (!active)
    return (
      <Page testId="invitations">
        <TopBar left={<BackButton fallback="/home" />} title={I.title} />
        <div className="mt-6 rounded-card bg-card p-4" data-testid="invitations-empty">
          <b className="block text-[16px] font-semibold">{I.emptyTitle}</b>
          <p className="mt-1 text-[14px] leading-[1.45] text-muted">{I.emptyBody}</p>
          <div className="mt-3"><Button href="/explore" size="dense" variant="secondary" block={false}>{I.explore}</Button></div>
        </div>
      </Page>
    );

  const { inv, b } = active;
  const m = inviter(inv, b);
  const n = Math.min(joined(b), MAX);
  const ticket = (
    <Ticket
      kicker={b.inviteOnly ? J.ticketKicker : I.kicker}
      fund={b.name}
      manager={m}
      invitedYou={J.invitedYou(m.first)}
      managerNote={m.verified ? I.verifiedManager : J.familyManager}
      stats={[
        { label: J.covers(m.first), value: usd(b.captainStake, { cents: false }) },
        { label: terms.lossLimit, value: pct(-b.stopLossBps) },
        { label: J.fundValue, value: usd(b.nav || b.crewTotal + b.captainStake, { cents: false }) },
      ]}
      spotsLabel={J.spots(n, MAX)}
      taken={n}
      max={MAX}
      members={[]}
      codeLabel={J.inviteCode}
      code={inviteCode(inv.fund)}
      expiresLabel={I.ends}
      expires={dateShort(b.endTime)}
      stacked={list.length > 1}
      testId="ticket"
    />
  );
  const strips = list.filter((x) => x !== active).map(({ inv: i, b: f }, k) => {
    const who = inviter(i, f);
    return { id: i.fund, fund: f.name, from: J.from(who.first), initial: who.initials.slice(0, 1), accent: ACCENTS[k % ACCENTS.length]!, avatar: ACCENTS[(k + 2) % ACCENTS.length]!, label: I.show(f.name) };
  });

  return (
    <Page testId="invitations">
      <TopBar left={<BackButton fallback="/home" />} title={J.stackTitle(list.length)} />
      {list.length > 1 ? <WalletStack strips={strips} onSelect={setActiveId}>{ticket}</WalletStack> : <div className="mt-1.5">{ticket}</div>}
      <p className="mt-3.5 flex items-center justify-center gap-2.5 text-center text-[13.5px] text-muted">
        <LockSimple weight="fill" className="size-[18px] flex-none text-ink" />
        {I.cantWithdraw(m.first)}
      </p>
      {b.state !== "Open" && <p className="mt-2 text-center text-[13px] text-loss">{I.closed}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={() => { dismissInvitation(inv.to, inv.fund); setActiveId(null); }} testId="invite-dismiss">{I.notNow}</Button>
        <Button href={`/invitations/${b.address}`} testId="invite-open">{I.seeFund}</Button>
      </div>
    </Page>
  );
}
