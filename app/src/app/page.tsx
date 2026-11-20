"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanFace } from "lucide-react";
import { Flag } from "@/components/flags";
import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHAIN_NAME } from "@/lib/deployment";

// Face ID only when a Circle client key is configured; otherwise the wallet is a key kept on this device.
const PASSKEY = Boolean(process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY);
import { friendlyError } from "@boats/sdk";

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
      setErr(/NotAllowed|cancel/i.test(String(e)) ? "Face ID didn't work. Try again, or use your device code." : friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="screen screen-navy justify-between" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex gap-1 pt-6" aria-hidden>
        {["B", "O", "A", "T", "S"].map((c) => <Flag key={c} code={c} size={16} />)}
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em]">Your money, with a captain.</h1>
        <p className="text-[19px] text-white/75">Someone you trust invests it. Nobody can take it out.</p>
      </div>
      <div className="flex flex-col gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {err && <p role="alert" className="text-[15px] text-white/90 bg-white/10 rounded-2xl px-4 py-3">{err}</p>}
        <button className="btn bg-white text-[#0B1A30]" onClick={() => go()} disabled={!!busy} data-testid="signin">
          <ScanFace size={22} strokeWidth={1.5} /> {busy === "me" ? "Opening…" : PASSKEY ? "Continue with Face ID" : "Open my account"}
        </button>
        <p className="text-center text-[13px] text-white/60">No passwords. No seed phrases.{CHAIN_NAME === "arc" && " $5 of test dollars to start, on Arc."}</p>
        {CHAIN_NAME === "local" && (
          <div className="flex gap-2 pt-2">
            <button className="btn bg-white/10 text-white min-h-[44px] text-[15px]" onClick={() => go("grandma")} data-testid="demo-grandma">Demo: Grandma</button>
            <button className="btn bg-white/10 text-white min-h-[44px] text-[15px]" onClick={() => go("ana")} data-testid="demo-ana">Demo: Captain Ana</button>
          </div>
        )}
        {busy && <Button variant="ghost" disabled>Setting up your account…</Button>}
      </div>
    </main>
  );
}
