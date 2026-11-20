# @boats/sdk

The protocol layer for Boats. The contracts hold the money and enforce the mandate. This SDK has everything an app, a bot or a keeper needs: reading boats, checking a trade before sending it, and building the calls to send. Our PWA, the AI captain and the keeper are all clients of this SDK.

```ts
import { getBoat, checkTrade, buildBoardCalls, score, worstCaseIfBoarding } from "@boats/sdk";

const boat = await getBoat(publicClient, boatAddress);
const review = worstCaseIfBoarding(boat.crewTotal, boat.captainStake, 100_000_000n, boat.stopLossBps);
await wallet.send(buildBoardCalls(boat.address, boat.usdc, 100_000_000n)); // one Face ID
```

| Module | What it does |
|---|---|
| `reads` | `listBoats`, `getBoat` (one multicall), `getPosition`, `boatsCaptainedBy` (unlocks captain mode), `getActivity` (from logs, no indexer) |
| `mandate` | `checkTrade`: the same check as `Boat.swap()`, with the rule in plain words and the max allowed amount |
| `waterfall` | First-loss math, bit-for-bit with the contract. Worst case before boarding, port summary |
| `score` | Seaworthiness score with a reason for each of the 5 factors |
| `calls` | Calldata for board, withdraw, stake, sail, swap, claim, checkVoyage, returnToPort, createBoat |
| `wallet` | `BoatsWallet` interface (passkey smart account or a local key) and `friendlyError` |
| `keeper` | `runKeeper(boats)`: ends voyages at their limits and brings them back to port |
| `gemini` | Gemini Prediction Markets odds (public API) |

## Captain quickstart (human or AI)

```ts
import {
  arcTestnetDeployment as d, clients, buildCreateBoatCall, buildStakeCalls, getBoat, checkTrade,
  valueToAmount, buildSwapCall, buildClaimCaptainCall, revertReason, symbolOf,
} from "@boats/sdk";

const { publicClient: pc, walletClient: wc, account } = clients("https://rpc.testnet.arc.io", process.env.KEY as `0x${string}`);
const send = async (c: { to: `0x${string}`; data: `0x${string}` }) =>
  pc.waitForTransactionReceipt({ hash: await wc!.sendTransaction({ account: account!, chain: wc!.chain, ...c }) });

// 1. Launch a boat. Use the deployment's oracle and adapter: apps only list boats that do.
await send(buildCreateBoatCall(d.factory, {
  name: "My boat", captain: account!.address, usdc: d.tokens.USDC, oracle: d.oracle, router: d.adapter,
  assets: [d.tokens.USYC, d.tokens.cirBTC], maxWeightBps: [7000, 2000],   // max 70% Treasuries, 20% Bitcoin
  stopLossBps: 1000, takeProfitBps: 1500, feeBps: 2000,                     // -10% / +15% / 20% of crew profit
  endTime: BigInt(Math.floor(Date.now() / 1000) + 7 * 86400), vestingDuration: 0n,
}));
// BadConfig reverts: stopLoss must be 1..9999 bps, takeProfit > 0, fee <= 50%, endTime in the future, weights 1..10000.

const boat = "0x..." as `0x${string}`; // from the BoatCreated event, or the last entry of listBoats()

// 2. Stake first-loss money and sail (once crew has boarded, or right away).
for (const c of buildStakeCalls(boat, d.tokens.USDC, 2_000_000n, true)) await send(c);

// 3. Trade: pre-check against the mandate, then swap. The contract is still the final judge.
const b = await getBoat(pc, boat, (t) => symbolOf(d, t));
const check = checkTrade(b.holdings, b.usdc, d.tokens.USDC, d.tokens.cirBTC, 3_000_000n);
if (!check.ok) console.log(check.message, check.maxAllowed);   // e.g. "Max 20% in cirBTC. This makes it 54%." plus the max allowed amount
else {
  const amountIn = await valueToAmount(pc, d.oracle, d.tokens.USDC, d.tokens.USDC, 3_000_000n);
  try { await send(buildSwapCall(boat, d.tokens.USDC, d.tokens.cirBTC, amountIn)); }
  catch (e) { console.log(revertReason(e)); }                    // MandateViolation("max weight")
}

// 4. After port: claim stake + vested fee.
await send(buildClaimCaptainCall(boat));
```

Our AI captain (`captain/src/index.ts`) is this loop plus Gemini odds and a plain-words rule. For agents, the MCP server in `packages/mcp` exposes the same steps as tools.

## Crew: judge a boat before boarding

```ts
const b = await getBoat(pc, boat);
const { total, factors } = score({ crewTotal: b.crewTotal, captainStake: b.captainStake, stopLossBps: b.stopLossBps, assets, track: [] }); // 0-100, a reason per factor
const worst = worstCaseIfBoarding(b.crewTotal, b.captainStake, 10_000_000n, b.stopLossBps); // $10 deposit
const pos = await getPosition(pc, b, me, waterfall);                    // deposit, value now, payout
```

Only list boats from `listOfficialBoats(pc, arcTestnetDeployment)`: the factory is permissionless, and a boat with a foreign oracle or router is not safe.
