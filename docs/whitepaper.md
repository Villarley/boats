# Boats: permission-bounded delegated investment

Implementation companion to Abraham's [technical whitepaper, research draft v0.3](https://docs.google.com/document/d/1OejrO9XoEkW8KTuBomjP8gm3mAc3fJt3tlAr0daoj14/edit). This Markdown edition connects its economic model to the repository source at [`6373162`](https://github.com/Villarley/boats/tree/6373162e6bd6ebcc9ec2aed870ba72d92e21fddb), tests and historical Arc testnet evidence. It distinguishes implemented behavior from proposed controls. It is not an audit or a claim of production readiness.

## Abstract

Boats separates trading discretion from unrestricted asset authority. A captain, human or automated, proposes spot swaps inside a voyage's asset policy through a fixed router. Crew capital is senior to the captain's first-loss stake. Deposits close when the captain starts the voyage; public calls can detect an exit threshold and convert holdings back to USDC. Payouts use the USDC actually held after conversion.

The prototype is deployed on Arc testnet, chain `5042002`. USDC is Circle's testnet token; EURC, USYC and cirBTC are mocks. Team-posted oracle prices and team-funded router liquidity are explicit trust assumptions. A stop threshold does not guarantee an execution price or maximum loss.

## Model and units

| Symbol | Meaning | Source |
|---|---|---|
| `C` | Aggregate crew principal | `crewTotal` |
| `J` | Captain's junior stake | `captainStake` |
| `A0 = C + J` | Starting capital, fixed at sailing | `startValue` |
| `V(t)` | Oracle-marked NAV in USDC | `nav()` |
| `P` | Actual USDC balance at settlement | `finalValue` |
| `f` | Captain fee on the crew's gross profit | `feeBps / 10000` |
| `s`, `u` | Stop-loss and take-profit fractions of starting total NAV | `stopLossBps / 10000`, `takeProfitBps / 10000` |

USDC amounts use six decimal places; oracle prices use eighteen. Formulas below use real arithmetic for explanation. [The Solidity implementation](../contracts/src/Boat.sol) and [SDK model](../packages/sdk/src/waterfall.ts) use integer arithmetic. The current `nav()` sums recognized token values; it does not implement a separate accrued-liabilities ledger.

## Fixed cohort and lifecycle

```text
Open --sail()--> Sailing --checkVoyage()--> Returning --returnToPort()--> Closed
```

These are the actual contract state names, corresponding to the research draft's funding, active, unwinding and settled phases. Claims are tracked per account; there is no separate `CLAIMED` state.

In `Open`, crew may deposit and the captain may add stake. `sail()` requires positive crew principal and positive captain stake, then fixes `A0` and closes deposits. There is no enforced minimum stake ratio, separate funding deadline, or cancellation/refund path for a boat that never sails. Further boarding can dilute the stake ratio before sailing.

While `Sailing`, anyone can call `checkVoyage()`. It transitions to `Returning` when a valid NAV satisfies a threshold, or the configured end time has passed:

```text
stop:       V(t) <= A0 * (1 - s)
take profit: V(t) >= A0 * (1 + u)
maturity:   timestamp >= endTime
```

These checks require a transaction. Passing a threshold or date alone does not change state or independently disable `swap()`. NAV is read before the maturity condition, so a stale held-asset price can also block that check. Once `Returning`, ordinary captain swaps are rejected by state. `returnToPort()` converts recognized holdings through the fixed router and closes against the actual USDC balance. This conversion is one atomic transaction: a failed asset sale reverts it rather than recording a partial unwind.

## Execution authority and its boundaries

Each instance fixes its captain, USDC, oracle, router, asset list, maximum weights, exit thresholds, end time, fee and fee-vesting duration. `swap()` requires the captain and `Sailing` state, accepts only recognized assets, approves the exact input amount, directs router proceeds to the boat and resets approval after execution. It atomically rejects a purchased non-USDC asset whose post-trade value exceeds its configured NAV weight.

That weight check is specifically on `tokenOut`; it does not continuously rebalance every holding or guarantee all assets remain below their caps after price drift or a sale of another asset. The immutable instance router is trusted to execute its interface correctly. The factory is permissionless: the app, keeper and MCP use `listOfficialBoats()` to select the configured oracle, router and USDC; factory membership alone does not establish those trust assumptions.

The bundled captain and normal MCP swaps default to a 1% oracle-value slippage floor. The contract's ordinary `swap()` accepts the caller's `minOut`, including zero; the default is an off-chain execution policy, not an immutable universal contract constraint. `returnToPort()` separately computes a 1% floor from oracle value for each exit sale. A stale oracle or insufficient router liquidity can prevent settlement; there is no implemented alternate-router or emergency-exit path.

## Two-tranche payoff

For realized settlement proceeds `0 <= P <= A0`, crew is paid first:

```text
crew(P)    = min(C, P)
captain(P) = max(0, P - C)
crew loss  = max(0, A0 - P - J)
fee        = 0
```

For `P > A0`, gains are allocated in proportion to starting capital before the fee transfer:

```text
G             = P - A0
crewGrossGain = G * C / A0
fee           = f * crewGrossGain
crew(P)       = C + crewGrossGain - fee
captainBase   = P - crew(P) - fee
captain(P)    = captainBase + fee
```

The implemented fee is configurable per boat, capped at 50% of crew profit; 20% is the worked example, not a protocol-wide constant. Captain base is claimable after closure. The fee vests linearly from `closedAt` over `vestingDuration`; a zero duration makes it immediately vested. Cross-voyage vesting, high-water marks and loss clawbacks are not implemented.

At the settlement allocation level, `crew + captainBase + fee = P` exactly in integer arithmetic. Each crew account then receives `floor(crewPayout * deposit / C)` once. Individual rounding may leave USDC dust in the boat; there is no final-claim dust redistribution rule. Allocation conservation therefore does not mean every base unit is eventually withdrawn.

### Worked example

For `C = 10000`, `J = 1000`, `A0 = 11000` and `f = 20%`:

| Realized portfolio change | `P` | Crew payout | Captain base | Captain fee | Crew return |
|---|---:|---:|---:|---:|---:|
| -6% | 10340 | 10000 | 340 | 0 | 0% |
| -10% | 9900 | 9900 | 0 | 0 | -1% |
| +15% | 12650 | 11200 | 1150 | 300 | +12% |

These are exact-settlement illustrations, covered by `test_WaterfallScenarios`; they are not historical investment returns. At +15%, the captain's total entitlement is 1450, with the fee's availability governed by vesting.

### Finite protection frontier

Let `g = J/C` and `d = (A0 - P)/A0` be a realized drawdown. For `C > 0` and `0 <= d < 1`:

```text
crew loss / C = max(0, d * (1 + g) - g)
zero crew loss requires g >= d / (1 - d)
```

A stake equal to 10% of crew principal absorbs at most a 9.09% loss of total starting capital. Covering a 10% total-capital decline requires stake of at least 11.11% of crew principal, equivalently 10% of total capital, under exact settlement. Exit costs and gaps can consume additional protection. These ratios are distinct: the heuristic score's stake component uses `J/(C+J)`, whereas `g` above uses `J/C`.

## Gemini signal and agent access

The deployed captain reads Gemini Prediction Markets public REST data, applies a deterministic threshold rule, checks the proposed allocation and submits a bounded swap. It has no embedded LLM and does not place Gemini exchange orders. External LLM agents can use the same SDK through MCP, with unsigned planning by default and caller, simulation and transaction-status checks for execution.

Current automated decisions reject ambiguous outcome matches and explicitly inactive or closed markets. They require a valid probability, a fetched snapshot no older than 120 seconds, matching midpoint and two valid bid/ask prices separated by at most 500 probability basis points. Invalid data produces a hold. Fetch age does not establish last-trade freshness, and quote width does not establish depth or profitability. Decision memos in swap calldata are self-reported records, not Gemini-signed attestations. The historical memo-bearing swap predates the current quote-quality gate.

The [seaworthiness score](../packages/sdk/src/score.ts) assigns up to 30 points for stake, 20 for stop tightness, 20 for allowed-asset risk, 10 for concentration and 20 for track record. A new captain receives neutral history points. The score is an uncalibrated heuristic; it is not a default probability or security certification.

## Source and evidence map

| Claim | Implementation or test | Verification and scope |
|---|---|---|
| Senior/junior allocation and worked examples | [`Boat.waterfall()`](../contracts/src/Boat.sol), [`test_WaterfallScenarios`, `testFuzz_WaterfallConserves`](../contracts/test/Boat.t.sol), [SDK mirror](../packages/sdk/src/waterfall.ts) | `cd contracts && forge test`; arithmetic and exercised paths, not a formal proof of the whole protocol |
| Linear fee vesting | `vestedFee()`, `claimCaptain()`, `test_FeeVests` in the same source and test files | `cd contracts && forge test --match-test test_FeeVests`; distinct from cross-voyage clawbacks |
| Lifecycle and accounting invariants | [`BoatInvariant.t.sol`](../contracts/test/BoatInvariant.t.sol) | `cd contracts && forge test`; bounded randomized handler scenarios, not arbitrary malicious-router coverage |
| Historical mandate rejection and completed settlement | [Recorded report](evidence-report.json), [transaction links and reproduction guide](judging.md) | `npm run verify:proof`; five historical Arc proofs, no signer or new transactions |
| Current decision and refusal behavior | [`captain/src/rules.ts`](../captain/src/rules.ts), [`captain/src/replay.ts`](../captain/src/replay.ts) | `npm run verify:agent`; eight synthetic cases through production code, not a performance backtest |
| Deployment configuration | [Address manifest](../app/src/config/arc-deployment.json), [README addresses](../README.md#contract-addresses-arc-testnet) | Arc testnet only; the address list is not a bytecode audit |

The historical full voyage paid 2.197402 test USDC for 2 USDC of crew principal after a manually increased mock Bitcoin price. It demonstrates settlement and withdrawal under a controlled price path, not actual market yield. Historical transactions establish specific executions; they do not independently attest every source-code property.

## Scope of the research proposal

The original draft formalizes useful future controls, including predeclared funding cancellation, broader pre/post-trade constraints, emergency liquidation, adversarial dependency testing and a final-claim dust policy. Those are research requirements rather than deployed capabilities. Independent review, production price feeds and executable liquidity would be necessary before relying on this design with real funds. The current evidence supports an unaudited testnet prototype with finite first-loss capital and explicit execution dependencies.
