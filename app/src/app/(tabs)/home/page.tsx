"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowsLeftRight, CaretRight, CircleNotch, Gift, Plus, UserPlus } from "@phosphor-icons/react";
import { exampleSeries } from "@/components/area-chart";
import { ArtBanner } from "@/components/art-banner";
import { BalanceCard } from "@/components/balance-card";
import { Button } from "@/components/button";
import { FolderCard } from "@/components/folder-card";
import { FundsTable } from "@/components/funds-table";
import { IconTile, ListGroup, ListRow, TitleRow } from "@/components/list-group";
import { ManagerAvatar } from "@/components/manager-avatar";
import { OrbitBanner } from "@/components/orbit-banner";
import { PromoCard } from "@/components/promo-card";
import { StatusDot } from "@/components/status-dot";
import { UserAvatar } from "@/components/user-avatar";
import { WebTopBar } from "@/components/web-top-bar";
import { BlockedSheet, useBlockedAlert } from "@/components/blocked-sheet";
import { useMainAction } from "@/components/tab-bar";
import { useStore, type BoatView } from "@/lib/store";
import { useActivityFeed } from "@/lib/activity";
import { CHAIN_NAME, symbolOf } from "@/lib/deployment";
import { PasskeyWallet } from "@/lib/wallet/passkey";
import { copy, terms } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { assetName, pct, usd } from "@/lib/format";
import { useDisplayName, useSavedName } from "@/lib/names";
import { openWithdraw } from "@/lib/ui-state";
import { fundHref, managerOf, myFunds, riskOf, statusOf, worstCaseBps } from "@/lib/fund";
import { NotificationBell } from "@/components/notification-bell";

type ActivityItem = { key: string; leading: ReactNode; title: string; sub: string; amount?: string };

/** The signed-in person's recent activity on their own funds, newest first. */
function useRecent(boats: BoatView[], me?: string): ActivityItem[] {
  const acts = useActivityFeed();
  const byAddr = Object.fromEntries(boats.map((b) => [b.address.toLowerCase(), b]));
  const items: ActivityItem[] = [];
  for (const a of acts) {
    const b = byAddr[a.boat.toLowerCase()];
    if (!b) continue;
    const mine = b.position.deposit > 0n;
    const args = a.args as Record<string, bigint | string>;
    const who = String(args.crew ?? "").toLowerCase();
    if (a.kind === "traded" && mine) {
      const fromDollars = symbolOf(String(args.tokenIn)) === "USDC";
      items.push({
        key: a.txHash + a.kind,
        leading: <IconTile color="indigo"><ArrowsLeftRight weight="bold" /></IconTile>,
        title: appCopy.activity.moved(assetName(String(args.tokenOut))),
        sub: b.name,
        amount: fromDollars ? usd(args.amountIn as bigint, { cents: true }) : undefined,
      });
    } else if (a.kind === "boarded" && who === me) {
      items.push({ key: a.txHash + a.kind, leading: <ManagerAvatar manager={managerOf(b)} />, title: appCopy.activity.invested(b.name), sub: appCopy.activity.investedSub, amount: usd(args.amount as bigint, { cents: true }) });
    } else if (a.kind === "withdrawn" && who === me) {
      items.push({ key: a.txHash + a.kind, leading: <ManagerAvatar manager={managerOf(b)} />, title: appCopy.activity.withdrew(b.name), sub: b.name, amount: usd(args.amount as bigint, { cents: true }) });
    } else if (a.kind === "returned" && mine) {
      items.push({ key: a.txHash + a.kind, leading: <ManagerAvatar manager={managerOf(b)} />, title: appCopy.activity.closed(b.name), sub: appCopy.activity.closedSub });
    }
  }
  return items;
}

const FAMILY = [
  { initial: "A", color: "var(--bt-navy)" },
  { initial: "L", color: "var(--bt-sky)" },
  { initial: "S", color: "var(--bt-teal)" },
  { initial: "C", color: "var(--bt-indigo)" },
];

export default function Home() {
  const { boats, cash, loading, gift, wallet } = useStore();
  const main = useMainAction();
  const name = useDisplayName(wallet?.address);
  const saved = useSavedName(wallet?.address);
  const mine = myFunds(boats).sort((a, b) => (b.position.valueNow > a.position.valueNow ? 1 : -1));
  const invested = mine.reduce((s, b) => s + b.position.valueNow, 0n);
  const deposits = mine.reduce((s, b) => s + b.position.deposit, 0n);
  const delta = invested - deposits;
  const total = cash + invested;
  const top = mine[0];
  const topManager = top ? managerOf(top) : undefined;
  const protection = top && top.captainStake > 0n ? { manager: topManager!.first, amount: usd(top.captainStake, { cents: false }), href: fundHref(top) } : undefined;
  const recent = useRecent(boats, wallet?.address.toLowerCase());
  const toDollars = (v: bigint) => Number(v) / 1e6;
  const week = exampleSeries(toDollars(total - delta), toDollars(total), "week");
  const seriesFor = (r: string) => exampleSeries(toDollars(invested - delta), toDollars(invested), "zigzag", r === "1D" ? 6 : r === "1W" ? 10 : undefined);
  const deltaPct = deposits > 0n ? Number((delta * 10_000n) / deposits) : 0;
  const familyHref = "/invite";
  const blocked = useBlockedAlert();

  const giftCard = (
    <>
      {gift?.state === "sending" && (
        <ListGroup className="mt-4" testId="gift">
          <ListRow leading={<IconTile color="signal"><CircleNotch weight="bold" className="animate-spin" /></IconTile>} title={appCopy.home.gift.sending} sub={appCopy.home.gift.sendingSub} />
        </ListGroup>
      )}
      {gift?.state === "sent" && cash > 0n && mine.length === 0 && (
        <ListGroup className="mt-4" testId="gift">
          <ListRow leading={<IconTile color="gain"><Gift weight="fill" /></IconTile>} title={appCopy.home.gift.sent(usd(gift.amount ?? 0n))} sub={appCopy.home.gift.sentSub} />
        </ListGroup>
      )}
      {cash === 0n && mine.length === 0 && !loading && (CHAIN_NAME === "local" || gift?.state === "unavailable") && (
        <div className="mt-4 rounded-card bg-card p-4">
          <b className="block text-[15px] font-semibold">{appCopy.home.gift.faucetTitle}</b>
          {CHAIN_NAME === "arc" && <p className="mt-1 text-[13px] text-muted">{appCopy.home.gift.faucetBody}</p>}
          <div className="mt-3">
            {CHAIN_NAME === "local" ? (
              <Button href="/add" variant="secondary" size="dense" testId="add-dollars">{appCopy.home.gift.faucetCta}</Button>
            ) : (
              <Button variant="secondary" size="dense" onClick={() => { navigator.clipboard?.writeText(wallet!.address).catch(() => {}); window.open("https://faucet.circle.com", "_blank", "noopener"); }}>{appCopy.home.gift.faucetCta}</Button>
            )}
          </div>
        </div>
      )}
    </>
  );

  const fundRows = mine.map((b) => {
    const m = managerOf(b);
    const d = b.position.valueNow - b.position.deposit;
    return { b, m, d };
  });

  const empty = !loading && mine.length === 0 && (
    <ListGroup className="py-4">
      <b className="block text-[16px] font-semibold">{appCopy.home.empty.title}</b>
      <p className="mt-1 text-[14px] text-muted">{appCopy.home.empty.body}</p>
      <div className="mt-3"><Button href="/explore" variant="secondary" size="dense">{appCopy.home.empty.cta}</Button></div>
    </ListGroup>
  );

  const recentList = (dense: boolean) =>
    recent.length ? (
      <ListGroup testId="recent">
        {recent.slice(0, dense ? 3 : 2).map((i) => (
          <ListRow key={i.key} dense={dense} leading={i.leading} title={i.title} sub={i.sub}
            trailing={i.amount && <b className="bt-num text-[14px] font-semibold text-muted">{i.amount}</b>} />
        ))}
      </ListGroup>
    ) : (
      <p className="rounded-card bg-card px-4 py-3.5 text-[14px] text-muted">{appCopy.home.noActivity}</p>
    );

  return (
    <>
      {/* ---------- mobile / tablet: B1 ---------- */}
      <main className="mx-auto flex max-w-[600px] flex-col px-5 pt-[calc(8px+env(safe-area-inset-top))] lg:hidden" data-testid="home">
        <div className="flex h-11 items-center justify-between">
          <UserAvatar name={name} dot={!(wallet instanceof PasskeyWallet)} />
          <div className="flex items-center gap-2">
            <Link href={familyHref} className="flex h-[38px] items-center gap-[7px] rounded-full bg-card-2 px-3.5 text-[14px] font-semibold">
              <UserPlus weight="fill" className="size-4" />{copy.home.invite}
            </Link>
            <NotificationBell />
          </div>
        </div>

        <FolderCard
          name={saved}
          total={total}
          delta={delta}
          series={week}
          baseline={week[0]}
          protection={protection}
        />

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button href={main.href} size="dense" icon={<Plus weight="bold" />} testId="invest">{terms.invest}</Button>
          <Button onClick={openWithdraw} size="dense" variant="secondary" icon={<ArrowDown weight="bold" />} testId="withdraw-home">{terms.withdraw}</Button>
        </div>

        {giftCard}

        <PromoCard id="worst-case" art="/art/coins.png" title={copy.home.promoTitle} body={copy.home.promoBody} />

        <TitleRow
          title={copy.home.yourFunds}
          action={<Link href="/explore" className="flex items-center gap-0.5 text-[14px] text-muted">{copy.home.seeAll}<CaretRight weight="bold" className="size-3.5" /></Link>}
        />
        {empty || (
          <ListGroup testId="your-funds">
            {fundRows.map(({ b, m, d }) => (
              <ListRow
                key={b.address}
                href={fundHref(b)}
                testId={`my-boat-${b.name}`}
                leading={<ManagerAvatar manager={m} />}
                title={b.name}
                sub={`${m.name} · ${terms.risk[riskOf(b)]}`}
                trailing={
                  <div>
                    <b className="bt-num block text-[16px] font-semibold">{usd(b.position.valueNow, { cents: true })}</b>
                    <span className={`bt-num mt-px block text-[13px] ${d < 0n ? "text-loss" : "text-gain"}`}>{usd(d, { cents: true, sign: true })}</span>
                  </div>
                }
              />
            ))}
          </ListGroup>
        )}

        <TitleRow title={copy.home.recent} />
        {recentList(false)}
      </main>

      {/* ---------- web ≥1024: W1 ---------- */}
      <main className="hidden flex-col pl-4 pr-8 pt-6 lg:flex" data-testid="home-web">
        <WebTopBar title={saved ? copy.home.welcome(saved) : appCopy.home.welcomeNoName} />
        <div className="mt-[22px] grid max-w-[1280px] grid-cols-[1fr_360px] gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <BalanceCard
              label={appCopy.home.totalInvested}
              value={usd(invested, { cents: true })}
              change={`${usd(delta < 0n ? -delta : delta, { cents: true })} (${pct(Math.abs(deltaPct), { digits: 2 })})`}
              changeUp={delta >= 0n}
              changeSuffix={appCopy.home.rangeShort}
              ranges={appCopy.home.ranges}
              seriesFor={seriesFor}
              actions={
                <>
                  <Button href={main.href} size="sm" block={false} icon={<Plus weight="bold" />}>{terms.invest}</Button>
                  <Button onClick={openWithdraw} size="sm" variant="white" block={false} icon={<ArrowDown weight="bold" />} testId="withdraw-web">{terms.withdraw}</Button>
                  <Button href={familyHref} size="sm" variant="white" block={false} icon={<UserPlus weight="fill" />}>{copy.home.invite}</Button>
                </>
              }
            />
            {giftCard}
            {empty || (
              <FundsTable
                headers={appCopy.home.fundsTable}
                rows={fundRows.map(({ b, m, d }) => ({
                  key: b.address,
                  href: fundHref(b),
                  avatar: <ManagerAvatar manager={m} />,
                  name: b.name,
                  sub: `${m.name} · ${terms.risk[riskOf(b)]}`,
                  status: <StatusDot status={statusOf(b)} />,
                  value: usd(b.position.valueNow, { cents: true }),
                  today: <span className={d < 0n ? "text-loss" : "text-gain"}>{usd(d, { cents: true, sign: true })}</span>,
                  worst: <span className="text-loss">{appCopy.home.worstCasePct(pct(-worstCaseBps(b)))}</span>,
                }))}
              />
            )}
            <OrbitBanner
              title={copy.home.familyTitle}
              body={copy.home.familyBody}
              cta={copy.home.invite}
              href={familyHref}
              potLabel={copy.home.familyPot}
              potValue="$4,800"
              potSub={appCopy.home.joined(4, 10)}
              members={FAMILY}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <ArtBanner
              chip={topManager && protection ? <><ManagerAvatar manager={topManager} size="xs" />{copy.home.promoTag(protection.manager, protection.amount)}</> : undefined}
            >
              <b className="block text-[15px] font-semibold">{copy.home.promoTitle}</b>
              <p className="mt-[3px] text-[12.5px] leading-[1.35] text-muted">{copy.home.promoBody}</p>
              {top && (
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-muted">{copy.home.promoRow(top.name)}</span>
                  <b className="bt-num text-[18px] font-semibold text-loss">{usd(-((top.position.deposit * BigInt(worstCaseBps(top))) / 10_000n))}</b>
                </div>
              )}
            </ArtBanner>
            <div>
              <p className="mb-2.5 text-[18px] font-semibold tracking-[-0.01em]">{copy.home.recent}</p>
              {recentList(true)}
            </div>
          </div>
        </div>
      </main>
      <BlockedSheet event={blocked.event} onClose={blocked.dismiss} />
    </>
  );
}
