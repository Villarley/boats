"use client";
import type { ReactNode } from "react";
import { StickyActions } from "../controls";

/** Mock screen column: 20px gutter on mobile, max 600 centered in the main column on web. */
export function MockPage({ children, testId, className = "" }: { children: ReactNode; testId?: string; className?: string }) {
  return (
    <main className={`mx-auto flex w-full max-w-[600px] flex-col px-5 pt-[calc(8px+env(safe-area-inset-top))] lg:pt-6 ${className}`} data-testid={testId}>
      {children}
    </main>
  );
}

/** Bottom buttons: sticky above the tab bar on mobile, inline under the content on web. */
export function MockActions({ children, single }: { children: ReactNode; single?: boolean }) {
  return (
    <>
      <StickyActions single={single} aboveTabs>{children}</StickyActions>
      <div className={`mt-8 hidden gap-2.5 lg:grid ${single ? "grid-cols-1" : "grid-cols-2"}`}>{children}</div>
    </>
  );
}
