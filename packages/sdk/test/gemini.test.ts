import { describe, expect, it } from "vitest";
import { fetchOdds, parseEventOdds, probabilityFromPrices } from "../src/gemini.js";

const event = {
  ticker: "FEDDEC26",
  title: "Fed decision in December",
  contracts: [
    { ticker: "HOLD", label: "No change", prices: { bestBid: "0.25", bestAsk: "0.27", lastTradePrice: "0.26" } },
    { ticker: "DN25", label: "Cut 25bps", instrumentSymbol: "GEMI-FEDDEC26-DN25", prices: { bestBid: "0.70", bestAsk: "0.74", lastTradePrice: "0.71" } },
  ],
};

describe("gemini odds", () => {
  it("uses the bid/ask mid when both sides exist", () => {
    expect(probabilityFromPrices({ bestBid: "0.70", bestAsk: "0.74" })).toEqual({ probability: 0.72, source: "bestBid/bestAsk mid" });
  });
  it("falls back to last trade, then one side", () => {
    expect(probabilityFromPrices({ lastTradePrice: "0.4" })?.source).toBe("lastTradePrice");
    expect(probabilityFromPrices({ bestAsk: "0.3" })?.source).toBe("bestAsk");
    expect(probabilityFromPrices({})).toBeNull();
  });
  it("picks the matching contract by label or ticker", () => {
    const o = parseEventOdds(event, "cut", new Date("2026-11-20T00:00:00Z"));
    expect(o).toMatchObject({ eventTicker: "FEDDEC26", contractLabel: "Cut 25bps", probability: 0.72 });
    expect(parseEventOdds(event, "dn25")?.contractLabel).toBe("Cut 25bps");
    expect(parseEventOdds(event, "hike")).toBeNull();
  });
  it("fetchOdds calls the public event endpoint", async () => {
    let url = "";
    const fake = (async (u: string) => {
      url = u;
      return new Response(JSON.stringify(event), { status: 200 });
    }) as unknown as typeof fetch;
    const o = await fetchOdds("FEDDEC26", "cut", fake);
    expect(url).toBe("https://api.gemini.com/v1/prediction-markets/events/FEDDEC26");
    expect(o.probability).toBeCloseTo(0.72);
  });
  it("fetchOdds throws on HTTP errors so the captain holds", async () => {
    const fake = (async () => new Response("nope", { status: 503 })) as unknown as typeof fetch;
    await expect(fetchOdds("X", "cut", fake)).rejects.toThrow("Gemini 503");
  });
  it("never substitutes a different contract when a single outcome fails to match", () => {
    expect(parseEventOdds({ ...event, contracts: [event.contracts[0]!] }, "hike")).toBeNull();
    expect(parseEventOdds(event, "")).toBeNull();
    expect(parseEventOdds({ ...event, contracts: [event.contracts[0]!, event.contracts[0]!] }, "hold")).toBeNull();
  });
  it("refuses inactive events and contracts", () => {
    expect(parseEventOdds({ ...event, status: "settled" }, "cut")).toBeNull();
    expect(parseEventOdds({ ...event, contracts: [{ ...event.contracts[1]!, status: "closed" }] }, "cut")).toBeNull();
    expect(parseEventOdds({ ...event, contracts: [{ ...event.contracts[1]!, status: "active", marketState: "closed" }] }, "cut")).toBeNull();
  });
  it("preserves raw quote prices and exposes the probability spread", () => {
    expect(parseEventOdds(event, "cut")?.quote).toEqual({ bestBid: "0.70", bestAsk: "0.74", spreadBps: 400 });
    expect(parseEventOdds({ ...event, contracts: [{ ...event.contracts[1]!, prices: { bestAsk: "0.91" } }] }, "cut")?.quote).toEqual({ bestBid: null, bestAsk: "0.91", spreadBps: null });
  });
  it("does not use malformed prices or a crossed order book", () => {
    expect(probabilityFromPrices({ bestAsk: "Infinity" })).toBeNull();
    expect(probabilityFromPrices({ bestBid: "-1" })).toBeNull();
    expect(probabilityFromPrices({ lastTradePrice: "1.1" })).toBeNull();
    expect(probabilityFromPrices({ bestBid: "0.9", bestAsk: "0.1", lastTradePrice: "0.5" })).toBeNull();
  });
});
