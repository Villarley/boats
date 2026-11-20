"use client";
import { createWalletClient, http, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { BoatsWallet, Call, SendResult } from "@boats/sdk";
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
      await pc.call({ account: this.address, to: c.to, data: c.data, value: c.value });
      const hash = await this.client.sendTransaction({ to: c.to, data: c.data, value: c.value ?? 0n });
      const r = await pc.waitForTransactionReceipt({ hash });
      last = { hash, status: r.status };
      if (r.status !== "success") return last;
    }
    return last!;
  }
}
