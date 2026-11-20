"use client";
import { createWalletClient, decodeErrorResult, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { boatAbi, type BoatsWallet, type Call, type SendResult } from "@boats/sdk";
import { chain, rpcUrl } from "../deployment";
import { publicClient } from "../client";

const KEY = "boats.localKey";

/**
 * Dev / fallback wallet: a key kept in this browser. The user still never sees it.
 * Calls are sent in order (no batching), each waits for its receipt.
 */
export class LocalWallet implements BoatsWallet {
  readonly kind = "local" as const;
  readonly address;
  private client;
  constructor(private key: Hex) {
    const account = privateKeyToAccount(key);
    this.address = account.address;
    this.client = createWalletClient({ chain, transport: http(rpcUrl), account });
  }
  static load(): LocalWallet | null {
    try {
      const k = localStorage.getItem(KEY) as Hex | null;
      return k ? new LocalWallet(k) : null;
    } catch {
      return null;
    }
  }
  static create(key?: Hex): LocalWallet {
    const k = key ?? generatePrivateKey();
    try {
      localStorage.setItem(KEY, k);
    } catch {}
    return new LocalWallet(k);
  }
  static clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }
  async send(calls: Call[]): Promise<SendResult> {
    const pc = publicClient();
    let last: SendResult | undefined;
    for (const c of calls) {
      // Simulate first so a revert surfaces with its reason and nothing is spent.
      try {
        await pc.call({ account: this.address, to: c.to, data: c.data, value: c.value });
      } catch (e) {
        throw named(e);
      }
      const hash = await this.client.sendTransaction({ to: c.to, data: c.data, value: c.value ?? 0n });
      const r = await pc.waitForTransactionReceipt({ hash });
      last = { hash, status: r.status };
      if (r.status !== "success") return last;
    }
    return last!;
  }
}

/** Raw eth_call reverts carry only data: decode the Boat custom error so friendlyError can read its name. */
function named(e: unknown): unknown {
  let raw: Hex | undefined;
  for (let x = e as { data?: unknown; cause?: unknown; message?: string } | undefined; x && !raw; x = x.cause as typeof x) {
    const d = x.data as unknown;
    if (typeof d === "string" && d.startsWith("0x")) raw = d as Hex;
    else if (d && typeof d === "object") {
      const inner = (d as { data?: unknown; message?: string });
      if (typeof inner.data === "string" && inner.data.startsWith("0x")) raw = inner.data as Hex;
      else raw = inner.message?.match(/return data: (0x[0-9a-fA-F]+)/)?.[1] as Hex | undefined;
    }
  }
  if (!raw) return e;
  try {
    const d = decodeErrorResult({ abi: boatAbi, data: raw });
    return new Error(`${d.errorName}(${(d.args ?? []).map(String).join(", ")})`);
  } catch {
    return e;
  }
}
