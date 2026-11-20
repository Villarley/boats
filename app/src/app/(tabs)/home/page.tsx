"use client";
import { Plus, ShieldCheck, Calendar, MessageCircle, Gift, Loader2, ExternalLink } from "lucide-react";
import { Flag } from "@/components/flags";
import { Button, Card, Meta, Proof, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { dateShort, pct, usd } from "@/lib/format";
import { FLAG_OF, statusLabel, captainName } from "@/lib/boat";

export default function Home() {
  const { boats, cash, loading, gift, wallet } = useStore();
  const mine = boats.filter((b) => b.position.deposit > 0n && !b.position.withdrawn);
  const onBoats = mine.reduce((s, b) => s + b.position.valueNow, 0n);
  return (
    <Screen>
      <section className="pt-4">
        <div className="label">All my money</div>
        <div className="bt-giant mt-2" data-testid="total">{usd(cash + onBoats)}</div>
        <div className="flex gap-6 mt-3 text-[15px]">
          <span><span className="text-ink-2">In dollars </span><b data-testid="cash">{usd(cash)}</b></span>
          <span><span className="text-ink-2">On boats </span><b>{usd(onBoats)}</b></span>
        </div>
      </section>
      {gift?.state === "sending" && (
        <Card testId="gift">
          <div className="flex items-center gap-3"><Loader2 size={20} className="animate-spin" /><div><div className="font-semibold">Sending you $5 of test dollars</div><div className="text-ink-2 text-[13px]">Real Circle USDC on Arc testnet. A few seconds.</div></div></div>
        </Card>
      )}
      {gift?.state === "sent" && cash > 0n && !boats.some((b) => b.position.deposit > 0n) && (
        <Card testId="gift">
          <div className="flex items-center gap-3"><Gift size={20} strokeWidth={1.5} /><div className="flex-1"><div className="font-semibold">You got {usd(gift.amount ?? 0n)} of test dollars.</div><div className="text-ink-2 text-[13px] flex gap-2 items-center">Now pick a boat and board. <Proof hash={gift.hash} /></div></div></div>
        </Card>
      )}
      {CHAIN_NAME === "arc" && cash === 0n && gift?.state === "unavailable" && wallet && (
        <Card>
          <div className="font-semibold">Get free test dollars</div>
          <p className="text-ink-2 text-[15px] mt-1">Circle gives test USDC on Arc. We copy your address; pick Arc Testnet and paste it.</p>
          <div className="mt-3"><Button variant="secondary" icon={ExternalLink} onClick={() => { navigator.clipboard?.writeText(wallet.address).catch(() => {}); window.open("https://faucet.circle.com", "_blank", "noopener"); }}>Open Circle's faucet</Button></div>
        </Card>
      )}
      <Button href="/add" icon={Plus} testId="add-dollars">Add dollars</Button>

      <h2 className="bt-title text-[1.15rem] mt-2">My boats</h2>
      {loading && !boats.length && <Card><div className="h-12 animate-pulse bg-hair rounded" /></Card>}
      {!loading && mine.length === 0 && (
        <Card>
          <p className="font-semibold">You haven't boarded yet.</p>
          <p className="text-ink-2 text-[15px] mt-1">Pick a boat. You see the worst case before you board.</p>
          <div className="mt-3"><Button href="/explore" variant="secondary">Pick a boat</Button></div>
        </Card>
      )}
      <div className="stack">
        {mine.map((b) => {
          const delta = b.position.valueNow - b.position.deposit;
          const href = b.state === "Closed" ? `/boat/${b.address}/port` : `/boat/${b.address}`;
          return (
            <Card key={b.address} href={href} testId={`my-boat-${b.name}`}>
              <div className="flex items-center gap-3">
                <Flag code={FLAG_OF[b.name] ?? "P"} size={20} />
                <div className="flex-1">
                  <div className="font-semibold">{b.name}</div>
                  <div className="flex gap-3 flex-wrap mt-0.5">
                    <Meta icon={ShieldCheck}>{statusLabel(b)}</Meta>
                    <Meta icon={Calendar}>ends {dateShort(b.endTime)}</Meta>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{usd(b.position.valueNow)}</div>
                  <div className={`text-[13px] ${delta < 0n ? "text-down" : "text-up"}`}>{b.position.deposit ? pct(Number((delta * 10_000n) / b.position.deposit), { sign: true }) : ""}</div>
                </div>
              </div>
              <div className="text-[13px] text-ink-2 mt-2">{captainName(b)}</div>
            </Card>
          );
        })}
      </div>
      <Card href="/invite">
        <div className="flex items-center gap-3">
          <span className="tile"><MessageCircle size={18} strokeWidth={1.5} /></span>
          <div className="flex-1"><div className="font-semibold">Save Mom a seat.</div><div className="text-ink-2 text-[15px]">She sees the rules before she puts in a dollar.</div></div>
        </div>
      </Card>
    </Screen>
  );
}
