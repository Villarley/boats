import "server-only";
import type { Hex } from "viem";
import { CHAIN_NAME } from "../deployment";

// Hardhat account 0: public dev key, only ever used on the local chain.
const LOCAL_DEV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as Hex;

export function serverKey(name: "FAUCET_PRIVATE_KEY" | "KEEPER_PRIVATE_KEY"): Hex | null {
  const v = process.env[name] as Hex | undefined;
  if (v) return v;
  // The keeper only pays gas for public calls (checkVoyage, returnToPort), so the faucet wallet can cover it.
  if (name === "KEEPER_PRIVATE_KEY" && process.env.FAUCET_PRIVATE_KEY) return process.env.FAUCET_PRIVATE_KEY as Hex;
  return CHAIN_NAME === "local" ? LOCAL_DEV_KEY : null;
}
