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
import { deployment, isDeployed, symbolOf } from "./deployment";
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
    inflight.current = true;
    try {
      const pc = publicClient();
      const addrs = deployment.boats.length ? deployment.boats.map((b) => b.address) : await listBoats(pc, deployment.factory);
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
      setError(null);
    } catch (e) {
      setError("We couldn't reach the network. Your money hasn't moved.");
      console.error(e);
    } finally {
      setLoading(false);
      inflight.current = false;
    }
  }, [wallet]);

  useEffect(() => {
    if (!ready) return;
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [ready, refresh]);

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
    () => ({ ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut }),
    [ready, wallet, mode, setMode, boats, cash, captainOf, loading, error, refresh, signIn, signOut],
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
