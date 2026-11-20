import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { D1PayWith } from "@/components/mock/d1-pay-with";
import { D2Verify } from "@/components/mock/d2-verify";
import { D3ApplePay } from "@/components/mock/d3-apple-pay";
import { D4Withdraw } from "@/components/mock/d4-withdraw";
import { M2UnderReview } from "@/components/mock/m2-under-review";
import { P1Invitations } from "@/components/mock/p1-invitations";
import { P2PrivateFund } from "@/components/mock/p2-private-fund";
import { P3Review } from "@/components/mock/p3-review";
import { P4Joined } from "@/components/mock/p4-joined";

// Mock screens with example data (no chain). Codes match the brandbook.
const SCREENS: Record<string, ComponentType> = {
  d1: D1PayWith,
  d2: D2Verify,
  d3: D3ApplePay,
  d4: D4Withdraw,
  m2: M2UnderReview,
  p1: P1Invitations,
  p2: P2PrivateFund,
  p3: P3Review,
  p4: P4Joined,
};

export function generateStaticParams() {
  return Object.keys(SCREENS).map((code) => ({ code }));
}

export default async function MockScreen({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const Screen = SCREENS[code.toLowerCase()];
  if (!Screen) notFound();
  return <Screen />;
}
