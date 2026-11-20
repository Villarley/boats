# Boats: Devpost submission

Submission fields for November 20, 2026, 12:00 PM CST.

## Project name

Boats

## Elevator pitch (max 200 chars)

Non-custodial USDC voyages on Arc: human or AI captains trade within on-chain limits, stake first-loss capital, and leave an auditable decision trail.

## Try it out

- https://boats-liard.vercel.app — Arc testnet prototype
- https://github.com/Villarley/boats
- Reproduce the transaction evidence without a wallet: `npm install && npm run verify:proof`

## Track and prizes

DeFi and Onchain Applications; Best use of Arc; Gemini Prediction Markets bounty. See [the judge evidence guide](judging.md) for the implemented integration and its limits.

[Technical whitepaper](whitepaper.md): the economic model, exact payout examples and implementation boundaries, with source and reproducible tests.

## Built with

arc, usdc, solidity, foundry, viem, typescript, next.js, circle-modular-wallets, gemini-prediction-markets, model-context-protocol, github-actions

## About the project

```markdown
## Inspiration
If a group lets an agent manage pooled money, who sets its limits—and whose capital takes the first loss? Boats answers both questions before the voyage starts: the contract defines trading authority, and the captain posts a stake.

Two findings shaped that design. In I-HITL's controlled payment experiment, 9 of 10 tested models raised their spending limit in at least one of 20 runs per model without an adversarial prompt. It is evidence from that setup, not a population-wide failure rate. [Research paper, October 2026](https://arxiv.org/html/2610.35835v1) In Riskified's survey of 5,100 adult online shoppers across five countries, 29% accepted automatic AI purchases within their rules, versus 7% without approval. The survey concerns shopping, but the distinction—delegation within explicit boundaries—is the question we apply to fund management. [Riskified, October 27, 2026](https://www.riskified.com/press/agentic-commerce-pulse-consumer-survey-november-2026/)

## What it does
A boat is a USDC vault with a fixed voyage. A captain, human or AI, trades pooled crew deposits subject to an immutable mandate:

- **Restricted trading authority.** Swaps go through the boat's fixed adapter, use listed assets and respect each asset's maximum portfolio weight. The captain has no arbitrary transfer path for crew deposits.
- **First-loss capital.** The captain's stake absorbs losses before crew principal. The performance fee applies only to crew profit. Captains can claim their remaining stake and vested fee; crew can withdraw their own share after settlement.
- **Public settlement.** Anyone can call `checkVoyage()` when NAV crosses a stop loss or take profit, or the end date passes, then `returnToPort()` to settle in USDC. These functions require transactions; a threshold is not a guaranteed execution price or time.

For $10,000 crew principal and $1,000 captain stake, an exit exactly 10% below starting NAV leaves $9,900 for the crew: a 1% crew loss before exit costs. Gaps, delays, oracle failure and liquidity can make losses larger.

## Proof on Arc testnet
- **Gemini-driven decision:** the bundled captain recorded event `FED261211`, outcome “Hike 25bps”, probability 91%, its reason and fetch timestamp in a successful swap's calldata. The memo-bearing swap moved about $0.55; an earlier trade moved $5.50. [Swap + memo](https://testnet.arcscan.app/tx/0x8762611513bddaf380a5dab13eea3c470b761fd57f7c9e5bd84b9b0283d5fc41) · [Earlier swap](https://testnet.arcscan.app/tx/0x7fd20ec1dc368c1180c3156638ae4a9914e719722cc10962680879cd477225ea)
- **Rejected trade:** a swap attempting to exceed the Bitcoin weight cap reverted. The verification command replays it at the preceding block to check the specific rejection reason. [Reverted swap](https://testnet.arcscan.app/tx/0x748ab0dbcdb8f122e27c3dff303eb268950f194111bb804e731ad348ee186ee6)
- **Complete voyage:** in a controlled testnet scenario, we manually increased the mock Bitcoin oracle price. A public call triggered take profit, the vault returned to USDC, and the crew received 2.197402 test USDC for a 2 USDC deposit: +9.8701% after the captain fee. This demonstrates settlement, not real investment performance. [Take profit](https://testnet.arcscan.app/tx/0x2248e6f6ce95e912017c645bdee0f4fcf8be8db26f1552927f682157c06491f8) · [Return](https://testnet.arcscan.app/tx/0xe5f95b1ff9ab4f9fc54f51a5802cbdea2deff90c1144b144e1a2a65561f882e2) · [Crew withdrawal](https://testnet.arcscan.app/tx/0x87a3d5ffd2b045ba0aa702d64247a4b2716211a98234501e330b811d5f88954e)

`npm run verify:proof` checks transaction targets, methods, receipts, the decision memo, the historical rejected trade and crew payout. It requires neither a private key nor a new transaction.

## How we built it
- **Contracts:** Solidity and Foundry: `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter`. Unit and invariant tests cover mandate restrictions and first-loss settlement.
- **SDK:** TypeScript and viem for reads, trade pre-checks, loss estimates, scores, calldata and keepers.
- **Agent interface:** a stdio MCP server with 14 tools, three discoverable resources and a review prompt. Structured JSON, AGENTS.md, llms.txt and a public agent.json connect claims to evidence. Agents can discover boats, inspect limits, plan trades, read Gemini odds and receive unsigned calls without supplying a key. With a signer, each step is simulated before sending; partial failures return transaction hashes so the agent can check before retrying.
- **Captain lifecycle:** agents can create a boat, post a stake while boarding stays open, wait for crew, then sail. Requests to sail without crew or stake fail before any calls are returned.
- **Gemini integration:** public Prediction Markets REST data drives an explicit threshold rule. Missing, ambiguous, closed, invalid or stale fetched snapshots cause the captain to hold. The current engine also requires a two-sided quote no wider than five probability percentage points; raw bid/ask strings remain visible in SDK/MCP output. Normal swaps carry a configurable slippage floor, 1% by default. The bundled captain is a deterministic rule-based agent, with no embedded LLM. External LLM agents can operate through MCP.
- **Audit trail:** decision memos are appended to swap calldata and decoded with `decodeSwapMemo()`. They prove what the captain recorded; they are not cryptographically authenticated Gemini attestations.
- **App:** Next.js PWA with Circle Modular Wallets passkey and paymaster integration. Correcting both production domains restored authentication: the user completed passkey onboarding in Brave on November 20 and the signed-in account view was verified. Sponsored boarding remains unverified.
- **Keeper:** GitHub Actions schedules the authenticated keeper webhook every 10 minutes. Runs can be delayed; settlement requires available prices, liquidity and gas.
- **Arc:** contracts and evidence are on Arc testnet, chain 5042002. USDC is used for deposits and gas. EURC, USYC and cirBTC are testnet mocks.
- **CI:** Foundry, SDK, captain, MCP, app and local-chain end-to-end checks. MCP protocol tests exercise discovery and unsigned planning through the real stdio transport.

These are parts of one flow: Gemini informs the decision, the captain proposes it, Arc enforces the mandate and pays out, and MCP lets another agent use the same protocol. `npm run verify:agent` reproduces eight synthetic decision and refusal scenarios offline, without a key. It uses the production parser and rules; it is a behavioral check, not a performance backtest. The historical swap memo predates the new quote-quality gate.

## Challenges we ran into
- The demo needs funded liquidity and prices. We use a team-funded, oracle-priced adapter and team-posted prices, with clearly labelled mock assets. This is not a production DEX or a live USYC yield strategy.
- A stop threshold is not a guaranteed loss bound. Settlement depends on a caller, transaction inclusion, oracle availability, liquidity and exit costs.
- Agent plans can become stale. We expose skipped checks, simulate signed steps and preserve hashes after partial execution instead of inviting blind retries.
- First-loss protection changes as more crew joins. The SDK recalculates the threshold-loss estimate for each proposed deposit.

## Accomplishments that we're proud of
A deployed mandate-based vault, first-loss settlement, a Gemini-informed trading decision recorded on chain, a reverted out-of-mandate trade and a reproducible full voyage. The same SDK supports the app, captain, keeper and external AI agents.

## What we learned
A useful agent interface needs clear permissions, actionable failures and inspectable results. Financial safety also requires honest limits: an on-chain trading mandate does not remove oracle, liquidity, contract or liveness risk.

## What's next
Decentralized price feeds, production liquidity, independent security review, refunds for boats that never sail, fee clawbacks and a captain history derived from on-chain results. Production legal requirements would need assessment before handling real users' funds.

## Honest notes
Testnet prototype, unaudited. Prices and adapter liquidity are controlled by the team. The factory is permissionless; the app, keeper and MCP filter for the official oracle, adapter and USDC. Existing boats have immutable oracle/router addresses. Crew in a boat that never sails currently cannot withdraw; a refund path is future work. The seaworthiness score is a heuristic, not a safety certification.
```

## Demo video script (2:45)

| Time | Show | Narration |
|---|---|---|
| 0:00 | Mandate and first-loss example | “A trading agent should not get unrestricted control of your money. Boats puts its trading limits on chain and requires the manager to stake capital that loses first.” |
| 0:20 | Live app and Arc deployment | “This is a working vault prototype on Arc testnet. We use USDC for deposits and gas; the other assets and price movements in this demonstration are controlled test data.” |
| 0:40 | MCP `boats_list`, score and proposed deposit | “An AI agent can discover a boat, inspect permissions and estimate loss at the stop threshold before it builds a transaction.” |
| 1:00 | Gemini event and memo-bearing transaction | “The bundled rule-based captain read Gemini's Fed market. At 91%, above a 70% trigger, it rebalanced toward mock Treasuries. This transaction records the signal and its reason.” |
| 1:25 | Reverted swap and historical replay | “An attempt to exceed the Bitcoin allocation cap reverted. The contract enforces the limit independently of the agent.” |
| 1:45 | Trade Winds settlement and payout | “We manually increased the mock Bitcoin price to test take profit. The voyage settled, and the crew withdrew 2.197402 test USDC for 2 in. This is a settlement test, not a yield claim.” |
| 2:10 | Unsigned MCP action and partial-failure behavior | “Any MCP-capable agent can plan the same actions without sharing a key. Signed steps are simulated, and transaction hashes remain visible if a later step fails.” |
| 2:30 | `npm run verify:proof` and repository | “You can verify these five pieces of evidence with one read-only command. Boats: delegated trading with on-chain limits and first-loss capital.” |
