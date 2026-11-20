"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/**
 * Bottom sheet on mobile (white, r34, inset 8, grabber, title 22/600 + round X).
 * ≥1024: centered 440px dialog, X top-right, closes on Esc or click outside.
 */
export function Sheet({
  open, onClose, title, children, center, testId, closeLabel = "Close",
}: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; center?: boolean; testId?: string; closeLabel?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50" data-testid={testId}>
      <div className="absolute inset-0 bg-black/[.32]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-2 bottom-2 flex max-h-[calc(100dvh-24px)] flex-col overflow-y-auto rounded-sheet bg-white px-5 pb-6 pt-2.5 sm:left-1/2 sm:right-auto sm:w-[520px] sm:-translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:w-[440px] lg:-translate-y-1/2 lg:rounded-[28px] lg:p-7 lg:shadow-[0_24px_60px_rgba(0,0,0,.18)] ${center ? "text-center" : ""}`}
      >
        <span className="h-[5px] w-10 flex-none self-center rounded-full bg-[#D1D1D6] lg:hidden" aria-hidden />
        {title ? (
          <div className="mt-3.5 flex items-center justify-between lg:mt-0">
            <b className="text-[22px] font-semibold">{title}</b>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-[38px] place-items-center rounded-full bg-card-2"><X weight="bold" className="size-[18px]" /></button>
          </div>
        ) : (
          <button type="button" onClick={onClose} aria-label={closeLabel} className="absolute right-[18px] top-[18px] hidden size-[38px] place-items-center rounded-full bg-card-2 lg:grid"><X weight="bold" className="size-[18px]" /></button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
