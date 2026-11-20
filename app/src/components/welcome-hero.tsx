import { ArrowUpRight, LockSimple } from "@phosphor-icons/react";
import { AreaChart, exampleSeries } from "./area-chart";
import { ManagerAvatar } from "./manager-avatar";
import { Sparkle } from "./brand";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const H = appCopy.welcomeHero;
const LAURA = { name: "Laura Méndez", initials: "LM", kind: "person" as const, verified: true };

/**
 * Web-only Welcome art (≥1024): the product told in four real pieces on a light signal panel —
 * your balance, the worst case, who loses first, and that only you can withdraw — over soft rings.
 * Example numbers only; the phone keeps the small ribbon banner.
 */
export function WelcomeHero() {
  const week = exampleSeries(1000, 1012.4, "week");
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[32px] bg-signal-50" aria-hidden>
      {/* Background shapes: concentric rings and a dot grid, no ribbons at this size. */}
      <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 700">
        <defs>
          <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="var(--bt-signal-soft)" />
          </pattern>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="230" height="260" fill="url(#dots)" opacity=".7" />
        <rect x="400" y="470" width="200" height="230" fill="url(#dots)" opacity=".7" />
        <circle cx="430" cy="330" r="250" fill="url(#glow)" />
        {[110, 180, 250, 320].map((r) => (
          <circle key={r} cx="430" cy="330" r={r} fill="none" stroke="var(--bt-signal-soft)" strokeWidth="1.5" strokeDasharray={r === 250 ? "4 8" : undefined} />
        ))}
        <circle cx="430" cy="80" r="6" fill="var(--bt-signal)" />
        <circle cx="180" cy="330" r="5" fill="var(--bt-teal)" />
        <circle cx="610" cy="420" r="7" fill="var(--bt-indigo)" />
      </svg>
      <Sparkle size={18} className="absolute left-[7%] top-[46%] text-white" />
      <Sparkle size={12} className="absolute right-[9%] top-[8%] text-signal" />
      <Sparkle size={14} className="absolute bottom-[6%] left-[46%] text-white" />

      {/* Manager chip */}
      <div className="absolute right-[7%] top-[6%] flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-4 shadow-[0_10px_24px_rgba(11,26,48,.12)]">
        <ManagerAvatar manager={LAURA} size="sm" />
        <span className="text-[13px] leading-tight"><b className="block font-semibold">{LAURA.name}</b><span className="text-muted">{H.verified}</span></span>
      </div>

      {/* 1 · Your balance (Home's Overview card) */}
      <div className="absolute left-[7%] top-[14%] w-[min(62%,400px)] -rotate-2">
        <span className="inline-flex h-8 items-center rounded-t-[13px] bg-signal px-4 text-[13px] font-semibold text-white">{copy.home.folderTabs[0]}</span>
        <div className="rounded-[0_22px_22px_22px] bg-signal p-[18px] text-white shadow-[0_22px_44px_rgba(43,79,216,.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] text-white/75">{H.youHave}</p>
              <p className="bt-num mt-0.5 text-[34px] font-bold leading-[1.1] tracking-[-0.02em]">$1,012<small className="text-[20px] opacity-60">.40</small></p>
              <span className="bt-num mt-2 inline-flex h-6 items-center gap-1 rounded-full bg-white/[.18] px-2.5 text-[12px] font-semibold">
                <ArrowUpRight weight="bold" className="size-3.5" />{copy.home.today("$12.40")}
              </span>
            </div>
            <div className="w-[42%] pt-5">
              <AreaChart values={week} width={150} height={64} color="#FFFFFF" fillFrom={0.3} strokeWidth={2.2} endDot />
            </div>
          </div>
        </div>
      </div>

      {/* 2 · The worst case, in dollars */}
      <div className="absolute right-[6%] top-[44%] w-[min(52%,320px)] rotate-[2deg] rounded-[22px] bg-white p-4 shadow-[0_22px_44px_rgba(11,26,48,.16)]">
        <span className="block text-[13px] text-muted">{copy.home.promoRow("Safe Harbor")}</span>
        <b className="bt-num block text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-loss">−$1</b>
        <div className="relative mt-2.5 h-3 overflow-hidden rounded-[6px] bg-signal">
          <i className="absolute inset-y-0 right-0 w-[6%] bg-[repeating-linear-gradient(-45deg,var(--bt-loss)_0_4px,#E86468_4px_8px)]" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] text-muted"><span>{H.keep}</span><span className="text-loss">−$1</span></div>
      </div>

      {/* 3 · Who loses first */}
      <div className="absolute bottom-[8%] left-[7%] w-[min(60%,360px)] -rotate-1 rounded-[22px] bg-white p-4 shadow-[0_22px_44px_rgba(11,26,48,.14)]">
        <span className="block text-[13px] text-muted">{H.falls}</span>
        <p className="mt-1 text-[17px] font-semibold leading-[1.3]">{H.cushionA} <span className="text-signal">$1,000</span> {H.cushionB} <span className="text-loss">$1</span></p>
        <div className="mt-3 flex h-7 gap-[3px] overflow-hidden rounded-[9px]">
          <span className="flex flex-1 items-center gap-1.5 bg-navy px-2.5 text-[11.5px] font-semibold text-white">{H.lauraMoney}</span>
          <span className="w-[7%] bg-loss" />
        </div>
      </div>

      {/* 4 · The promise */}
      <span className="absolute bottom-[25%] right-[7%] flex -rotate-[5deg] items-center gap-2 rounded-[14px] bg-white px-3.5 py-2.5 text-[13px] font-semibold shadow-[0_12px_26px_rgba(11,26,48,.14)]">
        <LockSimple weight="fill" className="size-4 text-signal" />{appCopy.welcome.chip}
      </span>
    </div>
  );
}
