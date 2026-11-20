"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WifiSlash, Info } from "@phosphor-icons/react";
import { TabBar } from "@/components/tab-bar";
import { Sidebar } from "@/components/sidebar";
import { useTrackScreens } from "@/components/top-bar";
import { WithdrawSheet } from "@/components/withdraw-sheet";
import { claimPendingName, useSavedName } from "@/lib/names";
import { useStore } from "@/lib/store";
import { isDeployed } from "@/lib/deployment";
import { appCopy } from "@/lib/copy.app";

function Banner({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div role="status" className="mx-auto mt-3 flex max-w-[600px] gap-3 rounded-card bg-card px-4 py-3.5 lg:max-w-none">
      <span className="mt-0.5 flex-none text-muted [&_svg]:size-[18px]">{icon}</span>
      <div><b className="block text-[15px] font-semibold">{title}</b><span className="text-[14px] text-muted">{children}</span></div>
    </div>
  );
}

/**
 * < 1024: one column (max 600) + floating tab bar and FAB.
 * ≥ 1024: 240px sidebar + page (pages lay out their own `1fr 360px` grid).
 */
export default function TabsLayout({ children }: { children: ReactNode }) {
  const { ready, wallet, error, mode, setMode, captainOf } = useStore();
  const router = useRouter();
  const path = usePathname();
  useTrackScreens();
  // A new account names itself on Welcome; save that name once the account has an address.
  // (Never asked again inside the app: it can be changed from Profile.)
  const saved = useSavedName(wallet?.address);
  useEffect(() => {
    if (wallet && !saved) claimPendingName(wallet.address);
  }, [wallet, saved]);
  useEffect(() => {
    if (ready && !wallet) router.replace("/");
  }, [ready, wallet, router]);
  // Manager screens put the app in manager mode (tab bar, FAB, sidebar); Home puts it back.
  // Only for people who manage a fund: the store drops everyone else back to investor mode,
  // and fighting it loops (someone creating their first fund is still an investor).
  const manages = captainOf.length > 0;
  useEffect(() => {
    if (path.startsWith("/captain") && manages && mode !== "captain") setMode("captain");
    if (path === "/home" && mode !== "crew") setMode("crew");
  }, [path, mode, setMode, manages]);
  if (!ready || !wallet) return <div className="min-h-dvh" />;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="min-w-0 pb-[calc(64px+max(16px,env(safe-area-inset-bottom))+24px)] lg:pb-10">
        {(!isDeployed || error) && (
          <div className="px-5 lg:pl-4 lg:pr-8">
            {!isDeployed && <Banner icon={<Info weight="fill" />} title={appCopy.notices.notDeployedTitle}>{appCopy.notices.notDeployedBody}</Banner>}
            {error && <Banner icon={<WifiSlash weight="bold" />} title={appCopy.notices.offlineTitle}>{error}</Banner>}
          </div>
        )}
        {children}
      </div>
      <TabBar />
      <WithdrawSheet />
    </div>
  );
}
