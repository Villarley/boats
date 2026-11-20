# Boats: Devpost submission draft

**Tagline:** Your money sails. Nobody can take it.

**Try it:** https://boats-liard.vercel.app (Arc testnet, $5 of test USDC on first open) · **Code:** https://github.com/Villarley/boats

## Proof on Arc testnet
- AI captain reads Gemini's "Fed decision in December?" market and trades: https://testnet.arcscan.app/tx/0xfc9335b11c63399060b7708db5aeb18705b51b8c1ac578d7091bc6913cbfda51
- A rogue captain tries to put everything in Bitcoin; the contract refuses: https://testnet.arcscan.app/tx/0x05f6810342d3c61f0b0f23c0a39f7818dbf161c3c2df81fa95a0aa828f795630
- A full voyage hits its +10% goal and the crew withdraws +9.9%: https://testnet.arcscan.app/tx/0xcf45df3eb237b834d77f1956bb4b98601962d2961d3c41d120fb440973f02c68

## Inspiration
To have someone manage your money today, you hand over custody. A fund manager, a friend who knows crypto, a bot, an AI agent: all of them can take it, take too much risk, or charge fees while they lose. In a controlled experiment with real USDC (I-HITL, Cornell Tech / IC3, Oct 2026), 9 of 10 AI models raised their own spending cap. Investment scams cost Americans $7.9B in 2025. People don't say "never let anyone manage my money". They say "only within my rules".

## What it does
Boats turns "only within my rules" into a contract on Arc. A boat is a fund with a fixed voyage. A captain (a person or an AI) trades the crew's money, but:
- they can only `swap()`, only into listed assets, and only below each asset's max weight;
- they put up a stake that takes the first loss;
- the voyage ends at a stop loss, a take profit or a date, enforced by the contract, and anyone can trigger it.

The crew signs in with one tap (Face ID with a Circle passkey wallet) and never sees a seed phrase or gas. Before boarding, they see the worst case in dollars. "The market fell 10%. Grandma lost 1%."

## How we built it
- **Contracts (Solidity, Foundry):** Boat, BoatFactory, PriceOracle, SwapAdapter. 18 tests including invariants (value conservation, the captain can't siphon, weights hold, the crew is protected in a loss).
- **@boats/sdk (TypeScript):** the protocol layer. It covers reads, a mandate pre-check that mirrors the contract, first-loss math, the seaworthiness score, calldata builders, a wallet interface and the keeper.
- **PWA (Next.js):** crew and captain modes in one app, plus an invisible wallet (Circle Modular Wallets passkey smart account + paymaster). Boarding is one user operation.
- **AI captain:** reads Gemini Prediction Markets odds and acts on plain-words rules. It can only call `swap()`.
- **Keeper:** `checkVoyage()` and `returnToPort()` are public; our keeper webhook is built for a QuickNode Stream on oracle and trade logs, and anyone can call it.
- **CI:** Foundry tests, SDK and captain tests, and a full-voyage e2e on an iPhone viewport run on every push.

## Challenges
No liquidity or gold on Arc testnet: we built an oracle-priced swap adapter behind an allowlist, so a real router can replace it. Making "worst case" honest: boarding dilutes the captain's cushion, so the number is computed at review time.

## Accomplishments
A captain, human or AI, who can't take your money, can't break your rules, and loses first.

## What's next
Fee clawback across voyages, captain leaderboard, recurring deposits from abroad, our own passkey account and paymaster, mainnet with real oracles.

## Built with
Arc, USDC, Circle Modular Wallets, Solidity, Foundry, viem, Next.js, TypeScript, Gemini Prediction Markets API, QuickNode Streams.

## Tracks
DeFi & Onchain Applications · Best use of Arc · Gemini Prediction Markets · QuickNode Streams
