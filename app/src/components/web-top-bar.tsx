"use client";
import { useRouter } from "next/navigation";
import { Bell, MagnifyingGlass } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { IconButton } from "./button";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

/** Web ≥1024 page header: title, fund search, bell. */
export function WebTopBar({ title }: { title: ReactNode }) {
  const router = useRouter();
  return (
    <div className="hidden h-11 items-center gap-3 lg:flex">
      <h1 className="flex-1 text-[22px] font-semibold">{title}</h1>
      <form
        role="search"
        className="flex h-[42px] w-[300px] items-center gap-2 rounded-full bg-card px-4 text-[14px] text-faint"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          router.push(q ? `/explore?q=${encodeURIComponent(String(q))}` : "/explore");
        }}
      >
        <MagnifyingGlass weight="bold" className="size-4 text-muted" />
        <input name="q" placeholder={copy.explore.search} aria-label={copy.explore.search} className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint" />
      </form>
      <IconButton href="/activity" label={appCopy.nav.notifications}><Bell weight="fill" /></IconButton>
    </div>
  );
}
