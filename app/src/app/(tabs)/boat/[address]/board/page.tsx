"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { AmountDisplay, Keypad } from "@/components/amount-input";
import { Button } from "@/components/button";
import { ListGroup, ListRow } from "@/components/list-group";
import { Sheet } from "@/components/sheet";
import { InvestReview } from "@/components/invest-review";
import { TokenIcon } from "@/components/token-icon";
import { Proof } from "@/components/proof";
import { useBoat } from "@/lib/store";
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
  const back = `/boat/${address}`;

  if (!b) return <Page><TopBar left={<BackButton to={back} />} /><div className="mt-10 h-64 animate-pulse rounded-card bg-card" /></Page>;

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
        <TopBar left={<BackButton to={back} />} title={copy.invest.title(b.name)} />
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
      <TopBar left={<BackButton to={back} />} title={copy.invest.title(b.name)} right={<CloseButton to={back} />} />
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
        <InvestReview b={b} amount={inv.amount} worst={inv.worst} busy={inv.busy} err={inv.err} passkey={inv.passkey}
          onConfirm={async () => { if (await inv.confirm()) { setReview(false); setDone(true); } }} />
      </Sheet>
    </Page>
  );
}
