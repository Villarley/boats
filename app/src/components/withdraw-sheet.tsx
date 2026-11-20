"use client";
import { CaretRight, LockSimple } from "@phosphor-icons/react";
import { Sheet } from "./sheet";
import { Button } from "./button";
import { ListGroup, ListRow } from "./list-group";
import { ManagerAvatar } from "./manager-avatar";
import { TokenIcon } from "./token-icon";
import { useStore } from "@/lib/store";
import { managerOf, myFunds } from "@/lib/fund";
import { closeWithdraw, useWithdrawOpen } from "@/lib/ui-state";
import { dateShort, usd } from "@/lib/format";
import { appCopy } from "@/lib/copy.app";

const W = appCopy.withdraw;
const chev = <CaretRight weight="bold" className="size-4 text-faint" />;

/**
 * Where your money is and what can come out now: closed funds (ready), your dollars, and funds
 * still running (locked until they close). Opened from Home's Withdraw and the quick actions.
 */
export function WithdrawSheet() {
  const open = useWithdrawOpen();
  const { boats, cash } = useStore();
  const mine = myFunds(boats);
  const ready = mine.filter((b) => b.state === "Closed");
  const locked = mine.filter((b) => b.state !== "Closed");
  const nothing = !ready.length && !locked.length && cash === 0n;
  const money = (v: bigint) => <b className="bt-num text-[16px] font-semibold">{usd(v, { cents: true })}</b>;

  return (
    <Sheet open={open} onClose={closeWithdraw} title={W.title} testId="withdraw-sheet">
      <p className="mt-2 text-[15px] leading-[1.45] text-muted">{W.sub}</p>
      {nothing ? (
        <div className="mt-4 rounded-card bg-card p-4">
          <p className="text-[14px] text-muted">{W.empty}</p>
          <div className="mt-3"><Button href="/explore" size="dense" onClick={closeWithdraw}>{W.explore}</Button></div>
        </div>
      ) : (
        <>
          {(ready.length > 0 || cash > 0n) && (
            <>
              <p className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[.06em] text-muted">{W.ready}</p>
              <ListGroup>
                {ready.map((b) => (
                  <ListRow key={b.address} href={`/boat/${b.address}/port`} onClick={closeWithdraw} testId={`withdraw-${b.name}`}
                    leading={<ManagerAvatar manager={managerOf(b)} />} title={b.name} sub={W.fundReady}
                    trailing={<span className="flex items-center gap-2">{money(b.position.valueNow)}{chev}</span>} />
                ))}
                {cash > 0n && (
                  <ListRow href="/mock/d4" onClick={closeWithdraw} testId="withdraw-cash"
                    leading={<TokenIcon symbol="USDC" size={40} />} title={W.cash} sub={W.cashSub}
                    trailing={<span className="flex items-center gap-2">{money(cash)}{chev}</span>} />
                )}
              </ListGroup>
            </>
          )}
          {locked.length > 0 && (
            <>
              <p className="mb-2 mt-5 text-[13px] font-semibold uppercase tracking-[.06em] text-muted">{W.locked}</p>
              <ListGroup>
                {locked.map((b) => (
                  <ListRow key={b.address} href={`/boat/${b.address}`} onClick={closeWithdraw}
                    leading={<ManagerAvatar manager={managerOf(b)} />} title={b.name} sub={W.lockedSub(dateShort(b.endTime))}
                    trailing={<span className="flex items-center gap-2 text-muted">{money(b.position.valueNow)}<LockSimple weight="fill" className="size-4" /></span>} />
                ))}
              </ListGroup>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
