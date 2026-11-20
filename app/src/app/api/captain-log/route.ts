import { NextResponse } from "next/server";
import { pushLog, readLog, type Entry } from "@/lib/server/log";

/** AI captain decision log. The bot POSTs (LOG_WEBHOOK), the app GETs. */
export async function GET(req: Request) {
  const boat = new URL(req.url).searchParams.get("boat");
  return NextResponse.json({ entries: readLog(boat) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const e = (await req.json().catch(() => null)) as Entry | null;
  if (!e || typeof e.message !== "string" || typeof e.boat !== "string") return NextResponse.json({ error: "bad entry" }, { status: 400 });
  pushLog({ at: e.at ?? new Date().toISOString(), boat: e.boat, kind: e.kind ?? "hold", message: e.message.slice(0, 400), txHash: e.txHash, odds: e.odds });
  return NextResponse.json({ ok: true });
}
