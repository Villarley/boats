import { NextResponse } from "next/server";
import { isAddress } from "viem";

/**
 * Invitations by wallet address. A manager invites an investor's account ID to one of their funds;
 * the investor's app lists the invites for its own address.
 *
 * Kept in this server's memory for now (no database, and the contracts have no invite list):
 * a restart empties it, and each serverless instance has its own copy.
 */
export type Invite = { to: string; fund: string; from: string; code: string; at: number };

const g = globalThis as unknown as { __boatsInvites?: Invite[] };
const store = (g.__boatsInvites ??= []);
const code = (fund: string) => `${fund.slice(2, 6)}-${fund.slice(-4)}`.toUpperCase();
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** ?to=0x… → invites for that account; ?fund=0x… → who a fund invited. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const to = q.get("to");
  const fund = q.get("fund");
  const list = store.filter((i) => (!to || same(i.to, to)) && (!fund || same(i.fund, fund)));
  if (!to && !fund) return NextResponse.json({ error: "to or fund" }, { status: 400 });
  return NextResponse.json({ invitations: list }, { headers: { "cache-control": "no-store" } });
}

/** { to, fund, from } → saves the invite (one per account and fund). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { to?: string; fund?: string; from?: string };
  if (!body.to || !isAddress(body.to)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  if (!body.fund || !isAddress(body.fund)) return NextResponse.json({ error: "bad fund" }, { status: 400 });
  const inv: Invite = { to: body.to, fund: body.fund, from: String(body.from ?? "").slice(0, 40), code: code(body.fund), at: Date.now() };
  const i = store.findIndex((x) => same(x.to, inv.to) && same(x.fund, inv.fund));
  if (i >= 0) store.splice(i, 1);
  store.unshift(inv);
  if (store.length > 1000) store.length = 1000;
  return NextResponse.json({ ok: true, invitation: inv });
}

/** ?to=0x…&fund=0x… → the investor dismissed it (or joined). */
export async function DELETE(req: Request) {
  const q = new URL(req.url).searchParams;
  const to = q.get("to");
  const fund = q.get("fund");
  if (!to || !fund) return NextResponse.json({ error: "to and fund" }, { status: 400 });
  const i = store.findIndex((x) => same(x.to, to) && same(x.fund, fund));
  if (i >= 0) store.splice(i, 1);
  return NextResponse.json({ ok: true });
}
