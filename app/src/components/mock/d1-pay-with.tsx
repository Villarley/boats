"use client";
import { useState } from "react";
import { AppleLogo } from "@phosphor-icons/react";
import { AmountDisplay, Keypad } from "../amount-input";
import { Button } from "../button";
import { PayMethodTiles } from "../pay-method-tiles";
import { BackButton, CloseButton, TopBar } from "../top-bar";
import { MockActions, MockPage } from "./mock-shell";
import { copy } from "@/lib/copy";
import { mockCopy } from "@/lib/copy.mock";
import { dollars, minusDollars, mockData } from "@/lib/mock-data";

const OTHER = "other";

/** D1 · Pay with: amount, quick chips, how you pay (Apple Pay / card / Boats balance). */
export function D1PayWith() {
  const d = mockData.pay;
  const [amount, setAmount] = useState(String(d.initial));
  const [chip, setChip] = useState<string>(String(d.initial));
  const [method, setMethod] = useState("applePay");
  const value = Number(amount || 0);
  const worst = Math.round(value * d.worstCaseShare * 100) / 100;
  const chips = [...d.amounts.map((a) => ({ id: String(a), label: dollars(a) })), { id: OTHER, label: mockCopy.pay.other }];

  return (
    <MockPage testId="mock-d1">
      <TopBar left={<BackButton to="/mock" />} title={copy.invest.title(d.fund)} right={<CloseButton to="/mock" />} />
      <AmountDisplay
        value={amount}
        className="mt-[30px]"
        caption={<>{mockCopy.pay.worstCase} <b className="font-semibold text-loss" data-testid="worst-case">{minusDollars(worst)}</b></>}
      />
      <div role="radiogroup" aria-label={mockCopy.pay.amountLabel} className="mt-4 flex justify-center gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={chip === c.id}
            onClick={() => {
              setChip(c.id);
              if (c.id !== OTHER) setAmount(c.id);
            }}
            className={`bt-num flex h-[34px] items-center rounded-full px-3.5 text-[14px] font-semibold ${chip === c.id ? "bg-navy text-white" : "bg-card text-ink"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {chip === OTHER && <Keypad value={amount} onChange={setAmount} max={25000} />}

      <p className="mt-[26px] text-[13px] font-semibold text-muted">{copy.payWith.label}</p>
      <PayMethodTiles
        label={copy.payWith.label}
        value={method}
        onChange={setMethod}
        methods={[
          { id: "applePay", mark: <><AppleLogo weight="fill" className="size-[15px]" />{mockCopy.pay.applePayMark}</>, markClass: "bg-black text-white", title: copy.payWith.methods.applePay, sub: copy.payWith.instant },
          { id: "card", mark: mockCopy.pay.visa, markClass: "bg-[linear-gradient(135deg,#1a1f71,#2c3a9e)] text-white italic", title: copy.payWith.methods.card, sub: copy.payWith.instant },
          { id: "balance", mark: <span className="bt-num">{dollars(d.balance)}</span>, markClass: "bg-signal text-white", title: copy.payWith.methods.balance, sub: copy.payWith.alreadyHere },
        ]}
      />
      <div className="mt-3.5 flex justify-between px-1 text-[13px] text-muted">
        <span>{mockCopy.pay.youPay}</span>
        <b className="bt-num font-semibold text-ink" data-testid="you-pay">{copy.payWith.youPay(dollars(value, { cents: true }))}</b>
      </div>

      <MockActions single>
        <Button href="/mock/d2" disabled={value <= 0}>{copy.payWith.cta}</Button>
      </MockActions>
    </MockPage>
  );
}
