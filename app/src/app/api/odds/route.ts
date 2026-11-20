import { NextResponse } from "next/server";
import { fetchOdds } from "@boats/sdk";

let cache: { at: number; body: unknown } | null = null;

/** Gemini Prediction Markets odds for the configured event, cached 60 s. Falls back to a labelled sample. */
export async function GET() {
  if (cache && Date.now() - cache.at < 60_000) return NextResponse.json(cache.body);
  // Default: Gemini's live "Fed decision in December?" market, the signal the AI captain reads.
  const event = process.env.NEXT_PUBLIC_GEMINI_EVENT || "FED261211";
  const match = process.env.NEXT_PUBLIC_GEMINI_MATCH || "Cut 25bps";
  let body: unknown;
  if (event) {
    try {
      const o = await fetchOdds(event, match);
      body = { probability: o.probability, label: o.contractLabel, event: o.eventTicker, title: o.eventTitle, fetchedAt: o.fetchedAt };
    } catch {
      body = null;
    }
  }
  body ??= { probability: 0.72, label: "Cut 25bps", event: "SAMPLE", title: "Fed decision (sample)", fetchedAt: new Date().toISOString(), sample: true };
  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
