import Link from "next/link";
import { Plus } from "@phosphor-icons/react";

type Member = { initial: string; color: string };

// Seats on the outer ring (% of the orbit box), clockwise from the left; the last free seat shows "+".
const SEATS = [
  { left: "8%", top: "50%" },
  { left: "30%", top: "15%" },
  { left: "70%", top: "15%" },
  { left: "92%", top: "50%" },
];

/**
 * Web family banner: text + "Invite family" on the left; on the right two signal-soft rings,
 * a white pot card in the center, member avatars on the ring and "+" on the free seat.
 */
export function OrbitBanner({
  title, body, cta, href, potLabel, potValue, potSub, members,
}: { title: string; body: string; cta: string; href: string; potLabel: string; potValue: string; potSub: string; members: Member[] }) {
  return (
    <div className="relative grid grid-cols-[1fr_46%] items-center overflow-hidden rounded-hero bg-card" data-testid="orbit-banner">
      <div className="px-[22px] py-4">
        <h4 className="text-[22px] font-bold leading-[1.15] tracking-[-0.01em]">{title}</h4>
        <p className="mt-1.5 text-[13px] text-muted">{body}</p>
        <Link href={href} className="mt-3.5 inline-flex h-[38px] items-center rounded-full bg-signal px-4 text-[14px] font-semibold text-white">{cta}</Link>
      </div>
      <div className="relative my-3.5 mr-[18px] min-h-[128px]" aria-hidden>
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 170" preserveAspectRatio="none">
          <g fill="none" stroke="var(--bt-signal-soft)" strokeWidth="1.5">
            <ellipse cx="150" cy="85" rx="126" ry="68" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
            <ellipse cx="150" cy="85" rx="78" ry="40" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white px-3.5 py-[9px] text-center shadow-[0_10px_24px_rgba(11,26,48,.12)]">
          <span className="block text-[11px] text-muted">{potLabel}</span>
          <b className="bt-num block text-[19px] font-bold">{potValue}</b>
          <small className="block text-[11px] text-muted">{potSub}</small>
        </div>
        {members.slice(0, SEATS.length).map((m, i) => (
          <span
            key={i}
            className="absolute grid size-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[14px] font-semibold text-white shadow-[0_0_0_3px_#fff,0_10px_20px_rgba(11,26,48,.16)]"
            style={{ ...SEATS[i], background: m.color }}
          >
            {m.initial}
          </span>
        ))}
        <span className="absolute left-1/2 top-[90%] grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-signal shadow-[inset_0_0_0_2px_var(--bt-signal-soft),0_10px_20px_rgba(11,26,48,.12)]">
          <Plus weight="bold" className="size-4" />
        </span>
      </div>
    </div>
  );
}
