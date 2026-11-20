/** topic0 of Boat.Traded(address,address,uint256,uint256,uint256) */
export const TRADED_TOPIC = "0x825f67dcf8bc9df74117166defc432f4cdf0a331eff757dd049327c83c2e02e1";

/**
 * Which boats the keeper should check for a QuickNode Stream payload ({ logs }, see docs/quicknode.md).
 * Only Traded logs: just those boats. A PriceUpdated log, an unknown payload or none (cron, button): every official boat.
 */
export function boatsToCheck(official: `0x${string}`[], body: unknown): `0x${string}`[] {
  const logs = (body as { logs?: { address?: string; topics?: string[] }[] } | null)?.logs;
  if (!Array.isArray(logs) || logs.length === 0) return official;
  if (logs.some((l) => l.topics?.[0] !== TRADED_TOPIC)) return official;
  const hit = new Set(logs.map((l) => (l.address ?? "").toLowerCase()));
  return official.filter((b) => hit.has(b.toLowerCase()));
}
