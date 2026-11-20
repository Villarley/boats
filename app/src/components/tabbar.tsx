"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeftRight, Compass, House, Rocket, ShipWheel, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";

const CREW = [
  { href: "/home", label: "Home", icon: House },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/me", label: "Me", icon: UserRound },
];
const CAPTAIN = [
  { href: "/captain", label: "Bridge", icon: ShipWheel },
  { href: "/captain/launch", label: "Launch", icon: Rocket },
  { href: "/captain/trade", label: "Trade", icon: ArrowLeftRight },
  { href: "/me", label: "Me", icon: UserRound },
];

export function TabBar() {
  const path = usePathname();
  const { mode } = useStore();
  const tabs = mode === "captain" ? CAPTAIN : CREW;
  return (
    <nav className="tabbar" aria-label={mode === "captain" ? "Captain" : "Crew"}>
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = href === "/captain" ? path === "/captain" : path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} className="tab" aria-current={active ? "page" : undefined}>
            <Icon size={24} strokeWidth={active ? 2 : 1.5} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
