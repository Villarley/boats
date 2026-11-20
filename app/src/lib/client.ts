import { createPublicClient, http, type PublicClient } from "viem";
import { chain, rpcUrl } from "./deployment";

let pc: PublicClient | undefined;
export function publicClient(): PublicClient {
  pc ??= createPublicClient({ chain, transport: http(rpcUrl, { batch: { wait: 16 }, retryCount: 4, retryDelay: 400 }), batch: { multicall: false } }) as PublicClient;
  return pc;
}
