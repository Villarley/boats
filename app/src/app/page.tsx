"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanSmiley } from "@phosphor-icons/react";
import { friendlyError } from "@boats/sdk";
import { Button } from "@/components/button";
import { ArtBanner } from "@/components/art-banner";
import { WelcomeHero } from "@/components/welcome-hero";
import { Wordmark } from "@/components/brand";
import { NameField } from "@/components/name-field";
import { PasskeyWallet } from "@/lib/wallet/passkey";
import { setPendingName } from "@/lib/names";
import { takePendingInvitation } from "@/lib/invitations";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";
import { useUnlockName } from "@/lib/unlock";

// Face ID only when a Circle client key is configured; otherwise the account is a key kept on this device.
const PASSKEY = Boolean(process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY);
const W = appCopy.welcome;

export default function Welcome() {
  const { ready, wallet, signIn } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const how = useUnlockName();
  // First time on this device (no Face ID account saved here): ask the name before opening the account.
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => { setIsNew(!PasskeyWallet.hasSaved()); }, []);

  useEffect(() => {
    if (ready && wallet) router.replace(takePendingInvitation() ? "/invitations" : "/home");
  }, [ready, wallet, router]);

  const go = async (demo?: "ana" | "grandma") => {
    setBusy(demo ?? "me");
    setErr(null);
    try {
      if (!demo && isNew) setPendingName(name);
      await signIn(demo ? { demo } : undefined);
      router.replace(takePendingInvitation() ? "/invitations" : "/home");
    } catch (e) {
      setErr(/NotAllowed|cancel/i.test(String(e)) ? appCopy.unlock.failed(how) : friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const art = (min: number) => (
    <ArtBanner minHeight={min}>
      <span className="block text-[13px] text-muted">{copy.home.promoRow("Safe Harbor")}</span>
      <b className="bt-num block text-[30px] font-bold tracking-[-0.02em] text-loss">−$1</b>
      <span className="block text-[12.5px] text-muted">{copy.home.promoTag("Laura", "$1,000")}</span>
    </ArtBanner>
  );

  // Phone: one column, art on top. Web ≥1024: split screen, words and sign-in left, art right.
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-between px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))] lg:grid lg:max-w-[1240px] lg:grid-cols-[minmax(0,440px)_1fr] lg:items-center lg:gap-16 lg:px-10 lg:py-10">
      <div className="relative flex flex-1 flex-col justify-between lg:h-full lg:justify-center lg:py-6">
        <div className="pt-4 text-ink lg:absolute lg:left-0 lg:top-6 lg:pt-0"><Wordmark width={112} /></div>
        <div className="flex flex-col gap-5 lg:gap-6">
          <div className="lg:hidden">{art(190)}</div>
          <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.01em] lg:text-[48px] lg:leading-[1.05] lg:tracking-[-0.02em]">{W.headline}</h1>
          <p className="text-[17px] leading-[1.45] text-muted lg:text-[19px]">{W.sub}</p>
        </div>
        <div className="flex flex-col gap-3 pt-6 lg:pt-10">
          {err && <p role="alert" className="rounded-input bg-card px-4 py-3 text-[15px] text-loss">{err}</p>}
          {isNew && <NameField value={name} onChange={setName} />}
          <Button icon={<ScanSmiley weight="bold" />} onClick={() => go()} loading={busy === "me"} disabled={!!busy || (isNew && !name.trim())} testId="signin">
            {busy === "me" ? W.opening : PASSKEY ? appCopy.unlock.with(W.continue, how) : W.open}
          </Button>
          <p className="text-center text-[13px] text-muted lg:text-left">{W.fine}{CHAIN_NAME === "arc" && W.fineArc}</p>
          {CHAIN_NAME === "local" && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="secondary" size="dense" onClick={() => go("grandma")} disabled={!!busy} testId="demo-grandma">{W.demoInvestor}</Button>
              <Button variant="secondary" size="dense" onClick={() => go("ana")} disabled={!!busy} testId="demo-ana">{W.demoManager}</Button>
            </div>
          )}
          {busy && busy !== "me" && <p className="text-center text-[14px] text-muted lg:text-left">{W.settingUp}</p>}
        </div>
      </div>
      <div className="hidden h-full lg:block"><WelcomeHero /></div>
    </main>
  );
}
