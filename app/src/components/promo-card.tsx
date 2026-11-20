"use client";
import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { appCopy } from "@/lib/copy.app";

/** Dismissible tip card with a 3D art tile. Dismissal is remembered on this device only. */
export function PromoCard({ id, art, title, body }: { id: string; art: string; title: string; body: string }) {
  const key = `boats.promo.${id}`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(key)) setHidden(true);
    } catch {}
  }, [key]);
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(key, "1");
    } catch {}
  };
  return (
    <div className="mt-6 grid grid-cols-[64px_1fr_22px] items-center gap-3 rounded-card bg-card p-3.5" data-testid="promo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art} alt="" className="size-16 rounded-input bg-white object-cover" />
      <div>
        <b className="block text-[15px] font-semibold">{title}</b>
        <p className="mt-0.5 text-[13px] leading-[1.35] text-muted">{body}</p>
      </div>
      <button type="button" onClick={dismiss} aria-label={appCopy.home.dismiss} className="self-start text-muted">
        <X weight="bold" className="size-4" />
      </button>
    </div>
  );
}
