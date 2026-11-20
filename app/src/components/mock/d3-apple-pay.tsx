"use client";
import { useRouter } from "next/navigation";
import { AppleLogo, CaretRight, X } from "@phosphor-icons/react";
import { AmountDisplay } from "../amount-input";
import { MockPage } from "./mock-shell";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, mockData } from "@/lib/mock-data";

/**
 * D3 · Apple Pay. The sheet is the operating system's, not ours: it's drawn as in the brandbook
 * (system grey, SF-style rows, side-button prompt) on top of the amount it pays.
 */
export function D3ApplePay() {
  const router = useRouter();
  const d = mockData.pay;
  const a = mockCopy.applePay;
  const close = () => router.push("/mock/d1");
  return (
    <MockPage testId="mock-d3">
      <div className="h-11" />
      <AmountDisplay value={String(d.initial)} className="mt-[60px]" />

      <div className="fixed inset-0 z-50" data-testid="apple-pay-sheet">
        <div className="absolute inset-0 bg-black/[.32]" onClick={close} aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={a.mark}
          className="absolute inset-x-0 bottom-0 rounded-t-[14px] bg-[#F2F2F7] px-4 pb-[max(34px,env(safe-area-inset-bottom))] pt-3.5 text-black sm:left-1/2 sm:right-auto sm:w-[440px] sm:-translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[14px] lg:pb-7 lg:shadow-[0_24px_60px_rgba(0,0,0,.18)]"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex h-[22px] items-center gap-[3px] whitespace-nowrap rounded-[5px] bg-black px-2 text-[12px] font-semibold text-white">
              <AppleLogo weight="fill" className="size-[13px]" />{mockCopy.pay.applePayMark}
            </span>
            <button type="button" onClick={close} aria-label={a.close} className="grid size-7 place-items-center rounded-full bg-[#E3E3E8] text-[#6c6c70]">
              <X weight="bold" className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 rounded-[12px] bg-white">
            <div className="grid grid-cols-[78px_1fr_auto] items-center gap-2 border-b-[.5px] border-[#D1D1D6] px-3.5 py-3 text-[14px]">
              <span className="text-[12px] uppercase tracking-[.02em] text-[#6c6c70]">{a.card}</span>
              <b className="flex items-center font-medium">
                <i className="mr-2 inline-block h-6 w-[38px] rounded-[4px] bg-[linear-gradient(135deg,#1a1f71,#2c3a9e)]" aria-hidden />
                {a.cardValue(d.card.brand, d.card.last4)}
              </b>
              <CaretRight weight="bold" className="size-4 text-[#c7c7cc]" />
            </div>
            <div className="grid grid-cols-[78px_1fr_auto] items-center gap-2 px-3.5 py-3 text-[14px]">
              <span className="text-[12px] uppercase tracking-[.02em] text-[#6c6c70]">{a.payTo}</span>
              <b className="font-medium">{a.payToValue(d.fund)}</b>
              <i />
            </div>
          </div>
          <div className="flex items-baseline justify-between px-1 pb-1 pt-3.5">
            <span className="text-[12px] uppercase text-[#6c6c70]">{a.total}</span>
            <b className="bt-num text-[26px] font-semibold">{dollars(d.initial, { cents: true })}</b>
          </div>
          <div className="mt-8 text-center">
            <i className="relative mx-auto mb-1.5 block size-11 rounded-[12px] border-2 border-signal after:absolute after:-right-[9px] after:top-[9px] after:h-5 after:w-1 after:rounded-[2px] after:bg-signal" aria-hidden />
            <b className="text-[14px] font-semibold">{a.confirm}</b>
          </div>
        </div>
      </div>
    </MockPage>
  );
}
