# Judge guide: verify Boats in three minutes

Start with [the deployed app](https://boats-liard.vercel.app), [contract addresses](../README.md#contract-addresses-arc-testnet), and the [recorded verification report](evidence-report.json). This is an unaudited Arc testnet prototype with team-posted oracle prices and team-funded adapter liquidity. USYC, EURC and cirBTC are mocks; there is no demonstrated real yield.

The thesis: **delegated trading with enforceable limits and a captain who loses first**. Gemini informs a decision; Arc enforces the mandate and settles USDC; MCP lets an external agent use the same protocol. [Partner research and acceptance criteria](partner-research.md) explain how that story fits prior sponsor events. [agent.json](../app/public/agent.json) is the machine-readable claim and verification index.

## Reproduce the evidence without a wallet

The proof transactions predate the current deployment with invitation-gated boarding. Their original boat and mock-token addresses are pinned in the verifier; updating the live app's deployment does not move those receipts to the new boats. For current contract addresses use the [deployment manifest](../app/src/config/arc-deployment.json).

```bash
npm install
npm run verify:agent   # eight offline synthetic scenarios, no network
npm run verify:proof
# In an environment requiring its configured HTTP proxy:
NODE_USE_ENV_PROXY=1 npm run verify:proof
```

Neither command constructs a signer or sends a transaction. `verify:agent` uses synthetic fixtures with the production parser, rule engine and SDK mandate checker: above trigger, below trigger, missing data, one-sided quote, wide spread, closed market, stale fetch and hostile overweight proposal. It is not a trading backtest. `verify:proof` checks chain 5042002 and five submitted proofs: exact target and method, successful swap + decoded Gemini memo, reverted out-of-mandate swap + historical max-weight rejection, take-profit event, settlement event and crew payout. A mismatch or unavailable RPC read exits nonzero. An archival-capable Arc RPC can be supplied with `BOATS_RPC_URL`; keep credential-bearing endpoints in a local `.env`, never in a report or commit.

The recorded report passed **5/5** on November 20, 2026. The crew deposited **2 USDC** and withdrew **2.197402 USDC**, a **9.8701%** return in a controlled mock-price settlement test. This is not an investment return claim. The decision memo records a **$0.552475** swap, **91%** self-reported Gemini odds, event `FED261211`, the outcome, reason and fetch timestamp. A memo proves what the captain wrote, not the authenticity of its off-chain source.

The [whitepaper implementation companion](whitepaper.md), based on Abraham's research draft, connects the economic equations to source and tests. It covers finite first-loss protection, linear fee vesting, integer rounding and where proposed controls exceed the current implementation.

## Prize fit and evidence

[Official UBC guide](https://docs.google.com/document/d/1QaySCo7u3VxMVNdk3C5Ab3ewc2E46AuLntti-Uzx5EY/edit) and [Devpost](https://ubc-hackathon-2026.devpost.com/) allow one main track, one chain award and qualifying optional bounties. The amounts below are prize values, not forecasts or winning probabilities.

| Target | Prize | Evidence to show | Material limitation |
|---|---:|---|---|
| DeFi and Onchain Applications | $2,000 track winner | Non-custodial vault, first-loss waterfall, fixed voyage, full settlement proof | Unaudited; oracle, liquidity and liveness trust remain |
| Best use of Arc | $1,000 within the track | Contracts, USDC deposits and settlement on chain 5042002; explorer links and verifier; production passkey onboarding | Testnet; other assets are mocks; sponsored boarding is unverified |
| Gemini Prediction Markets | $2,500 / $1,000 / $500 | Public event API → threshold decision → on-chain swap memo; data validation and hold-on-failure tests | Uses market data to allocate a vault; no Gemini orders. The guide explicitly permits market data and/or trading endpoints; award merit is judged by Gemini and UBC |
| Official UBC winner | $2,500 / $1,000 / $500 | Same project; clear reproducible demo and honest risk disclosures | Judged across all tracks |

The prize targets above reflect the implemented integrations. Streams, voice and Grok Bot are outside this submission: no configured Streams delivery, voice integration or Grok Bot is implemented. An RPC endpoint alone would not satisfy the [requirement that Streams be a core data source](https://www.universityblockchain.org/programs/hackathon).

## What an AI agent can actually do

The stdio MCP server exposes **14 tools**, **3 resources** and **1 review prompt**, with read/write annotations, structured JSON and unsigned planning by default. `boats://playbook`, `boats://evidence` and `boats://proof-report` give agents the operating rules and claim provenance without an RPC call. Create → stake → crew boards → sail is supported explicitly. It checks for missing crew/stake before sailing, rejects a signed caller mismatch and preserves transaction hashes when a later step or receipt poll fails. Live state can change after a pre-check.

The bundled captain is a deterministic rule-based agent, not an LLM. External LLM agents can operate through MCP. Invalid probabilities, ambiguous outcomes, closed markets and fetched snapshots older than two minutes cause it to hold. It requires a valid bid and ask, matching midpoint and width at most 500 probability basis points (five percentage points). Raw quote strings remain visible. Fetch freshness does not establish last-trade freshness; quote width does not establish market depth. Normal swaps use a configurable 1% default oracle-value slippage floor. The deliberately reverting rogue demo is separate from normal trading. The historical memo predates the new quote gate; current tests and offline replay verify that gate.

## Statistics: use the actual scope

| Evidence | Correct interpretation |
|---|---|
| [I-HITL, October 2026](https://arxiv.org/html/2610.35835v1) | 9/10 tested models self-escalated in at least one of 20 benign payment runs each. Not a 90% rate across transactions or agents generally |
| [FBI IC3 2025 report, p. 55](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf) | $7,277,868,919 in reported cryptocurrency-related investment-fraud losses. Boats does not claim to prevent all those loss mechanisms |
| [Riskified, October 27, 2026](https://www.riskified.com/press/agentic-commerce-pulse-consumer-survey-november-2026/) | 5,100 adult online shoppers, five countries: 7% comfortable with AI purchases without approval; 29% allow automatic purchases within their rules. Shopping behavior is not measured investment demand |

## Production passkey status

November 20 verification found two configuration errors: both the client key's allowed web domain and the passkey domain were `localhost`. Both are now `boats-liard.vercel.app`, as required by [Circle's modular wallet guide](https://developers.circle.com/wallets/modular/create-a-modular-wallet). A diagnostic using only the deployed public configuration now returns Circle HTTP **200**, a login challenge and `rpId: boats-liard.vercel.app`, replacing the previous **401**. The user then completed the production passkey flow in Brave; the `/me` page displayed “SIGNED IN WITH Face ID passkey” and a wallet address. No app key changed and no private production variables were downloaded. This verifies onboarding, not a sponsored `board()` operation, which remains untested.
