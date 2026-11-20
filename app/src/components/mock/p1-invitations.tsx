"use client";
import { useState } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { Button } from "../button";
import { Ticket } from "../ticket";
import { CloseButton, TopBar } from "../top-bar";
import { WalletStack } from "../wallet-stack";
import { MockActions, MockPage } from "./mock-shell";
import { copy, terms } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, mockData, type MockInvite } from "@/lib/mock-data";

const pctText = (p: number) => `${p < 0 ? "−" : "+"}${Math.abs(p)}%`;

function ticketProps(i: MockInvite) {
  const j = copy.privateJoin;
  return {
    kicker: j.ticketKicker,
    fund: i.fund,
    manager: i.manager,
    invitedYou: j.invitedYou(i.manager.first),
    managerNote: j.familyManager,
    stats: [
      { label: j.covers(i.manager.first), value: dollars(i.stake) },
      { label: terms.lossLimit, value: pctText(i.lossLimitPct) },
      { label: j.fundValue, value: dollars(i.value) },
    ],
    spotsLabel: j.spots(i.taken, i.max),
    taken: i.taken,
    max: i.max,
    members: i.members,
    codeLabel: j.inviteCode,
    code: i.code,
    expiresLabel: j.expires,
    expires: mockCopy.invites.days(i.expiresDays),
  };
}

/** P1 · Invitations: other invites as header strips, the newest as a Ticket in front. */
export function P1Invitations() {
  const invites = mockData.invites;
  const [activeId, setActiveId] = useState(invites[invites.length - 1]!.id);
  const active = invites.find((i) => i.id === activeId)!;
  const strips = invites.filter((i) => i.id !== activeId).map((i) => ({
    id: i.id, fund: i.fund, from: copy.privateJoin.from(i.manager.first), initial: i.manager.initials,
    accent: i.accent, avatar: i.avatar, label: mockCopy.invites.showInvite(i.fund),
  }));
  return (
    <MockPage testId="mock-p1">
      <TopBar title={copy.privateJoin.stackTitle(invites.length)} right={<CloseButton to="/mock" />} />
      {invites.length > 1 ? (
        <WalletStack strips={strips} onSelect={setActiveId}>
          <Ticket {...ticketProps(active)} stacked testId="ticket" />
        </WalletStack>
      ) : (
        <Ticket {...ticketProps(active)} className="mt-1.5" testId="ticket" />
      )}
      <p className="mt-3.5 flex items-center justify-center gap-2.5 text-[13.5px] text-muted">
        <LockSimple weight="fill" className="size-[18px] flex-none text-ink" />
        {copy.privateJoin.cantWithdraw(active.manager.first)}
      </p>
      <MockActions>
        <Button variant="secondary" href="/mock">{mockCopy.invites.notNow}</Button>
        <Button href="/mock/p2">{mockCopy.invites.seeFund}</Button>
      </MockActions>
    </MockPage>
  );
}
