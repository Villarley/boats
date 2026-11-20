import { copy } from "@/lib/copy";

/** Manager: who absorbs losses first. Navy = your money (loses first), signal-soft = investors. */
export function LossStack({ you, investors, youLabel, investorsLabel }: { you: bigint; investors: bigint; youLabel: string; investorsLabel: string }) {
  const total = Number(you + investors) || 1;
  const yours = Math.max(0.02, Number(you) / total);
  return (
    <div data-testid="loss-stack">
      <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]" aria-hidden>
        <i className="block h-full bg-navy" style={{ flex: yours }} />
        <i className="block h-full bg-signal-soft" style={{ flex: 1 - yours }} />
      </div>
      <div className="mt-2.5 flex justify-between gap-2.5 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><em className="inline-block size-2 rounded-[2px] bg-navy" /><b className="font-semibold text-ink">{copy.manager.stackYou(youLabel).split(" · ")[0]}</b> · {copy.manager.stackYou(youLabel).split(" · ")[1]}</span>
        <span className="flex items-center gap-1.5"><em className="inline-block size-2 rounded-[2px] bg-signal-soft" />{copy.manager.stackInvestors(investorsLabel)}</span>
      </div>
    </div>
  );
}
