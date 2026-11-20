# Judge guide: verify Boats in three minutes

Start with [the deployed app](https://boats-liard.vercel.app), [contract addresses](../README.md#contract-addresses-arc-testnet), and the [recorded verification report](evidence-report.json). This is an unaudited Arc testnet prototype with team-posted oracle prices and team-funded adapter liquidity. USYC, EURC and cirBTC are mocks; there is no demonstrated real yield.

## Reproduce the evidence without a wallet

```bash
npm install
npm run verify:proof
# In an environment requiring its configured HTTP proxy:
NODE_USE_ENV_PROXY=1 npm run verify:proof
```

The command constructs no signer and sends no transaction. It checks chain 5042002 and five submitted proofs: exact target and method, successful swap + decoded Gemini memo, reverted out-of-mandate swap + historical max-weight rejection, take-profit event, settlement event and crew payout. A mismatch or unavailable RPC read exits nonzero. An archival-capable Arc RPC can be supplied with `BOATS_RPC_URL`; keep credential-bearing endpoints in a local `.env`, never in a report or commit.

The recorded report passed **5/5** on November 20, 2026. The crew deposited **2 USDC** and withdrew **2.197402 USDC**, a **9.8701%** return in a controlled mock-price settlement test. This is not an investment return claim. The decision memo records a **$0.552475** swap, **91%** self-reported Gemini odds, event `FED261211`, the outcome, reason and fetch timestamp. A memo proves what the captain wrote, not the authenticity of its off-chain source.

## Prize fit and evidence

[Official UBC guide](https://docs.google.com/document/d/1QaySCo7u3VxMVNdk3C5Ab3ewc2E46AuLntti-Uzx5EY/edit) and [Devpost](https://ubc-hackathon-2026.devpost.com/) allow one main track, one chain award and qualifying optional bounties. The amounts below are prize values, not forecasts or winning probabilities.

| Target | Prize | Evidence to show | Material limitation |
|---|---:|---|---|
| DeFi and Onchain Applications | $2,000 track winner | Non-custodial vault, first-loss waterfall, fixed voyage, full settlement proof | Unaudited; oracle, liquidity and liveness trust remain |
| Best use of Arc | $1,000 within the track | Contracts, USDC deposits and settlement on chain 5042002; explorer links and verifier | Testnet; other assets are mocks; production passkey flow is unverified |
| Gemini Prediction Markets | $2,500 / $1,000 / $500 | Public event API → threshold decision → on-chain swap memo; data validation and hold-on-failure tests | Uses market data to allocate a vault; no Gemini orders. The guide explicitly permits market data and/or trading endpoints; award merit is judged by Gemini and UBC |
| Official UBC winner | $2,500 / $1,000 / $500 | Same project; clear reproducible demo and honest risk disclosures | Judged across all tracks |

Do not select the Streams bounty: no configured stream or delivery evidence was found. An RPC endpoint alone would not satisfy the [requirement that Streams be a core data source](https://www.universityblockchain.org/programs/hackathon). No voice or Grok Bot integration is implemented, so do not select those bounties. The maximum first-place cash combination for the four targets above is $8,000; there is no defensible probability estimate from the available information.

## What an AI agent can actually do

The stdio MCP server exposes **14 tools** with read/write annotations, structured JSON and unsigned planning by default. Create → stake → crew boards → sail is supported explicitly. It checks for missing crew/stake before sailing, rejects a signed caller mismatch and preserves transaction hashes when a later step or receipt poll fails. Live state can change after a pre-check.

The bundled captain is a deterministic rule-based agent, not an LLM. External LLM agents can operate through MCP. Invalid probabilities, ambiguous outcomes, inactive markets and fetched snapshots older than two minutes cause it to hold. Fetch freshness does not establish when a market last traded. Normal swaps use a configurable 1% default oracle-value slippage floor. The deliberately reverting rogue demo is separate from normal trading.

## Statistics: use the actual scope

| Evidence | Correct interpretation |
|---|---|
| [I-HITL, October 2026](https://arxiv.org/html/2610.35835v1) | 9/10 tested models self-escalated in at least one of 20 benign payment runs each. Not a 90% rate across transactions or agents generally |
| [FBI IC3 2025 report, p. 55](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf) | $7,277,868,919 in reported cryptocurrency-related investment-fraud losses. Boats does not claim to prevent all those loss mechanisms |
| [Riskified, October 27, 2026](https://www.riskified.com/press/agentic-commerce-pulse-consumer-survey-november-2026/) | 5,100 adult online shoppers, five countries: 7% comfortable with AI purchases without approval; 29% allow automatic purchases within their rules. Shopping behavior is not measured investment demand |

## Production passkey status

November 20 verification: the deployed app offered “Continue with Face ID”, but sign-in failed. A diagnostic using only its public client configuration returned Circle HTTP **401**, `Invalid credentials`. The configured endpoint and `/arcTestnet` chain path match Circle's [reference app](https://github.com/circlefin/arc-p2p-payments). A valid Client Key and matching passkey domain must be verified in Circle Console, then the Vercel build redeployed and tested on a real device. No sponsored boarding is claimed as verified. Private production variables were not downloaded.

Remaining submission work: record and attach an accessible 2–3 minute video, confirm team acceptance and prize opt-ins, and submit before 12:00 PM CST. These external submission steps have not been performed by this verification command.
