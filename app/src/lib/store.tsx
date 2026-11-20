"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Address } from "viem";
import {
  boatsCaptainedBy,
  erc20Abi,
  getBoat,
  getPosition,
  listOfficialBoats,
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
  gift: { state: "sending" | "sent" | "unavailable"; hash?: string; amount?: bigint } | null;
  captainOf: Address[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signIn: (opts?: { demo?: "ana" | "grandma" }) => Promise<void>;
  signOut: () => void;
};

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
  // Arc testnet: every new wallet gets a one-time drip of test dollars, so a visitor can board right away.
  const [gift, setGift] = useState<{ state: "sending" | "sent" | "unavailable"; hash?: string; amount?: bigint } | null>(null);

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
    if (!isDeployed || inflight.current) return;
    // only show the network error after two failures in a row (one 429 is not an outage)
    inflight.current = true;
    try {
      const pc = publicClient();
      const addrs = (await listOfficialBoats(pc, deployment)).filter(isListed);
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
      setError(null);
    } catch (e) {
      if (++fails.current >= 2) setError("We couldn't reach the network. Your money hasn't moved.");
      console.error(e);
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [wallet]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const id = setInterval(() => { if (typeof document === "undefined" || !document.hidden) refresh(); }, 6000);
    return () => clearInterval(id);
  }, [ready, refresh]);

  useEffect(() => {
    if (!wallet || CHAIN_NAME !== "arc") return;
    const flag = `boats.gift.${wallet.address.toLowerCase()}`;
    try {
      if (localStorage.getItem(flag)) return;
    } catch {}
    let alive = true;
    (async () => {
      const info = await fetch("/api/faucet").then((r) => r.json()).catch(() => ({ enabled: false }));
      if (!info.enabled) return alive && setGift({ state: "unavailable" });
      const bal = (await publicClient().readContract({ address: deployment.tokens.USDC, abi: erc20Abi, functionName: "balanceOf", args: [wallet.address] })) as bigint;
      if (bal >= 1_000_000n) return;
      if (alive) setGift({ state: "sending" });
      const r = await fetch("/api/faucet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: wallet.address }) });
      const body = await r.json().catch(() => ({}));
      if (!alive) return;
      if (r.ok) {
        try {
          localStorage.setItem(flag, body.hash);
        } catch {}
        setGift({ state: "sent", hash: body.hash, amount: BigInt(body.amount ?? 0) });
        refresh();
      } else setGift({ state: "unavailable" });
    })().catch(() => alive && setGift({ state: "unavailable" }));
    return () => {
      alive = false;
    };
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
    () => ({ ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut, gift }),
    [ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut, gift],
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
