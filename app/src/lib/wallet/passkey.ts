"use client";
/**
 * Invisible wallet: passkey (Face ID / Touch ID) -> Circle modular smart account -> bundler + paymaster.
 * No seed phrase, no gas. All calls of one action go in ONE user operation, so one Face ID per action.
 */
import { createPublicClient, type Hex } from "viem";
import { createBundlerClient, toWebAuthnAccount, type BundlerClient } from "viem/account-abstraction";
import {
  WebAuthnMode,
  toCircleSmartAccount,
  toModularTransport,
  toPasskeyTransport,
  toWebAuthnCredential,
  type WebAuthnCredential,
} from "@circle-fin/modular-wallets-core";
import type { BoatsWallet, Call, SendResult } from "@boats/sdk";
import { chain } from "../deployment";

const CLIENT_KEY = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_KEY ?? "";
const CLIENT_URL = process.env.NEXT_PUBLIC_CIRCLE_CLIENT_URL ?? "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";
const CRED = "boats.passkey";

export const passkeyAvailable = () => Boolean(CLIENT_KEY) && typeof window !== "undefined" && !!window.PublicKeyCredential;

export class PasskeyWallet implements BoatsWallet {
  readonly kind = "passkey" as const;
  private constructor(readonly address: `0x${string}`, private bundler: BundlerClient) {}

  static async connect(mode: "register" | "login", username?: string): Promise<PasskeyWallet> {
    const passkeyTransport = toPasskeyTransport(CLIENT_URL, CLIENT_KEY);
    let credential: WebAuthnCredential;
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(CRED) : null;
    if (mode === "login" && saved) {
      credential = JSON.parse(saved) as WebAuthnCredential;
    } else {
      credential = await toWebAuthnCredential({
        transport: passkeyTransport,
        mode: mode === "register" ? WebAuthnMode.Register : WebAuthnMode.Login,
        username: mode === "register" ? (username ?? `crew-${Date.now().toString(36)}`) : undefined,
      } as Parameters<typeof toWebAuthnCredential>[0]);
      try {
        localStorage.setItem(CRED, JSON.stringify(credential));
      } catch {}
    }
    const modularTransport = toModularTransport(`${CLIENT_URL}/${chain.id === 5042002 ? "arcTestnet" : "arcTestnet"}`, CLIENT_KEY);
    const client = createPublicClient({ chain, transport: modularTransport });
    const account = await toCircleSmartAccount({ client, owner: toWebAuthnAccount({ credential }) });
    const bundler = createBundlerClient({ account, chain, transport: modularTransport, paymaster: true });
    return new PasskeyWallet(account.address, bundler as unknown as BundlerClient);
  }

  static hasSaved() {
    try {
      return !!localStorage.getItem(CRED);
    } catch {
      return false;
    }
  }
  static clear() {
    try {
      localStorage.removeItem(CRED);
    } catch {}
  }

  async send(calls: Call[]): Promise<SendResult> {
    const hash = await this.bundler.sendUserOperation({
      calls: calls.map((c) => ({ to: c.to, data: c.data, value: c.value ?? 0n })),
    } as Parameters<BundlerClient["sendUserOperation"]>[0]);
    const r = await this.bundler.waitForUserOperationReceipt({ hash });
    return { hash: r.receipt.transactionHash as Hex, status: r.success ? "success" : "reverted" };
  }
}
