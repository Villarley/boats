"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, ShieldCheck } from "@phosphor-icons/react";
import { BackButton, CloseButton, Page, TopBar } from "@/components/top-bar";
import { Button } from "@/components/button";
import { StickyActions } from "@/components/controls";
import { OptionCard } from "@/components/option-card";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

// Example faces for the family path (illustration only).
const FAMILY = [
  { initial: "C", bg: "bg-navy" },
  { initial: "A", bg: "bg-signal" },
  { initial: "M", bg: "bg-muted" },
];

/** M1: who will you manage money for? Family → create a private fund; professional → application (M2). */
export default function ChoosePath() {
  const [path, setPath] = useState<"family" | "pro">("family");
  const router = useRouter();
  const bm = copy.becomeManager;
  return (
    <Page testId="choose-path">
      <TopBar left={<BackButton fallback="/me" />} right={<CloseButton back to="/me" />} />
      <h1 className="mt-4 text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{bm.title}</h1>
      <p className="mt-2 text-[15px] leading-[1.45] text-muted">{bm.sub}</p>
      <div role="radiogroup" aria-label={bm.title}>
        <OptionCard
          selected={path === "family"} onSelect={() => setPath("family")} testId="path-family"
          picture={
            <span className="flex">
              {FAMILY.map((f) => <span key={f.initial} className={`-mr-[9px] grid size-10 place-items-center rounded-full text-[14px] font-semibold text-white shadow-[0_0_0_3px_#fff] ${f.bg}`}>{f.initial}</span>)}
              <span className="grid size-10 place-items-center rounded-full bg-card-2 text-[13px] font-semibold text-muted shadow-[0_0_0_3px_#fff]">+7</span>
            </span>
          }
          title={bm.family.title} desc={bm.family.desc} facts={bm.family.facts}
        />
        <OptionCard
          selected={path === "pro"} onSelect={() => setPath("pro")} testId="path-pro"
          picture={
            <span className="flex items-center gap-2.5">
              <span className="relative grid size-10 place-items-center rounded-full bg-navy text-white">
                <Briefcase weight="fill" className="size-5" />
              </span>
              <span className="inline-flex items-center gap-[5px] text-[13px] font-semibold text-signal"><ShieldCheck weight="fill" className="size-[15px]" />{copy.profile.verified}</span>
            </span>
          }
          title={bm.pro.title} desc={bm.pro.desc} facts={bm.pro.facts}
        />
      </div>
      <StickyActions single aboveTabs>
        <Button onClick={() => router.push(path === "family" ? "/captain/launch?type=private" : "/mock/m2")} testId="path-continue">{appCopy.manager.choosePathCta}</Button>
      </StickyActions>
      <div className="mt-5 hidden lg:block">
        <Button onClick={() => router.push(path === "family" ? "/captain/launch?type=private" : "/mock/m2")}>{appCopy.manager.choosePathCta}</Button>
      </div>
    </Page>
  );
}
