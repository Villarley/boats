/* eslint-disable @next/next/no-img-element */
// Official asset logos. Manager mode and the demo dollar balance only: investors see people and dollars.
const SRC: Record<string, string> = { USDC: "/tokens/usdc.svg", USYC: "/tokens/usyc.svg", EURC: "/tokens/eurc.png", cirBTC: "/tokens/cirbtc.webp" };

export function TokenIcon({ symbol, size = 22, ring, className = "" }: { symbol: string; size?: number; ring?: string; className?: string }) {
  const src = SRC[symbol];
  const style = { width: size, height: size, boxShadow: ring ? `0 0 0 3px ${ring}` : "0 0 0 1px rgba(11,26,48,.08)" };
  if (!src) return <span className={`inline-grid flex-none place-items-center rounded-full bg-card-2 text-[10px] font-bold ${className}`} style={style}>{symbol.slice(0, 1)}</span>;
  return <img src={src} alt={symbol} width={size} height={size} className={`inline-block flex-none rounded-full object-cover ${className}`} style={style} />;
}

/** Overlapping token logos (30px, −9px overlap, 3px ring in the surface color). */
export function TokenStack({ symbols, ring = "var(--bt-card)" }: { symbols: string[]; ring?: string }) {
  return (
    <span className="inline-flex items-center">
      {symbols.map((s, i) => <TokenIcon key={s} symbol={s} size={30} ring={ring} className={i ? "-ml-[9px]" : ""} />)}
    </span>
  );
}
