import { useId } from "react";

/** Catmull-Rom → cubic Bézier through the points. */
export function smoothPath(pts: [number, number][]) {
  if (!pts.length) return "";
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)},${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Line + gradient fill area chart, scaled to its box. Used by FolderCard (white on signal)
 * and the web balance card (signal on card).
 */
export function AreaChart({
  values, width, height, color, fillFrom = 0.16, strokeWidth = 2, baseline, endDot, pad = 4, smooth = true, className = "",
}: {
  values: number[]; width: number; height: number; color: string; fillFrom?: number; strokeWidth?: number;
  /** dashed reference line at this value (e.g. start of the week) */
  baseline?: number; endDot?: boolean; pad?: number; smooth?: boolean; className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const lo = Math.min(...values, baseline ?? Infinity), hi = Math.max(...values, baseline ?? -Infinity);
  // a tiny move (or none) draws as an almost flat line instead of filling the box
  const span = Math.max(hi - lo, Math.abs(hi) * 0.01, 1e-9);
  const mid = (hi + lo) / 2;
  const floor = hi - lo < span ? mid - span / 2 : lo;
  const y = (v: number) => pad + (1 - (v - floor) / span) * (height - pad * 2 - (endDot ? 4 : 0)) + (endDot ? 4 : 0);
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smooth ? smoothPath(pts) : `M${pts.map((p) => p.join(" ")).join(" L")}`;
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`block h-full w-full overflow-visible ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity={fillFrom} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {baseline !== undefined && (
        <line x1="0" x2={width} y1={y(baseline)} y2={y(baseline)} stroke={color} strokeOpacity=".35" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
      )}
      <path d={`${line} L${last[0]} ${height} L${pts[0]![0]} ${height}Z`} fill={`url(#${id}f)`} />
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {endDot && <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} stroke={color} strokeOpacity=".35" strokeWidth="6" />}
    </svg>
  );
}

// Normalized shapes (0 = start, 1 = end) traced from the brandbook charts.
const SHAPES = {
  /** FolderCard "Last 7 days" (B1). */
  week: [0.05, 0.1, 0, 0.1, 0.25, 0.225, 0.4, 0.4, 0.6, 0.6, 0.8, 0.85, 1],
  /** Web balance card (W1): rising zigzag. */
  zigzag: [0, 0.06, 0.03, 0.19, 0.16, 0.34, 0.28, 0.47, 0.41, 0.59, 0.53, 0.75, 0.69, 0.88, 0.81, 1],
};

/**
 * Example series between two real values (we don't store price history yet): the brandbook's shape
 * stretched from `start` to `end`. Flat when nothing changed. `take` keeps only the last N points.
 */
export function exampleSeries(start: number, end: number, shape: keyof typeof SHAPES = "week", take?: number) {
  const pts = SHAPES[shape].map((v) => start + (end - start) * v);
  return take ? pts.slice(-take) : pts;
}
