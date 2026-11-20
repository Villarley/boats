"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/button";
import { Chips } from "@/components/controls";
import { ListGroup, ListRow, TitleRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { SafetyMeter } from "@/components/safety-meter";
import { UserAvatar } from "@/components/user-avatar";
import { WebTopBar } from "@/components/web-top-bar";
import { useStore } from "@/lib/store";
import { boatScore, isAiCaptain } from "@/lib/boat";
import { useDisplayName } from "@/lib/names";
import { fundHref, isExample, managerOf, riskOf, worstCaseBps } from "@/lib/fund";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { useInvitedFunds } from "@/lib/invitations";
import { NotificationBell } from "@/components/notification-bell";

function ExploreScreen() {
  const { boats, loading, wallet } = useStore();
  const q = (useSearchParams().get("q") ?? "").trim().toLowerCase();
  const [filter, setFilter] = useState<(typeof copy.explore.filters)[number]>("All");
  const name = useDisplayName(wallet?.address);

  const invitedTo = useInvitedFunds();
  const list = useMemo(() => {
    // Private funds show only to their manager, people already in, and people invited.
    let l = boats
      .filter((b) => !b.inviteOnly || b.position.isCaptain || b.position.deposit > 0n || invitedTo.has(b.address.toLowerCase()))
      .map((b) => ({ b, s: boatScore(b).total, m: managerOf(b) }));
    const risk = appCopy.explore.filterRisk[filter];
    if (risk) l = l.filter((x) => riskOf(x.b) === risk);
    if (filter === "AI managers") l = l.filter((x) => isAiCaptain(x.b) || x.m.kind === "ai");
    if (q) l = l.filter((x) => x.b.name.toLowerCase().includes(q) || x.m.name.toLowerCase().includes(q));
    // Safest first; closed funds last.
    return l.sort((a, b) => Number(a.b.state === "Closed") - Number(b.b.state === "Closed") || b.s - a.s || worstCaseBps(a.b) - worstCaseBps(b.b));
  }, [boats, filter, q, invitedTo]);
  const hero = list.find((x) => x.b.state !== "Closed" && x.m.verified && x.b.captainStake > 0n) ?? list[0];

  const row = ({ b, s, m }: (typeof list)[number]) => (
    <ListRow
      key={b.address}
      href={fundHref(b)}
      testId={`boat-card-${b.name}`}
      leading={<ManagerAvatar manager={m} />}
      title={b.name}
      sub={[m.name, terms.risk[riskOf(b)], isExample(b) ? appCopy.exampleLower : ""].filter(Boolean).join(" · ")}
      trailing={<><SafetyMeter score={s} /><CaretRight weight="bold" className="size-4 text-faint" /></>}
    />
  );

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-col px-5 pt-[calc(8px+env(safe-area-inset-top))] lg:max-w-[1280px] lg:pl-4 lg:pr-8 lg:pt-6" data-testid="explore">
      <WebTopBar title={copy.explore.title} />
      <div className="flex h-11 items-center justify-between lg:hidden">
        <UserAvatar name={name} />
        <div className="flex gap-2">
          <IconButton href="/explore" label={appCopy.nav.search}><MagnifyingGlass weight="bold" /></IconButton>
          <NotificationBell />
        </div>
      </div>
      <h1 className="mt-4 text-[34px] font-bold leading-[1.15] tracking-[-0.01em] lg:hidden">{copy.explore.title}</h1>
      <Chips options={copy.explore.filters} value={filter} onChange={setFilter} label={copy.explore.title} />

      {loading && !boats.length && <div className="mt-[18px] h-[280px] animate-pulse rounded-[20px] bg-card" />}

      <div className="lg:mt-[18px] lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
        {hero && (
          <Link href={fundHref(hero.b)} className="mt-[18px] block overflow-hidden rounded-[20px] bg-card lg:order-2 lg:mt-0" data-testid="explore-hero">
            <div className="relative grid h-[190px] place-items-center bg-signal-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/art/boat.png" alt="" className="h-full w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-[10px] bg-white px-2.5 py-1.5"><SafetyMeter score={hero.s} /></span>
            </div>
            <div className="flex items-end justify-between gap-3 p-4">
              <div>
                <b className="block text-[19px] font-semibold">{hero.b.name}</b>
                <p className="mt-[3px] text-[13px] text-muted">{copy.explore.heroSub(hero.m.name)}</p>
              </div>
              <Button size="sm" block={false}>{appCopy.fund.explore}</Button>
            </div>
          </Link>
        )}
        <div className="lg:order-1">
          <TitleRow title={copy.explore.allFunds} className="lg:mt-0" />
          {list.length ? (
            <ListGroup testId="all-funds">
              {list.map(row)}
            </ListGroup>
          ) : (
            !loading && <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{appCopy.explore.none}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Explore() {
  return <Suspense><ExploreScreen /></Suspense>;
}
