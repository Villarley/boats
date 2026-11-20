import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The suite needs the chain as `npm run chain` left it. The first run on a new chain saves a
// snapshot; every later run rewinds to it, so the suite can run again without a restart.
// On a restarted node the saved id doesn't exist, the revert is a no-op, and the chain is clean anyway.
const RPC = "http://127.0.0.1:8545";
const FILE = join(tmpdir(), "boats-e2e-snapshot.json");

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const j = (await r.json()) as { result: T; error?: { message: string } };
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
}

export default async function globalSetup() {
  if (existsSync(FILE)) {
    const { id } = JSON.parse(readFileSync(FILE, "utf8")) as { id: string };
    await rpc<boolean>("evm_revert", [id]).catch(() => false);
  }
  writeFileSync(FILE, JSON.stringify({ id: await rpc<string>("evm_snapshot") }));
}
