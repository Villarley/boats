// Quick on-chain test of invite-only boats (no forge needed): compiles contracts/src with solc 0.8.28,
// starts a throwaway Hardhat node on its own port (never 8545), deploys the protocol with mocks,
// creates one public and one invite-only boat, and checks who can board.
//
//   node scripts/test-invites.mjs              # spawns a node on 8546 (TEST_PORT to change)
//   TEST_RPC=http://127.0.0.1:9000 node ...    # use a node that is already running instead
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { createPublicClient, createWalletClient, http, defineChain, parseUnits, BaseError, ContractFunctionRevertedError, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const require = createRequire(import.meta.url);
const solc = require("solc");
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const PORT = Number(process.env.TEST_PORT ?? 8546);
if (PORT === 8545 && !process.env.TEST_RPC) throw new Error("Refusing to spawn on 8545: that is the dev chain.");
const RPC = process.env.TEST_RPC ?? `http://127.0.0.1:${PORT}`;

// Hardhat's well-known dev accounts (public test keys, local chain only).
const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0 deployer
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1 captain
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2 invited investor
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3 outsider
];
const acct = KEYS.map((k) => privateKeyToAccount(k));
const [, CAPTAIN, INVESTOR, OUTSIDER] = [0, 1, 2, 3];
const chain = defineChain({ id: 31337, name: "Test", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pc = createPublicClient({ chain, transport: http(RPC) });
const wallet = (i) => createWalletClient({ chain, transport: http(RPC), account: acct[i] });

function compile() {
  const dir = join(root, "contracts", "src");
  const sources = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".sol")).map((f) => [`src/${f}`, { content: readFileSync(join(dir, f), "utf8") }]));
  const out = JSON.parse(
    solc.compile(JSON.stringify({ language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } })),
  );
  const errs = (out.errors ?? []).filter((e) => e.severity === "error");
  if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
  const get = (file, name) => ({ abi: out.contracts[`src/${file}`][name].abi, bytecode: `0x${out.contracts[`src/${file}`][name].evm.bytecode.object}` });
  return { Boat: get("Boat.sol", "Boat"), Factory: get("BoatFactory.sol", "BoatFactory"), Oracle: get("PriceOracle.sol", "PriceOracle"), Adapter: get("SwapAdapter.sol", "SwapAdapter"), Token: get("MockToken.sol", "MockToken") };
}

async function waitForNode() {
  for (let i = 0; i < 60; i++) {
    try {
      return await pc.getChainId();
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`No node at ${RPC}`);
}

async function deploy(art, args) {
  const hash = await wallet(0).deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  return (await pc.waitForTransactionReceipt({ hash })).contractAddress;
}
async function send(from, address, abi, functionName, args = []) {
  const hash = await wallet(from).writeContract({ address, abi, functionName, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted`);
  return r;
}
/** Asserts the call reverts with the custom error `name` (decoded from the ABI). */
async function expectRevert(from, address, abi, functionName, args, name) {
  try {
    await pc.simulateContract({ account: acct[from], address, abi, functionName, args });
  } catch (e) {
    const rev = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
    assert.ok(rev, `${functionName}: expected revert ${name}, got ${e.shortMessage ?? e.message}`);
    assert.equal(rev.data?.errorName, name, `${functionName}: expected ${name}, got ${rev.data?.errorName ?? rev.reason}`);
    return rev.data;
  }
  assert.fail(`${functionName}: expected revert ${name}, but it succeeded`);
}

async function main() {
  let node;
  if (!process.env.TEST_RPC) {
    node = spawn("npx", ["hardhat", "node", "--hostname", "127.0.0.1", "--port", String(PORT)], { cwd: join(here, ".."), stdio: ["ignore", "ignore", "inherit"] });
    const stop = () => node && !node.killed && node.kill();
    process.on("exit", stop);
    process.on("SIGINT", () => process.exit(130));
  }
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push([name, true]);
      console.log(`  PASS  ${name}`);
    } catch (e) {
      results.push([name, false]);
      console.log(`  FAIL  ${name}\n        ${e.message.split("\n").join("\n        ")}`);
    }
  };

  await waitForNode();
  const A = compile();
  const U = (n) => parseUnits(String(n), 6);

  const usdc = await deploy(A.Token, ["USD Coin (test)", "USDC", 6]);
  const usyc = await deploy(A.Token, ["US Yield Coin (mock)", "USYC", 6]);
  const oracle = await deploy(A.Oracle, [usdc, 86_400n, 3_000]);
  await send(0, oracle, A.Oracle.abi, "setPrices", [[usyc], [1_000_000_000_000_000_000n]]);
  const adapter = await deploy(A.Adapter, [oracle, 10]);
  const factory = await deploy(A.Factory, []);
  for (const i of [CAPTAIN, INVESTOR, OUTSIDER]) await send(0, usdc, A.Token.abi, "mint", [acct[i].address, U(10_000)]);

  const block = await pc.getBlock();
  const cfg = (name, inviteOnly) => ({
    name, captain: acct[CAPTAIN].address, usdc, oracle, router: adapter, assets: [usyc], maxWeightBps: [5_000], stopLossBps: 1_000, takeProfitBps: 1_500,
    endTime: block.timestamp + 7n * 86_400n, feeBps: 2_000, vestingDuration: 0n, inviteOnly,
  });
  const create = async (c) => {
    const { result } = await pc.simulateContract({ account: acct[0], address: factory, abi: A.Factory.abi, functionName: "createBoat", args: [c] });
    await send(0, factory, A.Factory.abi, "createBoat", [c]);
    return result;
  };
  const pub = await create(cfg("Public Harbor", false));
  const priv = await create(cfg("Private Harbor", true));
  for (const b of [pub, priv]) for (const i of [CAPTAIN, INVESTOR, OUTSIDER]) await send(i, usdc, A.Token.abi, "approve", [b, U(10_000)]);
  const read = (address, functionName, args = []) => pc.readContract({ address, abi: A.Boat.abi, functionName, args });

  console.log(`Invite-only boats on ${RPC}`);

  await test("public fund still boards normally", async () => {
    assert.equal(await read(pub, "inviteOnly"), false);
    await send(OUTSIDER, pub, A.Boat.abi, "board", [U(100)]);
    assert.equal(await read(pub, "crewDeposit", [acct[OUTSIDER].address]), U(100));
  });

  await test("invite-only blocks a non-invited investor with NotInvited", async () => {
    assert.equal(await read(priv, "inviteOnly"), true);
    assert.equal(await read(priv, "invited", [acct[OUTSIDER].address]), false);
    await expectRevert(OUTSIDER, priv, A.Boat.abi, "board", [U(100)], "NotInvited");
    // a real transaction reverts too, and no money moves
    await assert.rejects(wallet(OUTSIDER).writeContract({ address: priv, abi: A.Boat.abi, functionName: "board", args: [U(100)], gas: 200_000n }).then((hash) => pc.waitForTransactionReceipt({ hash })).then((r) => { if (r.status !== "success") throw new Error("reverted"); }));
    assert.equal(await read(priv, "crewTotal"), 0n);
  });

  await test("captain invites, then that investor can board (others still can't)", async () => {
    const r = await send(CAPTAIN, priv, A.Boat.abi, "invite", [[acct[INVESTOR].address]]);
    const logs = parseEventLogs({ abi: A.Boat.abi, logs: r.logs, eventName: "Invited" });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].args.who.toLowerCase(), acct[INVESTOR].address.toLowerCase());
    assert.equal(await read(priv, "invited", [acct[INVESTOR].address]), true);
    await send(INVESTOR, priv, A.Boat.abi, "board", [U(250)]);
    assert.equal(await read(priv, "crewDeposit", [acct[INVESTOR].address]), U(250));
    await expectRevert(OUTSIDER, priv, A.Boat.abi, "board", [U(100)], "NotInvited");
  });

  await test("non-captain can't invite", async () => {
    await expectRevert(INVESTOR, priv, A.Boat.abi, "invite", [[acct[OUTSIDER].address]], "NotCaptain");
    await expectRevert(OUTSIDER, priv, A.Boat.abi, "invite", [[acct[OUTSIDER].address]], "NotCaptain");
    assert.equal(await read(priv, "invited", [acct[OUTSIDER].address]), false);
  });

  await test("can't invite after sail", async () => {
    await send(CAPTAIN, priv, A.Boat.abi, "stakeCaptain", [U(100)]);
    await send(CAPTAIN, priv, A.Boat.abi, "sail");
    const data = await expectRevert(CAPTAIN, priv, A.Boat.abi, "invite", [[acct[OUTSIDER].address]], "WrongState");
    assert.deepEqual(data.args.map(Number), [0, 1]); // expected Open, actual Sailing
  });

  const failed = results.filter(([, ok]) => !ok).length;
  console.log(failed ? `FAIL: ${failed} of ${results.length} failed` : `PASS: ${results.length}/${results.length} invite-only checks`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
