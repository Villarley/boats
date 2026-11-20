// Starts a local chain (Hardhat node, chain 31337), compiles contracts/src with solc 0.8.28,
// deploys the full protocol and seeds the demo boats. Writes src/config/local-deployment.json.
//
//   npm run chain            # keeps the node running
//   npm run chain -- --once  # deploy against an already running node and exit
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createPublicClient, createWalletClient, http, defineChain, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const require = createRequire(import.meta.url);
const solc = require("solc");
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const RPC = process.env.LOCAL_RPC ?? "http://127.0.0.1:8545";
const once = process.argv.includes("--once");

// Hardhat's well-known dev accounts (public test keys, local chain only).
const KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0 deployer / faucet / keeper
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1 Ana, human captain
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // 2 crew (seed passengers)
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3 grandma (demo passenger)
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // 4 AI captain
];
const acct = KEYS.map((k) => privateKeyToAccount(k));
const local = defineChain({ id: 31337, name: "Local", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pc = createPublicClient({ chain: local, transport: http(RPC) });
const wallet = (i) => createWalletClient({ chain: local, transport: http(RPC), account: acct[i] });

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
      await pc.getChainId();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`No node at ${RPC}`);
}

async function deploy(art, args, from = 0) {
  const hash = await wallet(from).deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  return r.contractAddress;
}
async function send(from, address, abi, functionName, args = []) {
  const hash = await wallet(from).writeContract({ address, abi, functionName, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted`);
  return r;
}

async function main() {
  let node;
  if (!once) {
    node = spawn("npx", ["hardhat", "node", "--hostname", "127.0.0.1", "--port", "8545"], { cwd: join(here, ".."), stdio: ["ignore", "ignore", "inherit"] });
    process.on("SIGINT", () => { node.kill(); process.exit(0); });
    process.on("SIGTERM", () => { node.kill(); process.exit(0); });
  }
  await waitForNode();
  const A = compile();
  const U = (n) => parseUnits(String(n), 6);

  const usdc = await deploy(A.Token, ["USD Coin (local)", "USDC", 6]);
  const usyc = await deploy(A.Token, ["US Yield Coin (mock)", "USYC", 6]);
  const eurc = await deploy(A.Token, ["Euro Coin (mock)", "EURC", 6]);
  const cirbtc = await deploy(A.Token, ["Circle BTC (mock)", "cirBTC", 8]);
  const oracle = await deploy(A.Oracle, [usdc, 86_400n, 3_000]);
  await send(0, oracle, A.Oracle.abi, "setPrices", [[usyc, eurc, cirbtc], [1_050_000_000_000_000_000n, 1_080_000_000_000_000_000n, (90_000n * 10n ** 6n * 10n ** 18n) / 10n ** 8n]]);
  const adapter = await deploy(A.Adapter, [oracle, 10]);
  const factory = await deploy(A.Factory, []);

  for (const [t, amt] of [[usdc, U(1_000_000)], [usyc, U(1_000_000)], [eurc, U(1_000_000)], [cirbtc, 20n * 10n ** 8n]]) await send(0, t, A.Token.abi, "mint", [adapter, amt]);
  for (const i of [1, 2, 3, 4]) await send(0, usdc, A.Token.abi, "mint", [acct[i].address, U(i === 3 ? 500 : 50_000)]);

  const block = await pc.getBlock();
  const cfg = (name, captain, w, sl, tp, days) => ({
    name, captain, usdc, oracle, router: adapter, assets: [usyc, eurc, cirbtc], maxWeightBps: w, stopLossBps: sl, takeProfitBps: tp,
    endTime: block.timestamp + BigInt(days * 86_400), feeBps: 2_000, vestingDuration: 3n * 86_400n,
  });
  const boats = [];
  for (const c of [cfg("Safe Harbor", acct[1].address, [7_000, 3_000, 1_000], 1_000, 1_500, 30), cfg("Westerly", acct[4].address, [6_000, 4_000, 2_000], 1_500, 2_000, 21), cfg("Open Sea", acct[1].address, [4_000, 3_000, 5_000], 2_500, 4_000, 14)]) {
    const { result } = await pc.simulateContract({ account: acct[0], address: factory, abi: A.Factory.abi, functionName: "createBoat", args: [c] });
    await send(0, factory, A.Factory.abi, "createBoat", [c]);
    boats.push({ name: c.name, address: result });
  }
  const [safe, west] = boats.map((b) => b.address);
  // Safe Harbor: Ana staked, seed crew boarded, still boarding (grandma boards in the app, then Ana sails).
  await send(1, usdc, A.Token.abi, "approve", [safe, U(1_000)]);
  await send(1, safe, A.Boat.abi, "stakeCaptain", [U(1_000)]);
  await send(2, usdc, A.Token.abi, "approve", [safe, U(9_000)]);
  await send(2, safe, A.Boat.abi, "board", [U(9_000)]);
  // Westerly: AI captain staked, crew boarded, sailing.
  await send(4, usdc, A.Token.abi, "approve", [west, U(1_500)]);
  await send(4, west, A.Boat.abi, "stakeCaptain", [U(1_500)]);
  await send(2, usdc, A.Token.abi, "approve", [west, U(10_000)]);
  await send(2, west, A.Boat.abi, "board", [U(10_000)]);
  await send(4, west, A.Boat.abi, "sail");

  const deployment = {
    chainId: 31337, factory, oracle, adapter,
    tokens: { USDC: usdc, USYC: usyc, EURC: eurc, cirBTC: cirbtc },
    mocks: ["USDC", "USYC", "EURC", "cirBTC"],
    boats,
    startBlock: Number(block.number),
    demo: { ana: acct[1].address, grandma: acct[3].address, aiCaptain: acct[4].address },
  };
  writeFileSync(join(here, "..", "src", "config", "local-deployment.json"), JSON.stringify(deployment, null, 2) + "\n");
  console.log("Local Boats deployed:", JSON.stringify(deployment, null, 2));
  if (once) process.exit(0);
  console.log(`Node running at ${RPC}. Ctrl+C to stop.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
