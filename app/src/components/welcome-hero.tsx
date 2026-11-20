import { ArrowUpRight, LockSimple } from "@phosphor-icons/react";
import { AreaChart, exampleSeries } from "./area-chart";
import { ManagerAvatar } from "./manager-avatar";
import { copy } from "@/lib/copy";
import { appCopy } from "@/lib/copy.app";

const H = appCopy.welcomeHero;
const LAURA = { name: "Laura Méndez", initials: "LM", kind: "person" as const, verified: true };

/**
 * Web-only Welcome art (≥1024): the product told in four real pieces on a deep blue gradient —
 * your balance, the worst case, who loses first, and that only you can withdraw — over glows, grid and rings.
 * Example numbers only; the phone keeps the small ribbon banner.
 */
export function WelcomeHero() {
  const week = exampleSeries(1000, 1012.4, "week");
  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-[32px] bg-[linear-gradient(155deg,#16308F_0%,var(--bt-signal-deep)_28%,var(--bt-signal)_58%,var(--bt-indigo)_100%)]" aria-hidden>
      {/* Background: glows in the brand's sky/teal/indigo, a fine grid and rings in translucent white. */}
      <div className="absolute -right-[18%] -top-[16%] size-[70%] rounded-full bg-sky opacity-45 blur-[90px]" />
      <div className="absolute -bottom-[22%] -left-[16%] size-[64%] rounded-full bg-teal opacity-35 blur-[90px]" />
      <div className="absolute bottom-[18%] right-[-10%] size-[44%] rounded-full bg-indigo opacity-50 blur-[70px]" />
      <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 700">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#FFFFFF" strokeOpacity=".07" strokeWidth="1" />
          </pattern>
          <radialGradient id="fade" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <mask id="gridMask"><rect width="600" height="700" fill="url(#fade)" /></mask>
        </defs>
        <rect width="600" height="700" fill="url(#grid)" mask="url(#gridMask)" />
        {[120, 190, 260, 340].map((r, i) => (
          <circle key={r} cx="430" cy="330" r={r} fill="none" stroke="#FFFFFF" strokeOpacity={0.16 - i * 0.03} strokeWidth="1.5" strokeDasharray={i === 2 ? "3 9" : undefined} />
        ))}
        {/* Little orbiting dots on the rings */}
        <circle cx="430" cy="140" r="5" fill="#FFFFFF" />
        <circle cx="240" cy="330" r="6" fill="var(--bt-teal)" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="560" cy="530" r="7" fill="var(--bt-sky)" stroke="#FFFFFF" strokeWidth="2" />
        <circle cx="300" cy="590" r="4" fill="#FFFFFF" fillOpacity=".7" />
      </svg>

      {/* Manager chip */}
      <div className="absolute right-[7%] top-[6%] flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-4 shadow-[0_12px_28px_rgba(11,26,48,.28)]">
        <ManagerAvatar manager={LAURA} size="sm" />
        <span className="text-[13px] leading-tight"><b className="block font-semibold">{LAURA.name}</b><span className="text-muted">{H.verified}</span></span>
      </div>

      {/* 1 · Your balance (Home's Overview card) */}
      <div className="absolute left-[7%] top-[14%] w-[min(62%,400px)] -rotate-2">
        <span className="inline-flex h-8 items-center rounded-t-[13px] border border-b-0 border-white/25 bg-white/15 px-4 text-[13px] font-semibold text-white backdrop-blur-xl">{copy.home.folderTabs[0]}</span>
        <div className="rounded-[0_22px_22px_22px] border border-white/25 bg-white/15 p-[18px] text-white shadow-[0_24px_50px_rgba(11,26,48,.30)] backdrop-blur-xl">
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
      <div className="absolute right-[6%] top-[42%] w-[min(52%,320px)] rotate-[2deg] rounded-[22px] bg-white p-4 shadow-[0_24px_50px_rgba(11,26,48,.32)]">
        <span className="block text-[13px] text-muted">{copy.home.promoRow("Safe Harbor")}</span>
        <b className="bt-num block text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-loss">−$1</b>
        <div className="relative mt-2.5 h-3 overflow-hidden rounded-[6px] bg-signal">
          <i className="absolute inset-y-0 right-0 w-[6%] bg-[repeating-linear-gradient(-45deg,var(--bt-loss)_0_4px,#E86468_4px_8px)]" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] text-muted"><span>{H.keep}</span><span className="text-loss">−$1</span></div>
        {/* 4 · The promise, hanging off the worst case so it moves with it */}
        <span className="absolute -bottom-[46px] right-3 flex -rotate-[6deg] items-center gap-2 whitespace-nowrap rounded-[14px] bg-white px-3.5 py-2.5 text-[13px] font-semibold shadow-[0_12px_28px_rgba(11,26,48,.28)]">
          <LockSimple weight="fill" className="size-4 text-signal" />{appCopy.welcome.chip}
        </span>
      </div>

      {/* 3 · Who loses first */}
      <div className="absolute bottom-[8%] left-[7%] w-[min(60%,360px)] -rotate-1 rounded-[22px] bg-white p-4 shadow-[0_24px_50px_rgba(11,26,48,.32)]">
        <span className="block text-[13px] text-muted">{H.falls}</span>
        <p className="mt-1 text-[17px] font-semibold leading-[1.3]">{H.cushionA} <span className="text-signal">$1,000</span> {H.cushionB} <span className="text-loss">$1</span></p>
        <div className="mt-3 flex h-7 gap-[3px] overflow-hidden rounded-[9px]">
          <span className="flex flex-1 items-center gap-1.5 bg-navy px-2.5 text-[11.5px] font-semibold text-white">{H.lauraMoney}</span>
          <span className="w-[7%] bg-loss" />
        </div>
      </div>

    </div>
  );
}
