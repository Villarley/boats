// Regenerates src/abi.ts from contracts/src with solc 0.8.28 (the app's solc dependency).
//
//   node packages/sdk/scripts/gen-abi.mjs           # write src/abi.ts
//   node packages/sdk/scripts/gen-abi.mjs --check   # exit 1 if src/abi.ts is stale
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const solc = createRequire(join(root, "app", "package.json"))("solc");
const out_file = join(here, "..", "src", "abi.ts");

const dir = join(root, "contracts", "src");
const sources = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith(".sol")).map((f) => [`src/${f}`, { content: readFileSync(join(dir, f), "utf8") }]));
const out = JSON.parse(
  solc.compile(JSON.stringify({ language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi"] } } } })),
);
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
const abi = (file, name) => JSON.stringify(out.contracts[`src/${file}`][name].abi, null, 2);

const ts = `// Generated from contracts/src with solc 0.8.28. Do not edit by hand.

export const boatAbi = ${abi("Boat.sol", "Boat")} as const;

export const oracleAbi = ${abi("PriceOracle.sol", "PriceOracle")} as const;

export const factoryAbi = ${abi("BoatFactory.sol", "BoatFactory")} as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;
`;

if (process.argv.includes("--check")) {
  if (readFileSync(out_file, "utf8") !== ts) {
    console.error("src/abi.ts is stale: run node packages/sdk/scripts/gen-abi.mjs");
    process.exit(1);
  }
  console.log("src/abi.ts is up to date");
} else {
  writeFileSync(out_file, ts);
  console.log("wrote", out_file);
}
