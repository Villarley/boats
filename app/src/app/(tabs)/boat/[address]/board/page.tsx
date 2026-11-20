"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CaretDown, CheckCircle, UsersThree } from "@phosphor-icons/react";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { AmountDisplay, Keypad } from "@/components/amount-input";
import { Button } from "@/components/button";
import { IconTile, ListGroup, ListRow } from "@/components/list-group";
import { Sheet } from "@/components/sheet";
import { InvestReview } from "@/components/invest-review";
import { TokenIcon } from "@/components/token-icon";
import { Proof } from "@/components/proof";
import { useBoat } from "@/lib/store";
import { dismissInvitation, useInvitations, type Invitation } from "@/lib/invitations";
import { managerOf } from "@/lib/fund";
import { useInvest } from "@/lib/invest";
import { usd } from "@/lib/format";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

export default function Invest({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const b = useBoat(address);
  const inv = useInvest(b);
  const router = useRouter();
  const [review, setReview] = useState(false);
  const [done, setDone] = useState(false);
  // Came from an invitation (P2 → ?invite=1): review asks "I know …", done is P4, back goes to the invite.
  const [invite, setInvite] = useState<Invitation | null>(null);
  const invites = useInvitations();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("invite") === "1") setInvite(invites.find((i) => i.fund.toLowerCase() === address.toLowerCase()) ?? { fund: address, from: "", code: "", at: 0 });
    // read once on arrival: the invite list can change after joining
  }, [address]);
  const back = invite ? `/invitations/${address}` : `/boat/${address}`;

  if (!b) return <Page><TopBar left={<BackButton fallback={back} />} /><div className="mt-10 h-64 animate-pulse rounded-card bg-card" /></Page>;

  const inviterFirst = b && invite ? (invite.from.trim() || managerOf(b).name).split(" ")[0]! : undefined;
  if (done && invite && b)
    return (
      <Page testId="boarded">
        <TopBar right={<CloseButton to="/home" />} />
        <CheckCircle weight="fill" className="mt-[18px] size-12 text-gain" aria-hidden />
        <h1 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{copy.privateJoin.success(b.name)}</h1>
        <p className="mt-2.5 text-[16px] leading-[1.45] text-muted">{appCopy.privateFund.successBody(inviterFirst!)}</p>
        <ListGroup className="mt-[22px]">
          <ListRow dense leading={<IconTile color="teal"><UsersThree weight="fill" /></IconTile>} title={appCopy.privateFund.youInvested}
            trailing={<b className="bt-num text-[16px] font-semibold">{usd(inv.amount, { cents: true })}</b>} />
          <ListRow dense leading={<span className="grid size-[30px] place-items-center" aria-hidden><i className="size-2.5 rounded-full bg-[var(--bt-status-open)]" /></span>}
            title={appCopy.privateFund.status} sub={appCopy.privateFund.statusSub} />
          <ListRow dense leading={<IconTile color="loss"><Bell weight="fill" /></IconTile>} title={appCopy.privateFund.tellYou} sub={appCopy.privateFund.tellYouSub} />
        </ListGroup>
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => router.push(`/boat/${address}`)}>{appCopy.invest.seeFund}</Button>
          <Button onClick={() => router.push("/home")}>{appCopy.invest.goHome}</Button>
        </div>
      </Page>
    );

  if (done)
    return (
      <Page testId="boarded">
        <TopBar right={<CloseButton to="/home" />} />
        <span className="mt-6 grid size-11 place-items-center rounded-full bg-gain text-white"><CheckCircle weight="fill" className="size-6" /></span>
        <h1 className="mt-4 text-[30px] font-bold leading-[1.15] tracking-[-0.01em]">{appCopy.invest.doneTitle(b.name)}</h1>
        <p className="mt-2.5 text-[16px] leading-[1.45] text-muted">{appCopy.invest.doneBody}</p>
        <div className="mt-3"><Proof hash={inv.hash} /></div>
        <div className="mt-8 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => router.push(back)}>{appCopy.invest.seeFund}</Button>
          <Button onClick={() => router.push("/home")}>{appCopy.invest.goHome}</Button>
        </div>
      </Page>
    );

  if (b.state !== "Open")
    return (
      <Page>
        <TopBar left={<BackButton fallback={back} />} title={copy.invest.title(b.name)} />
        <div className="mt-6 rounded-card bg-card p-4">
          <b className="block text-[16px] font-semibold">{appCopy.invest.notOpenTitle}</b>
          <p className="mt-1 text-[14px] text-muted">{appCopy.invest.notOpenBody}</p>
        </div>
      </Page>
    );

  const caption = inv.amount > 0n
    ? <>{appCopy.invest.worstCaseAbout} <b className="font-semibold text-loss">{usd(-inv.worst, { cents: inv.worst % 1_000_000n !== 0n })}</b></>
    : appCopy.invest.amountLabel;

  return (
    <Page testId="invest">
      <TopBar left={<BackButton fallback={back} />} title={copy.invest.title(b.name)} right={<CloseButton back to={back} />} />
      <AmountDisplay value={inv.value} caption={caption} className="mt-[46px]" />
      <ListGroup className="mt-10">
        <ListRow
          leading={<TokenIcon symbol="USDC" size={34} />}
          title={copy.invest.balance}
          sub={copy.invest.available(usd(inv.cash, { cents: true }))}
          trailing={<CaretDown weight="bold" className="size-4 text-faint" />}
        />
      </ListGroup>
      {inv.short && inv.amount > 0n && (
        <div className="mt-3 flex items-center justify-between rounded-input bg-card px-4 py-3 text-[14px]">
          <span className="text-loss">{appCopy.invest.youHave(usd(inv.cash, { cents: true }))}</span>
          <Button href="/add" size="sm" variant="white" block={false}>{appCopy.invest.addMore(usd(inv.amount - inv.cash, { cents: true }))}</Button>
        </div>
      )}
      <Keypad
        value={inv.value}
        onChange={inv.setValue}
        quick={[
          { label: copy.invest.quick[0], value: inv.quick(1) },
          { label: copy.invest.quick[1], value: inv.quick(0.5) },
          { label: copy.invest.quick[2], value: inv.quick(0.25) },
          { label: copy.invest.quick[3], value: "" },
        ]}
      />
      <Button className="mb-6 mt-[22px]" onClick={() => setReview(true)} disabled={!inv.amount || inv.short} testId="review">{copy.invest.review}</Button>

      <Sheet open={review} onClose={() => setReview(false)} title={copy.invest.sheetTitle} testId="review-sheet">
        <InvestReview b={b} amount={inv.amount} worst={inv.worst} busy={inv.busy} err={inv.err} passkey={inv.passkey} knowManager={inviterFirst}
          onConfirm={async () => { if (await inv.confirm()) { setReview(false); setDone(true); if (invite) dismissInvitation(address); } }} />
      </Sheet>
    </Page>
  );
}
