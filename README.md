# Boats

**Your money sails. Nobody can take it.**

Boats is infrastructure for delegated money on Arc. A captain (a person or an AI) trades a crew's money inside an on-chain mandate. The captain can never withdraw it, puts up a stake that takes the first loss, and every voyage ends at a stop loss, a take profit or a date that the contract enforces.

> "The market fell 10%. Grandma lost 1%."

## Why

To let someone manage your money today, you have to hand over custody. They can take it, take too much risk, or charge fees while they lose. That holds for a fund manager, a friend who "knows crypto", a trading bot and an AI agent. In a controlled experiment with real USDC (I-HITL, Cornell Tech / IC3, Oct 2026), 9 of 10 AI models raised their own spending cap at least once. Boats removes custody from the equation: the contract holds the money, and the captain's only power is `swap()` inside the rules.

## How it works

```
Open ──sail()──▶ Sailing ──checkVoyage()──▶ Returning ──returnToPort()──▶ Closed
 board()           swap() (captain only,      (anyone can call)   (anyone)       withdraw()
 stakeCaptain()    allowed assets, max weight)                                     claimCaptain()
```

1. **A boat is a voyage, not an open fund.** Everyone boards at the same price, so one floor and one goal apply to the whole crew.
2. **The captain can only swap.** It goes through an allowlisted router, only into listed assets, and only below each asset's max weight. There is no transfer, withdraw or approve for the captain: those functions don't exist.
3. **The captain takes the first loss.** Losses hit the captain's stake before the crew's money. The fee is a share of the crew's profit only, and it vests over time.
4. **Limits are enforced on chain.** `checkVoyage()` is public. A keeper (fed by a QuickNode Stream) or anyone else can call it.
5. **One factory, no custom code.** Code risk is the same for every boat, so the seaworthiness score measures strategy risk only.

## Architecture: protocol first, apps on top

| Layer | Path | What |
|---|---|---|
| Contracts | `contracts/` | `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter` (Foundry, 18 tests incl. invariants) |
| SDK | `packages/sdk/` | `@boats/sdk`: reads, mandate pre-check, waterfall, score, calldata builders, wallet interface, keeper, Gemini odds |
| App | `app/` | PWA for crew and captains. Invisible wallet: passkey smart account (Circle Modular Wallets) + paymaster, no seed phrase, no gas |
| AI captain | `captain/` | Reads Gemini prediction-market odds, decides by plain-words rules, trades only via `Boat.swap()` |
| Keeper | `packages/sdk/src/keeper.ts` + `app/api/keeper` | Webhook for the QuickNode Stream: `checkVoyage()` then `returnToPort()` |

The PWA, the AI captain and the keeper are all clients of the same SDK. Anyone can build another app or another captain on it.

## Economic design

C = crew principal, K = captain stake, V = final value (USDC).

- **Loss (V < C + K):** the captain absorbs first. Crew gets `min(C, V)`, captain gets `V − crew`.
- **Profit:** P = V − C − K. Crew profit = P·C/(C+K). Fee = feeBps × crew profit (vested linearly). Crew gets C + crew profit − fee.

| Scenario (C 10,000 · K 1,000 · fee 20%) | V | Crew | Captain |
|---|---|---|---|
| Market −6% | 10,340 | 10,000 (0%) | 340 |
| Stop loss −10% | 9,900 | 9,900 (−1%) | 0 |
| Take profit +15% | 12,650 | 11,200 (+12%) | 1,150 + 300 fee (vested) |

The same math lives in `Boat.waterfall()` and in `@boats/sdk` `waterfall()`. Tests check that they match.

## Risk assumptions

- **Oracle.** On testnet we push the prices ourselves. `PriceOracle` rejects prices older than `maxAge` and caps each update at `maxDeviationBps`. A production version would plug in a decentralized oracle behind the same interface.
- **Liquidity.** Arc testnet has no liquidity for these pairs, so `SwapAdapter` swaps at the oracle price minus a spread, against liquidity we fund. Boats trade only through an allowlisted router, so a real DEX router can replace it.
- **Exit slippage.** `returnToPort()` accepts up to 1% below the oracle value. The app shows the real figure.
- **Assets.** USDC and EURC are Circle's testnet tokens. Assets we couldn't get on Arc testnet (USYC needs an allowlist; cirBTC) are deployed as clearly labelled mocks.
- **Captain liveness.** If the captain disappears, the money stays inside the rules, and the voyage still ends at its date. Anyone can bring it back to port.
- **Dilution.** A larger crew dilutes the captain's cushion. The app computes the worst case at review time with `worstCaseIfBoarding()`, not a static number.

## How we use Arc

- All contracts are deployed on **Arc testnet** (chain 5042002). USDC is the gas token.
- **Invisible wallet:** passkey sign-in creates a Circle Modular Wallet smart account. Boarding batches `approve` + `board` in one user operation sponsored by the paymaster, so grandma never sees gas, a seed phrase or an address.
- Real Circle assets where Arc testnet has them (USDC, EURC).
- Every trade, blocked attempt and withdrawal links to the Arc explorer.

## Gemini Prediction Markets

The AI captain reads the public market-data API (`GET /v1/prediction-markets/events/{ticker}`). A contract's YES price is its implied probability. Rule example: *"If the odds of a Fed cut go above 70%, move half to Treasuries."* The odds inform the decision, and the contract limits what can execute. If market data is down, the captain holds and says so in its log. Odds also appear on every boat card as a risk signal.

## QuickNode Streams

- **Network:** Arc Testnet. **Dataset:** logs.
- **Filter:** `PriceUpdated` from the oracle and `Traded` from the boats (by address and topic0). See `docs/quicknode.md`.
- **Destination:** webhook `POST /api/keeper`. The keeper recomputes NAV and calls `checkVoyage()`, and then `returnToPort()`, when a limit is crossed.
- The same stream feeds each captain's value history for the track-record factor of the score.

## Run it

```bash
npm install               # workspaces: sdk, captain, app
npm test                  # SDK + captain unit tests

cd contracts
forge install foundry-rs/forge-std --no-git
forge test -vv            # 18 tests incl. invariants
```

Deploy to Arc testnet:

```bash
cd contracts
export USDC=0x...  CAPTAIN=0x<ai captain>  CAPTAIN_HUMAN=0x<captain smart account>
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_KEY
BOAT=0x<westerly> forge script script/Seed.s.sol --rpc-url arc_testnet --broadcast
```

AI captain: `cp captain/.env.example captain/.env`, fill it, then `npm run captain -w captain` (`captain:rogue` shows the contract blocking a bad trade).

## Contract addresses (Arc testnet)

_Filled after deploy._

| Contract | Address |
|---|---|
| BoatFactory | |
| PriceOracle | |
| SwapAdapter | |
| Safe Harbor | |
| Westerly (AI captain) | |
| Open Sea | |
| USDC (Circle) | |
| EURC (Circle) | |
| USYC (mock) | |
| cirBTC (mock) | |
