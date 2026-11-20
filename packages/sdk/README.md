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
