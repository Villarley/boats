/**
 * Review & web invest panel: "Worst case, if it falls 10%" → what you keep. 14px bar: signal fill
 * with a striped red end for the part you could lose.
 */
export function WorstCaseGauge({
  label, keep, keepCaption, lossCaption, lossShare, className = "", testId,
}: { label: string; keep: string; keepCaption: string; lossCaption: string; lossShare: number; className?: string; testId?: string }) {
  const w = `${Math.min(100, Math.max(lossShare > 0 ? 4 : 0, lossShare * 100))}%`;
  return (
    <div className={`rounded-[20px] bg-card px-4 py-3.5 ${className}`} data-testid={testId}>
      <div className="flex items-baseline justify-between text-[13.5px]">
        <span className="text-muted">{label}</span>
        <b className="bt-num text-[15px] font-bold" data-testid="review-worst">{keep}</b>
      </div>
      <div className="relative mt-2.5 h-3.5 overflow-hidden rounded-[7px] bg-signal" aria-hidden>
        <i className="absolute inset-y-0 right-0 bg-[repeating-linear-gradient(-45deg,var(--bt-loss)_0_4px,#E86468_4px_8px)]" style={{ width: w }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
        <span>{keepCaption}</span>
        <span className="text-loss">{lossCaption}</span>
      </div>
    </div>
  );
}
