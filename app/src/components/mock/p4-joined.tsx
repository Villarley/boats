"use client";
import { Bell, CheckCircle, UsersThree } from "@phosphor-icons/react";
import { Button } from "../button";
import { IconTile, ListGroup, ListRow } from "../list-group";
import { CloseButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, mockData } from "@/lib/mock-data";

/** P4 · Joined: you're in, what happens next. */
export function P4Joined() {
  const f = mockData.privateFund;
  const j = mockCopy.joined;
  return (
    <MockPage testId="mock-p4">
      <TopBar right={<CloseButton to="/home" />} />
      <CheckCircle weight="fill" className="mt-[18px] size-12 text-gain" aria-hidden />
      <h1 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{copy.privateJoin.success(f.fund)}</h1>
      <p className="mt-2.5 text-[16px] leading-[1.45] text-muted">{copy.privateJoin.successBody(f.manager.first)}</p>
      <ListGroup className="mt-[22px]">
        <ListRow dense dividerInset={0} leading={<IconTile color="teal"><UsersThree weight="fill" /></IconTile>} title={j.youInvested}
          trailing={<b className="bt-num text-[16px] font-semibold">{dollars(f.invest, { cents: true })}</b>} />
        <ListRow dense dividerInset={0} leading={<span className="grid size-[30px] place-items-center" aria-hidden><i className="size-2.5 rounded-full bg-[var(--bt-status-open)]" /></span>}
          title={j.status} sub={j.statusSub(f.taken + 1, f.max)} />
        <ListRow dense dividerInset={0} leading={<IconTile color="loss"><Bell weight="fill" /></IconTile>} title={j.tellYou} sub={j.tellYouSub} />
      </ListGroup>
      <MockActions>
        <Button variant="secondary" href="/mock/p2">{mockCopy.invites.seeFund}</Button>
        <Button href="/home">{j.goHome}</Button>
      </MockActions>
    </MockPage>
  );
}
