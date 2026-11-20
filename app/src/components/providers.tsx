"use client";
import { useEffect, type ReactNode } from "react";
import { StoreProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return <StoreProvider>{children}</StoreProvider>;
}
