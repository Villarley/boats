"use client";
import { useState } from "react";
import { buildBoardCalls, friendlyError } from "@boats/sdk";
import { useStore, type BoatView } from "./store";
import { worstCase } from "./boat";
import { parseUsd } from "./format";

/** Amount entry + review + the invest transaction for one fund. Shared by F3/F4 and the web panel. */
export function useInvest(b?: BoatView) {
  const { wallet, cash, refresh } = useStore();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hash, setHash] = useState<string>();
  const amount = parseUsd(value);
  const w = b ? worstCase(b, amount || 1_000_000n) : { bps: 0, dollars: 0n };
  const worst = amount ? w.dollars : 0n;
  const short = amount > cash;
  const cashDollars = Number(cash) / 1e6;
  const quick = (share: number) => (share >= 1 ? String(Math.floor(cashDollars * 100) / 100) : String(Math.floor(cashDollars * share * 100) / 100));

  const confirm = async () => {
    if (!b || !wallet) return false;
    setBusy(true);
    setErr(null);
    try {
      const r = await wallet.send(buildBoardCalls(b.address, b.usdc, amount));
      if (r.status !== "success") throw new Error("reverted");
      setHash(r.hash);
      refresh();
      return true;
    } catch (e) {
      setErr(friendlyError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { value, setValue, amount, worst, worstBps: w.bps, short, cash, cashDollars, quick, confirm, busy, err, hash, passkey: wallet?.kind === "passkey" };
}
