import { ArrowSquareOut } from "@phosphor-icons/react";
import { explorer } from "@/lib/deployment";
import { appCopy } from "@/lib/copy.app";

/** Link to the transaction on the explorer (or a plain note on the local network). */
export function Proof({ hash, label = appCopy.proof }: { hash?: string; label?: string }) {
  if (!hash) return null;
  if (!explorer) return null; // local network: there is no explorer to link to
  return (
    <a className="inline-flex items-center gap-1 text-[13px] font-semibold text-signal" href={`${explorer}/tx/${hash}`} target="_blank" rel="noreferrer">
      {label} <ArrowSquareOut weight="bold" className="size-3.5" />
    </a>
  );
}
