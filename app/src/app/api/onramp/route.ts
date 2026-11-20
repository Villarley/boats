import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { createOnrampServerKit, KitError } from "@circle-fin/onramp-kit/server";
import { CHAIN_NAME } from "@/lib/deployment";

/**
 * Card / Apple Pay / Google Pay deposits through Circle's Onramp (the widget is hosted by Circle
 * on Arc and handles identity checks, payment and delivery). Our server only mints a short-lived
 * session for the signed-in account's address; the API key never reaches the browser.
 *
 * Environment follows the key: a TEST_ key uses Circle's sandbox (no real money, testnet dollars),
 * a LIVE_ key uses production. ONRAMP_API_KEY overrides CIRCLE_API_KEY if both are set.
 */
const API_KEY = process.env.ONRAMP_API_KEY || process.env.CIRCLE_API_KEY || "";
const SANDBOX = !API_KEY.startsWith("LIVE_");
const WIDGET = SANDBOX ? "https://onramp-sandbox.arc.io" : "https://onramp.arc.io";
// Only on Arc: the widget delivers to Arc, which the local chain can't see.
const ENABLED = Boolean(API_KEY) && CHAIN_NAME === "arc" && process.env.ONRAMP_DISABLED !== "1";

const server = ENABLED
  ? createOnrampServerKit({
      apiKey: API_KEY,
      baseUrl: SANDBOX ? "https://api-test.circle.com" : "https://api.circle.com",
      widgetBaseUrl: WIDGET,
      // Card / Apple Pay / Google Pay inside an iframe need our host authorized (and KYB in Circle).
      ...(process.env.ONRAMP_REFERRER_DOMAIN ? { referrerDomain: process.env.ONRAMP_REFERRER_DOMAIN } : {}),
    })
  : null;

// A light per-address limit so nobody burns our Circle quota from the browser.
const recent = new Map<string, number[]>();
const LIMIT = 6; // sessions per address
const WINDOW = 10 * 60_000; // per 10 minutes

/** Whether card deposits are available here, and which widget origin the browser must load. */
export async function GET() {
  return NextResponse.json({ enabled: ENABLED, sandbox: SANDBOX, widget: WIDGET }, { headers: { "cache-control": "no-store" } });
}

/** Mint a session for `address` (the person's own account). Body: { address, amount? }. */
export async function POST(req: Request) {
  if (!server) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const { address, amount } = (await req.json().catch(() => ({}))) as { address?: string; amount?: string };
  if (!address || !isAddress(address)) return NextResponse.json({ error: "bad address" }, { status: 400 });
  const usd = amount && /^\d{1,6}(\.\d{1,2})?$/.test(amount) && Number(amount) > 0 ? amount : undefined;

  const id = address.toLowerCase();
  const now = Date.now();
  const hits = (recent.get(id) ?? []).filter((t) => now - t < WINDOW);
  if (hits.length >= LIMIT) return NextResponse.json({ error: "too many" }, { status: 429 });
  recent.set(id, [...hits, now]);

  try {
    const session = await server.createSession({
      appUserId: id,
      destinationAddress: address,
      destinationChain: "arc",
      ...(usd ? { amount: usd, currency: "USD" } : {}),
      assets: { pairs: [{ token: "USDC", chain: "arc" }] },
    });
    return NextResponse.json(session, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const type = e instanceof KitError ? e.type : "UNKNOWN";
    console.warn("onramp session", type, e instanceof Error ? e.message : e);
    const status = type === "INPUT" ? 400 : type === "RATE_LIMIT" ? 429 : type === "NETWORK" ? 504 : 502;
    return NextResponse.json({ error: type === "RATE_LIMIT" ? "too many" : "unavailable" }, { status });
  }
}
