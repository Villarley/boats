// Signal flags used in the Boats UI. Real International Code of Signals meanings in comments.
// <Flag code="N" size={28} /> . Every flag gets a 1px ink outline so white parts read on white.
import * as React from "react";
const R = "var(--bt-flag-red)", Y = "var(--bt-flag-yellow)", B = "var(--bt-flag-blue)", W = "var(--bt-flag-white)", K = "var(--bt-flag-ink)";
const shapes: Record<string, React.ReactNode> = {
  B: <path d="M0 0H60L44 20L60 40H0Z" fill={R} />,                                                           // logo
  O: <><path d="M0 0H60V40Z" fill={R} /><path d="M0 0V40H60Z" fill={Y} /></>,                               // logo
  A: <><rect width="30" height="40" fill={W} /><path d="M30 0H60L46 20L60 40H30Z" fill={B} /></>,           // logo
  T: <><rect width="20" height="40" fill={R} /><rect x="20" width="20" height="40" fill={W} /><rect x="40" width="20" height="40" fill={B} /></>, // logo
  S: <><rect width="60" height="40" fill={W} /><rect x="20" y="12" width="20" height="16" fill={B} /></>,    // logo; boat "Safe Harbor"
  P: <><rect width="60" height="40" fill={B} /><rect x="20" y="12" width="20" height="16" fill={W} /></>,    // "Blue Peter": about to sail -> Boarding, app icon
  Q: <rect width="60" height="40" fill={Y} />,                                                              // "healthy, request free pratique" -> Back in port
  C: <>{[B, W, R, W, B].map((c, i) => <rect key={i} y={i * 8} width="60" height="8" fill={c} />)}</>,         // "Yes" -> trade allowed
  N: <>{Array.from({ length: 16 }, (_, i) => <rect key={i} x={(i % 4) * 15} y={Math.floor(i / 4) * 10} width="15" height="10" fill={(i % 4 + Math.floor(i / 4)) % 2 ? W : B} />)}</>, // "No" -> trade blocked
  U: <><rect width="60" height="40" fill={W} /><rect width="30" height="20" fill={R} /><rect x="30" y="20" width="30" height="20" fill={R} /></>, // "running into danger" -> Rough score
  H: <><rect width="30" height="40" fill={W} /><rect x="30" width="30" height="40" fill={R} /></>,          // "pilot on board" -> captain badge
  W: <><rect width="60" height="40" fill={B} /><rect x="8" y="6" width="44" height="28" fill={W} /><rect x="20" y="13" width="20" height="14" fill={R} /></>, // boat "Westerly"
};
export function Flag({ code, size = 24, title }: { code: keyof typeof shapes | string; size?: number; title?: string }) {
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 60 40" role="img" aria-label={title ?? `Signal flag ${code}`} style={{ display: "inline-block", flex: "none" }}>
      {shapes[code]}
      <rect x=".5" y=".5" width="59" height="39" fill="none" stroke={K} strokeWidth="1" />
    </svg>
  );
}
export const BOATS_WORD = ["B", "O", "A", "T", "S"] as const;
