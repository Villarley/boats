"use client";
import { LockSimple, ScanSmiley } from "@phosphor-icons/react";
import { Button } from "../button";
import { BackButton, CloseButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";

/** ID card with a selfie badge: the two things the payments partner asks for. */
function IdIllustration() {
  return (
    <div className="relative mx-auto mt-2 h-[200px] w-[350px] max-w-full" aria-hidden>
      <div className="absolute left-1/2 top-1/2 h-[144px] w-[230px] -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-[18px] bg-[linear-gradient(150deg,#3A5DEB,#2443BF)] p-4 text-white shadow-[0_18px_36px_rgba(43,79,216,.3)]">
        <small className="font-mono text-[10px] uppercase tracking-[.1em] opacity-80">{mockCopy.verify.idCard}</small>
        <span className="absolute left-4 top-11 h-[66px] w-[54px] rounded-[10px] bg-white/[.22]" />
        <i className="absolute left-[84px] top-[52px] h-2 w-[110px] rounded-[4px] bg-white/40" />
        <i className="absolute left-[84px] top-[70px] h-2 w-20 rounded-[4px] bg-white/40" />
        <i className="absolute left-[84px] top-[88px] h-2 w-24 rounded-[4px] bg-white/40" />
      </div>
      <div className="absolute bottom-2.5 right-[42px] grid size-[76px] place-items-center rounded-full bg-white shadow-[0_12px_26px_rgba(11,26,48,.18)]">
        <span className="grid size-[62px] place-items-center rounded-full border-2 border-dashed border-signal bg-signal-50 text-signal">
          <ScanSmiley weight="bold" className="size-[30px]" />
        </span>
      </div>
    </div>
  );
}

/** D2 · Verify it's you: first time only, done by the payments partner. */
export function D2Verify() {
  const v = copy.verify;
  return (
    <MockPage testId="mock-d2">
      <TopBar left={<BackButton to="/mock/d1" />} right={<CloseButton to="/mock" />} />
      <IdIllustration />
      <h1 className="mt-3 text-[28px] font-bold leading-[1.15] tracking-[-0.01em]">{v.title}</h1>
      <p className="mt-2 text-[15px] leading-[1.4] text-muted">{v.body}</p>
      <ol className="mt-5 flex flex-col gap-3.5">
        {v.steps.map(([title, sub], i) => (
          <li key={title} className="grid grid-cols-[26px_1fr] items-start gap-3">
            <em className="pt-0.5 font-mono text-[13px] font-bold not-italic text-signal">{String(i + 1).padStart(2, "0")}</em>
            <div>
              <b className="block text-[15.5px] font-semibold">{title}</b>
              <span className="mt-px block text-[13px] leading-[1.35] text-muted">{sub}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-[18px] flex items-center gap-2 text-[12.5px] text-muted">
        <LockSimple weight="fill" className="size-4 flex-none text-ink" />
        {v.privacy}
      </p>
      <MockActions single>
        <Button href="/mock/d3">{v.cta}</Button>
      </MockActions>
    </MockPage>
  );
}
