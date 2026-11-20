/** Safety: 5 bars (4×12, gap 2), signal for filled, card-3 for empty, plus the score. Always muted text. */
export function SafetyMeter({ score, size = "md", label = "Safety", className = "" }: { score: number; size?: "md" | "lg"; label?: string; className?: string }) {
  const on = Math.max(0, Math.min(5, Math.round(score / 20)));
  const bar = size === "lg" ? "h-[15px] w-[5px]" : "h-3 w-1";
  return (
    <span className={`inline-flex items-center gap-[7px] font-semibold text-muted ${size === "lg" ? "text-[15px]" : "text-[13px]"} ${className}`} aria-label={`${label} ${score} of 100`} role="img">
      <i className="inline-flex items-end gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => <u key={i} className={`block rounded-[1.5px] ${bar} ${i < on ? "bg-signal" : "bg-card-3"}`} />)}
      </i>
      <b className="bt-num font-semibold">{score}</b>
    </span>
  );
}
