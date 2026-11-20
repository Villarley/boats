import type { Address, Hex } from "viem";
import { runKeeper } from "@boats/sdk";

const boats = (process.env.BOATS ?? "").split(",").map((s) => s.trim()).filter(Boolean) as Address[];
const key = process.env.KEEPER_PRIVATE_KEY as Hex | undefined;
if (!boats.length || !key) {
  console.error("Set BOATS (comma-separated) and KEEPER_PRIVATE_KEY");
  process.exit(1);
}
for (const r of await runKeeper(boats, { rpcUrl: process.env.RPC_URL, privateKey: key })) {
  console.log(`${r.boat} ${r.state} ${r.action}: ${r.message}${r.txHash ? ` ${r.txHash}` : ""}`);
}
