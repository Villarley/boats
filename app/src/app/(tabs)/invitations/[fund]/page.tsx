"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, Bank, ShieldCheck, UsersThree } from "@phosphor-icons/react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { IconTile, ListGroup, ListRow } from "@/components/list-group";
import { SafetyMeter } from "@/components/safety-meter";
import { StatusDot } from "@/components/status-dot";
import { StickyActions } from "@/components/controls";
import { NotificationBell } from "@/components/notification-bell";
import { BackButton, Page, TopBar } from "@/components/top-bar";
import { useBoat } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { dismissInvitation, useInvitations } from "@/lib/invitations";
import { boatScore } from "@/lib/boat";
import { managerOf, riskOf, statusOf } from "@/lib/fund";
import { assetName, pct, usd } from "@/lib/format";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const P = appCopy.privateFund;
const MAX_PEOPLE = 10; // family funds: up to 10 people and $25,000 (design M1)
const CAP = 25_000_000_000n;

/** P2 · The fund you were invited to: who's in, room left, and the rules, before you invest. */
export default function InvitedFund({ params }: { params: Promise<{ fund: string }> }) {
  const { fund } = use(params);
  const b = useBoat(fund);
  const router = useRouter();
  const acts = useActivityFeed();
  const inv = useInvitations().find((i) => i.fund.toLowerCase() === fund.toLowerCase());

  if (!b) return <Page><TopBar left={<BackButton fallback="/invitations" />} /><div className="mt-6 h-64 animate-pulse rounded-card bg-card" /></Page>;

  const m = managerOf(b);
  const first = (inv?.from.trim() || m.name).split(" ")[0]!;
  const value = b.nav || b.crewTotal + b.captainStake;
  const people = new Set(acts.filter((a) => a.kind === "boarded" && a.boat.toLowerCase() === b.address.toLowerCase()).map((a) => String((a.args as { crew?: string }).crew).toLowerCase())).size;
  const room = CAP > value ? CAP - value : 0n;
  // "Dollars, US Treasuries, euros": the fund's dollars first, then what it may buy.
  const holds = [b.usdc, ...b.assets.filter((a) => a.toLowerCase() !== b.usdc.toLowerCase())].map((t, i) => (i ? assetName(t).replace(/^(Euros|Bitcoin)$/, (w) => w.toLowerCase()) : assetName(t)));
  const open = b.state === "Open";
  const v = (s: string, cls = "") => <b className={`bt-num text-[15px] font-semibold ${cls}`}>{s}</b>;

  return (
    <Page testId="invited-fund">
      <TopBar left={<BackButton fallback="/invitations" />} title={b.name} right={<NotificationBell />} />
      <div className="mt-[18px] flex items-center justify-between">
        <Badge>{P.badge(first)}</Badge>
        <SafetyMeter score={boatScore(b).total} />
      </div>
      <p className="mt-3 text-[16px] text-muted">{copy.privateJoin.fundValue}</p>
      <p className="bt-num mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.01em]">{usd(value, { cents: true })}</p>
      <StatusDot status={statusOf(b)} label={`${terms.status[statusOf(b)]} · ${terms.risk[riskOf(b)]}`} className="mt-1 text-[14px] font-normal text-muted" />

      <div className="mt-[18px] rounded-card bg-card px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <IconTile color="teal"><UsersThree weight="fill" /></IconTile>
          <span className="flex-1 text-[13.5px] text-muted"><b className="font-semibold text-ink">{P.joined(Math.min(people, MAX_PEOPLE), MAX_PEOPLE)}</b> {P.joinedTail}</span>
        </div>
        <div className="relative mt-3.5 h-1.5 rounded-[4px] bg-card-3" role="img" aria-label={copy.privateJoin.roomLeft(usd(room, { cents: false }))}>
          <i className="absolute inset-y-0 left-0 rounded-[4px] bg-signal" style={{ width: `${Math.min(100, Number((value * 10_000n) / CAP) / 100)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-muted">
          <span>{P.amountIn(usd(value, { cents: false }))}</span>
          <span>{copy.privateJoin.roomLeft(usd(room, { cents: false }))}</span>
        </div>
      </div>

      <ListGroup className="mt-3">
        <ListRow dense leading={<IconTile color="signal"><ShieldCheck weight="fill" /></IconTile>} title={P.coversFirst(first)} trailing={v(usd(b.captainStake, { cents: false }))} />
        <ListRow dense leading={<IconTile color="loss"><ArrowDownRight weight="bold" /></IconTile>} title={terms.lossLimit} trailing={v(pct(-b.stopLossBps), "text-loss")} />
        <ListRow dense leading={<IconTile color="teal"><Bank weight="fill" /></IconTile>} title={P.holds} sub={holds.join(", ")} />
      </ListGroup>
      {!open && <p className="mt-3 text-center text-[13px] text-loss">{appCopy.invitations.closed}</p>}

      <StickyActions aboveTabs>
        <Button variant="secondary" onClick={() => { dismissInvitation(b.address); router.push("/invitations"); }}>{appCopy.invitations.notNow}</Button>
        <Button href={open ? `/boat/${b.address}/board?invite=1` : undefined} disabled={!open} testId="invited-invest">{P.invest}</Button>
      </StickyActions>
      <div className="mt-8 hidden grid-cols-2 gap-2.5 lg:grid">
        <Button variant="secondary" onClick={() => { dismissInvitation(b.address); router.push("/invitations"); }}>{appCopy.invitations.notNow}</Button>
        <Button href={open ? `/boat/${b.address}/board?invite=1` : undefined} disabled={!open}>{P.invest}</Button>
      </div>
    </Page>
  );
}
