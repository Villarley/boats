"use client";
import { useRouter } from "next/navigation";
import { Bell, HelpCircle, KeyRound, LogOut, MessageCircle, ShipWheel, Users } from "lucide-react";
import { Button, Card, Row, Sample, Screen } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";

export default function Me() {
  const { wallet, mode, setMode, captainOf, signOut } = useStore();
  const router = useRouter();
  const canCaptain = captainOf.length > 0;
  return (
    <Screen title="Me">
      <Card>
        <div className="label">Signed in with</div>
        <div className="font-semibold mt-1">{wallet?.kind === "passkey" ? "Face ID passkey" : "This device"}</div>
        <div className="text-ink-2 text-[13px]">No passwords. No seed phrases. {CHAIN_NAME === "local" ? "Local test chain." : "Arc testnet."}</div>
      </Card>
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
        <Row icon={Bell} title={<span className="flex items-center gap-2">Alerts <Sample /></span>} sub="Tell me when my boat is down 7%, and every captain trade" />
        <Row icon={MessageCircle} title="Invite family" sub="Save Mom a seat" right={<Button variant="ghost" href="/invite">Open</Button>} />
        <Row icon={KeyRound} title={<span className="flex items-center gap-2">Passkeys and devices <Sample /></span>} sub="This phone" />
        <Row icon={HelpCircle} title="What happens if…" sub="the captain disappears? The money stays inside the rules and the voyage still ends on its date." />
      </Card>
      <Button variant="ghost" icon={LogOut} onClick={() => { signOut(); router.replace("/"); }} testId="signout">Sign out</Button>
    </Screen>
  );
}
