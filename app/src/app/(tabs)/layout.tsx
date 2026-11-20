"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TabBar } from "@/components/tabbar";
import { useStore } from "@/lib/store";
import { isDeployed } from "@/lib/deployment";
import { Notice } from "@/components/ui";
import { WifiOff } from "lucide-react";

export default function TabsLayout({ children }: { children: ReactNode }) {
  const { ready, wallet, error } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (ready && !wallet) router.replace("/");
  }, [ready, wallet, router]);
  if (!ready || !wallet) return <div className="app-shell" />;
  return (
    <div className="app-shell">
      {!isDeployed && (
        <div className="px-5 pt-3"><Notice tone="caution" title="Not deployed yet">This network has no Boats contracts yet. Run the deploy, then reload.</Notice></div>
      )}
      {error && (
        <div className="px-5 pt-3"><Notice tone="danger" icon={WifiOff} title="Offline">{error}</Notice></div>
      )}
      {children}
      <TabBar />
    </div>
  );
}
