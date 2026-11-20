"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Address } from "viem";
import {
  boatsCaptainedBy,
  erc20Abi,
  getBoat,
  getPosition,
  listBoats,
  waterfall,
  type BoatInfo,
  type BoatsWallet,
  type Position,
} from "@boats/sdk";
import { CHAIN_NAME, deployment, isDeployed, isListed, symbolOf } from "./deployment";
import { publicClient } from "./client";
import { LocalWallet } from "./wallet/local";
import { PasskeyWallet, passkeyAvailable } from "./wallet/passkey";

export type Mode = "crew" | "captain";
export type BoatView = BoatInfo & { position: Position };

type Store = {
  ready: boolean;
  wallet: BoatsWallet | null;
  mode: Mode;
  setMode: (m: Mode) => void;
  boats: BoatView[];
  cash: bigint;
  gift: Gift | null;
  claimGift: () => Promise<void>;
  captainOf: Address[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (opts?: { demo?: "ana" | "grandma" }) => Promise<void>;
  signOut: () => void;
};

/** Arc testnet test dollars: ready to claim → sending → sent, or failed / unavailable (no faucet). */
export type Gift = { state: "ready" | "sending" | "sent" | "failed" | "unavailable"; hash?: string; amount?: bigint; reason?: "have" | "sent" | "empty" | "limit" };

const Ctx = createContext<Store | null>(null);
const MODE_KEY = "boats.mode";

// Hardhat dev keys for the two demo personas (local chain only).
const DEMO_KEYS = {
  ana: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  grandma: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
} as const;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<BoatsWallet | null>(null);
  const [mode, setModeState] = useState<Mode>("crew");
  const [boats, setBoats] = useState<BoatView[]>([]);
  const [cash, setCash] = useState(0n);
  const [captainOf, setCaptainOf] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const fails = useRef(0);
  // Arc's public RPC rate-limits: after a "rate limit" answer, skip refreshes for a while (15s, 30s, 60s).
  const pauseUntil = useRef(0);
  const limited = useRef(0);
  // Arc testnet: every new wallet gets a one-time drip of test dollars, so a visitor can board right away.
  const [gift, setGift] = useState<Gift | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = localStorage.getItem(MODE_KEY);
        if (m === "captain" || m === "crew") setModeState(m);
      } catch {}
      if (passkeyAvailable() && PasskeyWallet.hasSaved()) {
        try {
          setWallet(await PasskeyWallet.connect("login"));
        } catch {}
      } else {
        setWallet(LocalWallet.load());
      }
      setReady(true);
    })();
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!isDeployed || inflight.current || Date.now() < pauseUntil.current) return;
    // only show the network error after two failures in a row (one 429 is not an outage)
    inflight.current = true;
    try {
      const pc = publicClient();
      const addrs = (await listBoats(pc, deployment.factory)).filter(isListed);
      const who = wallet?.address ?? "0x0000000000000000000000000000000000000001";
      const infos = await Promise.all(addrs.map((a) => getBoat(pc, a, (t) => symbolOf(t))));
      const views = await Promise.all(infos.map(async (b) => ({ ...b, position: await getPosition(pc, b, who, waterfall) })));
      setBoats(views);
      if (wallet) {
        const [bal, caps] = await Promise.all([
          pc.readContract({ address: deployment.tokens.USDC, abi: erc20Abi, functionName: "balanceOf", args: [wallet.address] }),
          boatsCaptainedBy(pc, addrs, wallet.address),
        ]);
        setCash(bal as bigint);
        setCaptainOf(caps);
      }
      fails.current = 0;
      limited.current = 0;
      setError(null);
    } catch (e) {
      if (/rate limit|exceeds defined limit|429/i.test(String((e as Error)?.message ?? e))) {
        // Not an outage: wait and try again, without the error banner.
        limited.current = Math.min(limited.current + 1, 3);
        pauseUntil.current = Date.now() + 15_000 * 2 ** (limited.current - 1);
        console.warn("network busy, retrying in", (pauseUntil.current - Date.now()) / 1000, "s");
      } else {
        if (++fails.current >= 2) setError("We couldn't reach the network. Your money hasn't moved.");
        console.warn(e);
      }
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [wallet]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    // Arc's public RPC is shared and rate-limited: poll it less often than the local chain.
    const id = setInterval(() => { if (typeof document === "undefined" || !document.hidden) refresh(); }, CHAIN_NAME === "arc" ? 15_000 : 6_000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  // Arc testnet: $5 of test dollars the person claims from Home (never sent on its own).
  useEffect(() => {
    if (!wallet || CHAIN_NAME !== "arc") return setGift(null);
    let claimed = false;
    try { claimed = Boolean(localStorage.getItem(`boats.gift.${wallet.address.toLowerCase()}`)); } catch {}
    if (claimed) return setGift(null);
    let alive = true;
    fetch("/api/faucet").then((r) => r.json())
      .then((info: { enabled?: boolean; drip?: string }) => alive && setGift(info.enabled ? { state: "ready", amount: BigInt(info.drip ?? "0") } : { state: "unavailable" }))
      .catch(() => alive && setGift({ state: "unavailable" }));
    return () => { alive = false; };
  }, [wallet]);

  const claimGift = useCallback(async () => {
    if (!wallet) return;
    setGift((g) => ({ state: "sending", amount: g?.amount }));
    try {
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet.address }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "faucet");
      try { localStorage.setItem(`boats.gift.${wallet.address.toLowerCase()}`, body.hash ?? body.via ?? "sent"); } catch {}
      setGift({ state: "sent", hash: body.hash ?? undefined, amount: body.amount ? BigInt(body.amount) : undefined });
      refresh();
    } catch (e) {
      const m = String((e as Error).message);
      setGift((g) => ({ state: "failed", amount: g?.amount, reason: m === "you already have dollars" ? "have" : m === "already sent" ? "sent" : m === "circle limit" ? "limit" : "empty" }));
    }
  }, [wallet, refresh]);

  // Captain mode only makes sense if you captain something.
  useEffect(() => {
    if (mode === "captain" && ready && !loading && captainOf.length === 0 && wallet) setMode("crew");
  }, [mode, captainOf, ready, loading, wallet, setMode]);

  const signIn = useCallback(async (opts?: { demo?: "ana" | "grandma" }) => {
    let w: BoatsWallet;
    if (opts?.demo) w = LocalWallet.create(DEMO_KEYS[opts.demo]);
    else if (passkeyAvailable()) w = await PasskeyWallet.connect(PasskeyWallet.hasSaved() ? "login" : "register");
    else w = LocalWallet.create();
    setWallet(w);
  }, []);

  const signOut = useCallback(() => {
    LocalWallet.clear();
    PasskeyWallet.clear();
    setWallet(null);
    setMode("crew");
    setCash(0n);
    setCaptainOf([]);
  }, [setMode]);

  const value = useMemo(
    () => ({ ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut, gift, claimGift }),
    [ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut, gift, claimGift],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export function useBoat(address: string) {
  const { boats } = useStore();
  return boats.find((b) => b.address.toLowerCase() === address.toLowerCase());
}
