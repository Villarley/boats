// Deploys Boats to Arc testnet without Foundry (viem + solc-js), mirroring
// contracts/script/Deploy.s.sol + Seed.s.sol. Reads keys from contracts/.env.
//
//   node app/scripts/deploy-arc.mjs            # deploy + seed Westerly, writes src/config/arc-deployment.json
//   node app/scripts/deploy-arc.mjs --balances # only print wallet balances
//   node app/scripts/deploy-arc.mjs --refresh  # re-post oracle prices (stale after maxAge: 30 days on testnet)
//   node app/scripts/deploy-arc.mjs --seed-open # captain stakes on Safe Harbor + Open Sea, crew boards Safe Harbor (both stay open)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createPublicClient, createWalletClient, http, defineChain, formatUnits, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const OUT = join(here, "..", "src", "config", "arc-deployment.json");

const env = Object.fromEntries(
  readFileSync(join(root, "contracts", ".env"), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const RPC = process.env.ARC_RPC ?? env.ARC_RPC ?? "https://rpc.testnet.arc.io";
const USDC = "0x3600000000000000000000000000000000000000";
const arc = defineChain({ id: 5042002, name: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
const pc = createPublicClient({ chain: arc, transport: http(RPC) });
const deployer = privateKeyToAccount(env.DEPLOYER_KEY);
const captain = privateKeyToAccount(env.CAPTAIN_PRIVATE_KEY);
const crew = privateKeyToAccount(env.CREW_PRIVATE_KEY);
const human = env.CAPTAIN_HUMAN || captain.address;
const W = (a) => createWalletClient({ chain: arc, transport: http(RPC), account: a });
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function transfer(address,uint256) returns (bool)"]);
const U = (n) => BigInt(Math.round(n * 1e6));

async function balances() {
  for (const [n, a] of [["deployer", deployer], ["captain", captain], ["crew", crew]]) {
    const b = await pc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [a.address] });
    console.log(n.padEnd(9), a.address, formatUnits(b, 6), "USDC");
  }
}

function compile() {
  const solc = require("solc");
  const dir = join(root, "contracts", "src");
  const sources = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".sol")).map((f) => [`src/${f}`, { content: readFileSync(join(dir, f), "utf8") }]));
  const out = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } })));
  const errs = (out.errors ?? []).filter((e) => e.severity === "error");
  if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
  const get = (file, name) => ({ abi: out.contracts[`src/${file}`][name].abi, bytecode: `0x${out.contracts[`src/${file}`][name].evm.bytecode.object}` });
  return { Boat: get("Boat.sol", "Boat"), Factory: get("BoatFactory.sol", "BoatFactory"), Oracle: get("PriceOracle.sol", "PriceOracle"), Adapter: get("SwapAdapter.sol", "SwapAdapter"), Token: get("MockToken.sol", "MockToken") };
}

async function deploy(art, args) {
  const hash = await W(deployer).deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("deploy reverted");
  return r.contractAddress;
}
async function send(account, address, abi, functionName, args = []) {
  const hash = await W(account).writeContract({ address, abi, functionName, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`${functionName} reverted (${hash})`);
  console.log(" ", functionName, hash);
  return r;
}

async function refresh() {
  const d = JSON.parse(readFileSync(OUT, "utf8"));
  const abi = parseAbi(["function price(address) view returns (uint256)", "function setPrices(address[],uint256[])"]);
  const toks = [d.tokens.USYC, d.tokens.EURC, d.tokens.cirBTC];
  const ps = await Promise.all(toks.map((t) => pc.readContract({ address: d.oracle, abi, functionName: "price", args: [t] })));
  await send(deployer, d.oracle, abi, "setPrices", [toks, ps]);
}

// Captain stakes on the human-captained boats so they never show a $0 stake; crew boards Safe Harbor.
// Boats stay open so visitors can board in the app. Needs CAPTAIN_HUMAN unset (captain wallet captains them).
async function seedOpen() {
  const d = JSON.parse(readFileSync(OUT, "utf8"));
  const boat = parseAbi(["function stakeCaptain(uint256)", "function board(uint256)", "function captain() view returns (address)"]);
  const [safe, , open] = d.boats.map((b) => b.address);
  for (const [b, amt] of [[safe, U(Number(process.env.SAFE_STAKE ?? 3))], [open, U(Number(process.env.OPEN_STAKE ?? 2))]]) {
    const cap = await pc.readContract({ address: b, abi: boat, functionName: "captain" });
    if (cap.toLowerCase() !== captain.address.toLowerCase()) throw new Error(`captain wallet does not captain ${b}`);
    await send(captain, USDC, erc20, "approve", [b, amt]);
    await send(captain, b, boat, "stakeCaptain", [amt]);
  }
  const crewAmt = U(Number(process.env.SAFE_CREW ?? 5));
  await send(crew, USDC, erc20, "approve", [safe, crewAmt]);
  await send(crew, safe, boat, "board", [crewAmt]);
  await balances();
}

async function main() {
  if (process.argv.includes("--balances")) return balances();
  if (process.argv.includes("--seed-open")) return seedOpen();
  if (process.argv.includes("--refresh")) return refresh();
  if ((await pc.getChainId()) !== 5042002) throw new Error("not Arc testnet");
  await balances();
  const A = compile();
  const startBlock = await pc.getBlockNumber();
  console.log("Deploying from", deployer.address);

  const eurc = await deploy(A.Token, ["Euro Coin (mock)", "EURC", 6]);
  const usyc = await deploy(A.Token, ["US Yield Coin (mock)", "USYC", 6]);
  const cirbtc = await deploy(A.Token, ["Circle BTC (mock)", "cirBTC", 8]);
  // Testnet demo: prices stay valid 30 days (we post them ourselves). Max move per update 30%.
  const oracle = await deploy(A.Oracle, [USDC, 30n * 86_400n, 3_000]);
  await send(deployer, oracle, A.Oracle.abi, "setPrices", [[usyc, eurc, cirbtc], [1_050_000_000_000_000_000n, 1_080_000_000_000_000_000n, (90_000n * 10n ** 6n * 10n ** 18n) / 10n ** 8n]]);
  const adapter = await deploy(A.Adapter, [oracle, 10]);
  const factory = await deploy(A.Factory, []);
  console.log({ eurc, usyc, cirbtc, oracle, adapter, factory });

  const block = await pc.getBlock();
  const cfg = (name, cap, w, sl, tp) => ({
    name, captain: cap, usdc: USDC, oracle, router: adapter, assets: [usyc, eurc, cirbtc], maxWeightBps: w, stopLossBps: sl, takeProfitBps: tp,
    endTime: block.timestamp + 7n * 86_400n, feeBps: 2_000, vestingDuration: 3n * 86_400n, inviteOnly: false,
  });
  const boats = [];
  for (const c of [cfg("Safe Harbor", human, [7_000, 3_000, 1_000], 1_000, 1_500), cfg("Westerly", captain.address, [6_000, 4_000, 2_000], 1_500, 2_000), cfg("Open Sea", human, [4_000, 3_000, 5_000], 2_500, 4_000)]) {
    const { result } = await pc.simulateContract({ account: deployer, address: factory, abi: A.Factory.abi, functionName: "createBoat", args: [c] });
    await send(deployer, factory, A.Factory.abi, "createBoat", [c]);
    boats.push({ name: c.name, address: result });
  }
  for (const [t, amt] of [[eurc, U(1_000_000)], [usyc, U(1_000_000)], [cirbtc, 20n * 10n ** 8n]]) await send(deployer, t, A.Token.abi, "mint", [adapter, amt]);
  const adapterUsdc = U(Number(process.env.ADAPTER_USDC ?? 0));
  if (adapterUsdc > 0n) await send(deployer, USDC, erc20, "transfer", [adapter, adapterUsdc]);

  const deployment = {
    chainId: 5042002, factory, oracle, adapter,
    tokens: { USDC, USYC: usyc, EURC: eurc, cirBTC: cirbtc },
    mocks: ["USYC", "EURC", "cirBTC"],
    boats,
    startBlock: Number(startBlock),
    demo: { aiCaptain: captain.address },
  };
  writeFileSync(OUT, JSON.stringify(deployment, null, 2) + "\n");
  console.log("Wrote", OUT);

  // Seed Westerly: AI captain stakes, crew boards, captain sails.
  const west = boats[1].address;
  const stake = U(Number(process.env.STAKE ?? 2)), crewAmt = U(Number(process.env.CREW_AMOUNT ?? 8));
  await send(captain, USDC, erc20, "approve", [west, stake]);
  await send(captain, west, A.Boat.abi, "stakeCaptain", [stake]);
  await send(crew, USDC, erc20, "approve", [west, crewAmt]);
  await send(crew, west, A.Boat.abi, "board", [crewAmt]);
  await send(captain, west, A.Boat.abi, "sail");
  console.log(JSON.stringify(deployment, null, 2));
  await balances();
}

main().catch((e) => { console.error(e); process.exit(1); });
