"use client";
import { useState } from "react";
import { ScanSmiley } from "@phosphor-icons/react";
import { AmountDisplay } from "../amount-input";
import { Button } from "../button";
import { DestinationCards } from "../destination-cards";
import { BackButton, CloseButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, mockData } from "@/lib/mock-data";

/** D4 · Withdraw: back to the card you paid with (minutes) or a bank account (1–2 days). */
export function D4Withdraw() {
  const w = copy.withdrawMoney;
  const d = mockData.withdraw;
  const [dest, setDest] = useState("card");
  return (
    <MockPage testId="mock-d4">
      <TopBar left={<BackButton to="/mock" />} title={w.title} right={<CloseButton to="/mock" />} />
      <AmountDisplay value={String(d.amount)} caption={w.from(d.fund)} className="mt-[30px]" />
      <p className="mt-[26px] text-[13px] font-semibold text-muted">{w.sendTo}</p>
      <DestinationCards
        label={w.sendTo}
        value={dest}
        onChange={setDest}
        options={[
          { id: "card", kind: "card", brand: mockCopy.pay.visa, title: w.card(d.card.last4), sub: w.cardNote, badge: w.minutes, fast: true },
          { id: "bank", kind: "bank", title: w.bank, sub: mockCopy.withdraw.bankValue(d.bank.name, d.bank.last4), badge: w.days },
        ]}
      />
      <div className="mt-4 flex items-center justify-between rounded-[18px] bg-card px-4 py-3.5">
        <div>
          <span className="block text-[13px] text-muted">{w.receive}</span>
          <b className="bt-num text-[17px] font-bold" data-testid="receive">{dollars(d.amount, { cents: true })}</b>
        </div>
        <div className="text-right">
          <span className="block text-[13px] text-muted">{w.fee}</span>
          <b className="text-[17px] font-bold text-gain">{copy.invest.rows.free}</b>
        </div>
      </div>
      <MockActions single>
        <Button href="/mock" icon={<ScanSmiley weight="bold" />}>{w.cta}</Button>
      </MockActions>
    </MockPage>
  );
}
