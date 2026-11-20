"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, Bank, Bell, Check, ScanSmiley, ShieldCheck, Sparkle, UsersThree } from "@phosphor-icons/react";
import { Badge } from "../badge";
import { Button, IconButton } from "../button";
import { IconTile, ListGroup, ListRow } from "../list-group";
import { SafetyMeter } from "../safety-meter";
import { Sheet } from "../sheet";
import { PersonDot } from "../ticket";
import { BackButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy, terms } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, mockData } from "@/lib/mock-data";

const f = mockData.privateFund;
const pctText = (p: number) => `${p < 0 ? "−" : "+"}${Math.abs(p)}%`;
const value = (v: string, cls = "") => <b className={`bt-num text-[15px] font-semibold ${cls}`}>{v}</b>;

/** P3 · Review sheet: amount, who covers first, worst case, and the required "I know Carlos" check. */
function ReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [known, setKnown] = useState(false);
  const m = f.manager.first;
  const r = mockCopy.review;
  return (
    <Sheet open={open} onClose={onClose} title={copy.invest.sheetTitle} testId="review-sheet">
      <ListGroup className="mt-4">
        <ListRow dense dividerInset={0} leading={<IconTile color="teal"><UsersThree weight="fill" /></IconTile>} title={r.youInvest} sub={f.fund} trailing={value(dollars(f.invest, { cents: true }))} />
        <ListRow dense dividerInset={0} leading={<IconTile color="signal"><ShieldCheck weight="fill" /></IconTile>} title={r.coversFirst(m)} trailing={value(dollars(f.stake))} />
        <ListRow dense dividerInset={0} leading={<IconTile color="loss"><ArrowDownRight weight="bold" /></IconTile>} title={r.ifFalls(Math.abs(f.lossLimitPct))} sub={r.takesTheLoss(m, dollars(f.stake))}
          trailing={<b className="bt-num text-[15px] font-semibold" data-testid="review-worst">{dollars(f.worstCase, { cents: true })}</b>} />
        <ListRow dense dividerInset={0} leading={<IconTile color="gain"><Sparkle weight="fill" /></IconTile>} title={copy.invest.rows.fee} trailing={value(copy.invest.rows.free)} />
      </ListGroup>
      <label className="mt-3 grid cursor-pointer grid-cols-[24px_1fr] items-start gap-2.5 rounded-[16px] bg-card px-3.5 py-3 text-[13.5px] leading-[1.4]" data-testid="know-check">
        <input type="checkbox" className="peer sr-only" checked={known} onChange={(e) => setKnown(e.target.checked)} />
        <span className={`grid size-[22px] place-items-center rounded-[6px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal ${known ? "bg-signal text-white" : "bg-white shadow-[inset_0_0_0_2px_var(--bt-divider)]"}`} aria-hidden>
          {known && <Check weight="bold" className="size-3.5" />}
        </span>
        <span>{copy.privateJoin.confirm(m)}</span>
      </label>
      <div className="mt-3.5">
        <Button icon={<ScanSmiley weight="bold" />} disabled={!known} onClick={() => router.push("/mock/p4")} testId="invest-face-id">{copy.invest.cta}</Button>
      </div>
    </Sheet>
  );
}

/** P2 · Private fund: who's in (4 of 10), room left under the cap, and the fund's rules. */
export function P2PrivateFund({ reviewOpen = false }: { reviewOpen?: boolean }) {
  const [review, setReview] = useState(reviewOpen);
  const p = mockCopy.privateFund;
  const room = f.cap - f.value;
  return (
    <MockPage testId={reviewOpen ? "mock-p3" : "mock-p2"}>
      <TopBar
        left={<BackButton to="/mock/p1" />}
        title={f.fund}
        right={<IconButton label={p.notifications}><Bell weight="fill" /></IconButton>}
      />
      <div className="mt-[18px] flex items-center justify-between">
        <Badge>{p.badge}</Badge>
        <SafetyMeter score={f.safety} />
      </div>
      <p className="mt-3 text-[16px] text-muted">{copy.privateJoin.fundValue}</p>
      <p className="bt-num mt-0.5 text-[34px] font-bold leading-[1.15] tracking-[-0.01em]" data-testid="fund-value">{dollars(f.value, { cents: true })}</p>
      <p className="mt-1 flex items-center text-[14px] text-muted">
        <span className="mr-1.5 inline-block size-[7px] flex-none rounded-full bg-[var(--bt-status-open)]" aria-hidden />
        {p.statusLine}
      </p>

      <div className="mt-[18px] rounded-card bg-card px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="flex">
            {f.joiners.map((j, i) => <PersonDot key={i} {...j} size={32} ring="0 0 0 2.5px #fff" className={`!text-[12px] ${i ? "-ml-2" : ""}`} />)}
            <span className="-ml-2 grid size-8 place-items-center rounded-full bg-card-2 text-[11px] font-semibold text-muted shadow-[0_0_0_2.5px_#fff]">{p.more(f.moreJoiners)}</span>
          </span>
          <span className="text-[13px] text-muted"><b className="font-semibold text-ink">{p.joinedCount(f.taken, f.max)}</b> {p.joinedTail}</span>
        </div>
        <div className="relative mt-3.5 h-1.5 rounded-[4px] bg-card-3" role="img" aria-label={copy.privateJoin.roomLeft(dollars(room))}>
          <i className="absolute inset-y-0 left-0 rounded-[4px] bg-signal" style={{ width: `${(f.value / f.cap) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-muted">
          <span>{p.amountIn(dollars(f.value))}</span>
          <span>{copy.privateJoin.roomLeft(dollars(room))}</span>
        </div>
      </div>

      <ListGroup className="mt-3">
        <ListRow dense dividerInset={0} leading={<IconTile color="signal"><ShieldCheck weight="fill" /></IconTile>} title={p.coversFirstLosses(f.manager.first)} trailing={value(dollars(f.stake))} />
        <ListRow dense dividerInset={0} leading={<IconTile color="loss"><ArrowDownRight weight="bold" /></IconTile>} title={terms.lossLimit} trailing={value(pctText(f.lossLimitPct), "text-loss")} />
        <ListRow dense dividerInset={0} leading={<IconTile color="teal"><Bank weight="fill" /></IconTile>} title={p.holds} trailing={<b className="text-[14px] font-semibold">{p.holdsValue}</b>} />
      </ListGroup>

      <MockActions>
        <Button variant="secondary" href="/mock/p1">{mockCopy.invites.notNow}</Button>
        <Button onClick={() => setReview(true)} testId="invest">{p.invest}</Button>
      </MockActions>

      <ReviewSheet open={review} onClose={() => setReview(false)} />
    </MockPage>
  );
}
