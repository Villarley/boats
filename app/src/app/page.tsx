"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanSmiley } from "@phosphor-icons/react";
import { friendlyError } from "@boats/sdk";
import { Button } from "@/components/button";
import { ArtBanner } from "@/components/art-banner";
import { Wordmark } from "@/components/brand";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

// Face ID only when a Circle client key is configured; otherwise the account is a key kept on this device.
const PASSKEY = Boolean(process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY);
const W = appCopy.welcome;

export default function Welcome() {
  const { ready, wallet, signIn } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ready && wallet) router.replace("/home");
  }, [ready, wallet, router]);

  const go = async (demo?: "ana" | "grandma") => {
    setBusy(demo ?? "me");
    setErr(null);
    try {
      await signIn(demo ? { demo } : undefined);
      router.replace("/home");
    } catch (e) {
      setErr(/NotAllowed|cancel/i.test(String(e)) ? W.faceIdFailed : friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-between px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-[calc(16px+env(safe-area-inset-top))]">
      <div className="pt-4 text-ink"><Wordmark width={112} /></div>
      <div className="flex flex-col gap-5">
        <ArtBanner minHeight={190}>
          <span className="block text-[13px] text-muted">{copy.home.promoRow("Safe Harbor")}</span>
          <b className="bt-num block text-[30px] font-bold tracking-[-0.02em] text-loss">−$1</b>
          <span className="block text-[12.5px] text-muted">{copy.home.promoTag("Laura", "$1,000")}</span>
        </ArtBanner>
        <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.01em]">{W.headline}</h1>
        <p className="text-[17px] leading-[1.45] text-muted">{W.sub}</p>
      </div>
      <div className="flex flex-col gap-3 pt-6">
        {err && <p role="alert" className="rounded-input bg-card px-4 py-3 text-[15px] text-loss">{err}</p>}
        <Button icon={<ScanSmiley weight="bold" />} onClick={() => go()} loading={busy === "me"} disabled={!!busy} testId="signin">
          {busy === "me" ? W.opening : PASSKEY ? W.faceId : W.open}
        </Button>
        <p className="text-center text-[13px] text-muted">{W.fine}{CHAIN_NAME === "arc" && W.fineArc}</p>
        {CHAIN_NAME === "local" && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="secondary" size="dense" onClick={() => go("grandma")} disabled={!!busy} testId="demo-grandma">{W.demoInvestor}</Button>
            <Button variant="secondary" size="dense" onClick={() => go("ana")} disabled={!!busy} testId="demo-ana">{W.demoManager}</Button>
          </div>
        )}
        {busy && busy !== "me" && <p className="text-center text-[14px] text-muted">{W.settingUp}</p>}
      </div>
    </main>
  );
}
