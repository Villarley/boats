"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Copy, Check, ExternalLink, HelpCircle, LogOut, MessageCircle, ShipWheel, Users, Wallet } from "lucide-react";
import { Button, Card, Row, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHAIN_NAME, explorer } from "@/lib/deployment";
import { usd } from "@/lib/format";

export default function Me() {
  const { wallet, mode, setMode, captainOf, signOut, cash } = useStore();
  const [copied, setCopied] = useState(false);
  const addr = wallet?.address ?? "";
  const router = useRouter();
  const canCaptain = captainOf.length > 0;
  return (
    <Screen title="Me">
      <Card>
        <div className="label">Signed in with</div>
        <div className="font-semibold mt-1">{wallet?.kind === "passkey" ? "Face ID passkey" : "This device"}</div>
        <div className="text-ink-2 text-[13px]">No passwords. No seed phrases. {CHAIN_NAME === "local" ? "Local test chain." : "Arc testnet."}</div>
      </Card>
      {wallet && (
        <Card testId="wallet-card">
          <div className="flex items-center gap-2 label"><Wallet size={13} strokeWidth={1.5} /> Your wallet</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="font-mono text-[15px]" data-testid="wallet-address">{addr.slice(0, 6)}…{addr.slice(-4)}</span>
            <b>{usd(cash)} USDC</b>
          </div>
          <div className="flex gap-4 mt-3 text-[13px]">
            <button className="proof" onClick={() => { navigator.clipboard?.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
              {copied ? <>Copied <Check size={13} strokeWidth={1.5} /></> : <>Copy address <Copy size={13} strokeWidth={1.5} /></>}
            </button>
            {explorer && <a className="proof" href={`${explorer}/address/${addr}`} target="_blank" rel="noreferrer">See it on Arcscan <ExternalLink size={13} strokeWidth={1.5} /></a>}
          </div>
          <p className="text-ink-2 text-[13px] mt-2">You own this wallet. Boats never holds your keys or your money: the contract does.</p>
        </Card>
      )}
      {canCaptain ? (
        mode === "captain" ? (
          <Button variant="secondary" icon={Users} onClick={() => { setMode("crew"); router.push("/home"); }} testId="crew-mode">Back to crew mode</Button>
        ) : (
          <Button icon={ShipWheel} onClick={() => { setMode("captain"); router.push("/captain"); }} testId="captain-mode">Switch to captain mode</Button>
        )
      ) : (
        <Card>
          <div className="font-semibold">Captain mode</div>
          <p className="text-ink-2 text-[15px] mt-1">Launch a boat to unlock it. You set the rules, put in a stake that loses first, and your crew sees everything.</p>
          <div className="mt-3"><Button variant="secondary" icon={ShipWheel} href="/captain/launch" testId="launch">Launch a boat</Button></div>
        </Card>
      )}
      <Card>
        <Link href="/invite" className="block"><Row icon={MessageCircle} title="Invite family" sub="Save Mom a seat" right={<ChevronRight size={18} strokeWidth={1.5} className="text-ink-2" />} /></Link>
        <Row icon={HelpCircle} title="What happens if…" sub="the captain disappears? The money stays inside the rules and the voyage still ends on its date." />
      </Card>
      <Button variant="ghost" icon={LogOut} onClick={() => { signOut(); router.replace("/"); }} testId="signout">Sign out</Button>
    </Screen>
  );
}
