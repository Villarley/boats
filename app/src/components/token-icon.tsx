/* eslint-disable @next/next/no-img-element */
// Official asset logos. Manager mode and the demo dollar balance only: investors see people and dollars.
const SRC: Record<string, string> = { USDC: "/tokens/usdc.svg", USYC: "/tokens/usyc.svg", EURC: "/tokens/eurc.png", cirBTC: "/tokens/cirbtc.webp" };

export function TokenIcon({ symbol, size = 22, ring, className = "" }: { symbol: string; size?: number; ring?: string; className?: string }) {
  const src = SRC[symbol];
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}` : "0 0 0 1px rgba(11,26,48,.08)" };
  if (!src) return <span className={`inline-grid flex-none place-items-center rounded-full bg-card-2 text-[10px] font-bold ${className}`} style={style}>{symbol.slice(0, 1)}</span>;
  return <img src={src} alt={symbol} width={size} height={size} className={`inline-block flex-none rounded-full object-cover ${className}`} style={style} />;
}

/**
 * Overlapping token logos (30px, −9px overlap, 3px ring in the surface color). Past `max`,
 * the rest collapse into "+N". The names stay available to screen readers and on hover.
 */
export function TokenStack({ symbols, ring = "var(--bt-card)", size = 30, max = 5, label }: { symbols: string[]; ring?: string; size?: number; max?: number; label?: string }) {
  const shown = symbols.slice(0, max);
  const rest = symbols.length - shown.length;
  const names = label ?? symbols.join(", ");
  return (
    <span className="inline-flex items-center" role="img" aria-label={names} title={names}>
      {shown.map((s, i) => <TokenIcon key={s} symbol={s} size={size} ring={ring} className={i ? "-ml-[9px]" : ""} />)}
      {rest > 0 && <span className="bt-num ml-1.5 text-[15px] font-semibold text-ink">+{rest}</span>}
    </span>
  );
}
