/**
 * Gemini Prediction Markets, public market data (no auth).
 * Docs: https://developer.gemini.com/prediction-markets/market-data
 * A contract's YES price is read as the market's implied probability.
 */

export const GEMINI_BASE = "https://api.gemini.com";

export type Odds = {
  eventTicker: string;
  eventTitle: string;
  contractLabel: string;
  instrumentSymbol?: string;
  /** 0..1 */
  probability: number;
  source: "bestBid/bestAsk mid" | "lastTradePrice" | "bestAsk" | "bestBid";
  /** Raw decimal prices retain the API's precision. Missing sides are null. */
  quote?: { bestBid: string | null; bestAsk: string | null; spreadBps: number | null };
  fetchedAt: string;
};

type Prices = { bestBid?: string | null; bestAsk?: string | null; lastTradePrice?: string | null };
type Contract = { ticker?: string; label?: string; status?: string; marketState?: string; instrumentSymbol?: string; prices?: Prices };
type EventResponse = { ticker?: string; title?: string; status?: string; contracts?: Contract[] };

const num = (s?: string | null) => {
  if (s == null || !s.trim()) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
};

/** Picks a probability from a contract's prices: mid if both sides exist, else last trade, else one side. */
export function probabilityFromPrices(p: Prices | undefined): { probability: number; source: Odds["source"] } | null {
  if (!p) return null;
  const bid = num(p.bestBid);
  const ask = num(p.bestAsk);
  const last = num(p.lastTradePrice);
  if (bid !== undefined && ask !== undefined) return ask >= bid ? { probability: (bid + ask) / 2, source: "bestBid/bestAsk mid" } : null;
  if (last !== undefined) return { probability: last, source: "lastTradePrice" };
  if (ask !== undefined) return { probability: ask, source: "bestAsk" };
  if (bid !== undefined) return { probability: bid, source: "bestBid" };
  return null;
}

/** Parses one event response and returns the odds of the contract whose label/ticker matches `match`. */
export function parseEventOdds(ev: EventResponse, match: string, now = new Date()): Odds | null {
  const m = match.toLowerCase();
  if (!m.trim() || (ev.status && !["active", "open"].includes(ev.status.toLowerCase()))) return null;
  const contracts = ev.contracts ?? [];
  const matches = contracts.filter((x) => (x.label ?? "").toLowerCase().includes(m) || (x.ticker ?? "").toLowerCase().includes(m));
  const c = matches.length === 1 ? matches[0] : undefined;
  if (!c || (c.status && !["active", "open"].includes(c.status.toLowerCase())) || (c.marketState && c.marketState.toLowerCase() !== "open")) return null;
  const p = probabilityFromPrices(c.prices);
  if (!p || !(p.probability >= 0 && p.probability <= 1)) return null;
  const bid = num(c.prices?.bestBid);
  const ask = num(c.prices?.bestAsk);
  return {
    eventTicker: ev.ticker ?? "",
    eventTitle: ev.title ?? "",
    contractLabel: c.label ?? c.ticker ?? "",
    instrumentSymbol: c.instrumentSymbol,
    probability: p.probability,
    source: p.source,
    quote: {
      bestBid: bid === undefined ? null : c.prices!.bestBid!,
      bestAsk: ask === undefined ? null : c.prices!.bestAsk!,
      // Probability basis points: 0.01 price width = 100 bps, not 1% of the mid.
      spreadBps: bid !== undefined && ask !== undefined ? Math.round((ask - bid) * 10_000) : null,
    },
    fetchedAt: now.toISOString(),
  };
}

export async function fetchOdds(eventTicker: string, match: string, fetchImpl: typeof fetch = fetch): Promise<Odds> {
  const res = await fetchImpl(`${GEMINI_BASE}/v1/prediction-markets/events/${encodeURIComponent(eventTicker)}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} for ${eventTicker}`);
  const odds = parseEventOdds((await res.json()) as EventResponse, match);
  if (!odds) throw new Error(`No priced contract matching "${match}" in ${eventTicker}`);
  return odds;
}

/** Lists active events, optionally filtered by a search string. Used to pick the demo market. */
export async function listActiveEvents(search?: string, fetchImpl: typeof fetch = fetch) {
  const q = new URLSearchParams({ status: "active", limit: "50" });
  if (search) q.set("search", search);
  const res = await fetchImpl(`${GEMINI_BASE}/v1/prediction-markets/events?${q}`);
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  return (await res.json()) as unknown;
}
