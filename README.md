# Boats

[![CI](https://github.com/Villarley/boats/actions/workflows/ci.yml/badge.svg)](https://github.com/Villarley/boats/actions/workflows/ci.yml)
![Arc testnet](https://img.shields.io/badge/Arc_testnet-live-23408E)
![License: MIT](https://img.shields.io/badge/license-MIT-0B1A30)

**Your money sails. Nobody can take it.**

**Try it on your phone: [boats-liard.vercel.app](https://boats-liard.vercel.app)** (Arc testnet; you get $5 of test USDC on first open)

Boats is infrastructure for delegated money on Arc. A captain (a person or an AI) trades a crew's money inside an on-chain mandate. The captain can never withdraw it, puts up a stake that takes the first loss, and every voyage ends at a stop loss, a take profit or a date that the contract enforces.

> "The market fell 10%. Grandma lost 1%."

| Welcome | Pick a boat | Westerly (AI captain, live) | Safe Harbor |
|---|---|---|---|
| ![Welcome](docs/screenshots/01-welcome.png) | ![Explore](docs/screenshots/03-explore.png) | ![Westerly](docs/screenshots/04-westerly.png) | ![Safe Harbor](docs/screenshots/05-safe-harbor.png) |

_Screenshots of the PWA reading Arc testnet live (iPhone size)._

## Live on Arc testnet

Everything below happened on chain and can be checked on the explorer.

| What | Proof |
|---|---|
| Westerly opens: the AI captain stakes $3, the crew boards $8, the voyage sails | [`sail()`](https://testnet.arcscan.app/tx/0x62fc5ac78b956aa1748c080ee949ecb815d65d59d4c19bfc093365ca2d0e42d5) |
| The AI captain reads Gemini's "Fed decision in December?" market (hike 25bps at 91%) and moves half the boat to Treasuries | [`swap()`](https://testnet.arcscan.app/tx/0x7fd20ec1dc368c1180c3156638ae4a9914e719722cc10962680879cd477225ea) |
| A rogue captain tries to put everything into Bitcoin. The contract refuses: max weight exceeded | [reverted `swap()`](https://testnet.arcscan.app/tx/0x748ab0dbcdb8f122e27c3dff303eb268950f194111bb804e731ad348ee186ee6) |
| Safe Harbor: captain stakes $2, crew boards $3, still boarding (visitors can join) | [`board()`](https://testnet.arcscan.app/tx/0x18c30a88281fc3e69f8b37a9bd1a5e5c2d85202d1ca10965fcc6ba6913f6695b) |
| A full voyage, start to finish (Trade Winds): captain stakes $1, crew boards $2, captain buys Bitcoin | [`sail()`](https://testnet.arcscan.app/tx/0x2ca00d42b47ef5e51531a5332a98d3b87621f715f854c49f7c2459a60078b7c2) · [`swap()`](https://testnet.arcscan.app/tx/0xe54fc288be4c993b3d9ce4f680a1248d85d4c53f8d5aaac57f5724e30ffd6d5a) |
| Bitcoin +25%: anyone calls `checkVoyage()`, the +10% goal is hit, the boat sells everything back to dollars | [`checkVoyage()`](https://testnet.arcscan.app/tx/0x2248e6f6ce95e912017c645bdee0f4fcf8be8db26f1552927f682157c06491f8) · [`returnToPort()`](https://testnet.arcscan.app/tx/0xe5f95b1ff9ab4f9fc54f51a5802cbdea2deff90c1144b144e1a2a65561f882e2) |
| The crew withdraws $2.20 for $2 in (+9.9% after the captain's 20% fee); the captain claims stake + fee | [`withdraw()`](https://testnet.arcscan.app/tx/0x87a3d5ffd2b045ba0aa702d64247a4b2716211a98234501e330b811d5f88954e) · [`claimCaptain()`](https://testnet.arcscan.app/tx/0x3d22e2391ea12f34d6dae50172b44a6f7325f31e12ebb65175e0a1ca81682087) |

Addresses are in [Contract addresses](#contract-addresses-arc-testnet).

## For AI agents

Any agent can be a captain or crew member. The contract, not the model, is what keeps the money safe.

- **MCP server** (`packages/mcp`): `boats_list`, `boats_check_trade` (dry-run against the mandate, with the max allowed amount), `boats_worst_case`, `boats_odds` (live Gemini), `boats_act` (board, swap, stake and sail, check voyage...). Run `npx tsx packages/mcp/src/server.ts`.
- **[AGENTS.md](AGENTS.md)**: lifecycle, who can call what, mandate rules, revert reasons, addresses.
- **[llms.txt](https://boats-liard.vercel.app/llms.txt)** on the live app.
- **[@boats/sdk](packages/sdk)**: captain quickstart in TypeScript.

## Why

To let someone manage your money today, you have to hand over custody. They can take it, take too much risk, or charge fees while they lose. That holds for a fund manager, a friend who "knows crypto", a trading bot and an AI agent. In a controlled experiment with real USDC (I-HITL, Cornell Tech and Yale/IC3, Oct 2026), 9 of 10 AI models raised their own spending cap at least once. Boats removes custody from the equation: the contract holds the money, and the captain's only power is `swap()` inside the rules.

## How it works

```mermaid
flowchart LR
  Crew([Crew<br/>passkey wallet]) -- "board(USDC)" --> Boat
  Captain([Captain<br/>human or AI]) -- "stakeCaptain · swap() only" --> Boat
  Gemini[(Gemini<br/>prediction markets)] -. odds .-> AI[AI captain]
  AI --> Captain
  Boat -- "swap inside mandate" --> Router[SwapAdapter<br/>allowlisted router]
  Router -- prices --> Oracle[PriceOracle]
  QN[QuickNode Stream] -- webhook --> Keeper
  Keeper -- "checkVoyage() · returnToPort()" --> Boat
  Boat -- "withdraw()" --> Crew
  Factory[BoatFactory] -- creates --> Boat
```

```
Open ──sail()──▶ Sailing ──checkVoyage()──▶ Returning ──returnToPort()──▶ Closed
 board()           swap() (captain only,      (anyone can call)   (anyone)       withdraw()
 stakeCaptain()    allowed assets, max weight)                                     claimCaptain()
```

1. **A boat is a voyage, not an open fund.** Everyone boards at the same price, so one floor and one goal apply to the whole crew.
2. **The captain can only swap.** It goes through the boat's router (the app only lists boats on the official adapter), only into listed assets, and only below each asset's max weight. There is no transfer, withdraw or approve for the captain: those functions don't exist.
3. **The captain takes the first loss.** Losses hit the captain's stake before the crew's money. The fee is a share of the crew's profit only, and it vests over time.
4. **Limits are enforced on chain.** `checkVoyage()` is public. A keeper (fed by a QuickNode Stream) or anyone else can call it.
5. **One factory, no custom code.** Code risk is the same for every boat, so the seaworthiness score measures strategy risk only.

## Architecture: protocol first, apps on top

| Layer | Path | What |
|---|---|---|
| Contracts | `contracts/` | `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter` (Foundry, 18 tests incl. invariants, CI on every push) |
| SDK | `packages/sdk/` | `@boats/sdk`: reads, mandate pre-check, waterfall, score, calldata builders, wallet interface, keeper, Gemini odds |
| App | `app/` | PWA for crew and captains. Invisible wallet: passkey smart account (Circle Modular Wallets) + paymaster, no seed phrase, no gas |
| MCP server | `packages/mcp/` | Any AI agent (Claude, GPT...) can read boats, dry-run trades against the mandate and act as captain or crew. See [AGENTS.md](AGENTS.md) |
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
- **Liquidity.** Arc testnet has no liquidity for these pairs, so `SwapAdapter` swaps at the oracle price minus a spread, against liquidity we fund. A real DEX router can replace it without changing `Boat`.
- **Official boats only.** `BoatFactory` is permissionless and each boat stores its oracle and router, so someone could launch a boat with their own router. The app, the MCP server and the keeper only list boats that use the deployment's oracle, adapter and USDC (`listOfficialBoats()` in the SDK). In production the factory would enforce this allowlist on chain.
- **Owner key (testnet).** One key owns `PriceOracle` (prices, max age, deviation cap) and `SwapAdapter` (liquidity). It could move prices or pull liquidity, which would end or freeze voyages. It cannot call any function that sends crew money elsewhere. Mainnet plan: decentralized feeds, a multisig with a timelock, and an in-kind exit if the router fails.
- **Limits are checked when called.** `swap()` doesn't check the stop loss itself; `checkVoyage()` does. The keeper runs it at least every 10 minutes, and anyone can call it.
- **Exit slippage.** `returnToPort()` accepts up to 1% below the oracle value. The app shows the real figure.
- **Assets.** USDC is Circle's testnet token. Assets we couldn't fund on Arc testnet (EURC liquidity, USYC needs an allowlist, cirBTC) are deployed as clearly labelled mocks.
- **Captain liveness.** If the captain disappears after sailing, the money stays inside the rules, and the voyage still ends at its date. Anyone can bring it back to port. Known gap: a boat that never sails keeps its crew deposits until the captain calls `sail()`; v2 adds a refund after the end date.
- **Dilution.** A larger crew dilutes the captain's cushion. The app computes the worst case at review time with `worstCaseIfBoarding()`, not a static number.

## How we use Arc

- All contracts are deployed on **Arc testnet** (chain 5042002). USDC is the gas token.
- **Invisible wallet:** passkey sign-in creates a Circle Modular Wallet smart account. Boarding batches `approve` + `board` in one user operation sponsored by the paymaster, so grandma never sees gas, a seed phrase or an address.
- Real Circle USDC (gas and deposits); other assets are labelled mocks.
- Every trade, blocked attempt and withdrawal links to the Arc explorer.

## Gemini Prediction Markets

The AI captain reads the public market-data API (`GET /v1/prediction-markets/events/{ticker}`). A contract's YES price is its implied probability. Live rule: *"If the odds of a Fed hike 25bps go above 70%, move half to Treasuries."* (event `FED261211`, "Fed decision in December?"). The app shows the same live odds on every boat card. The odds inform the decision, and the contract limits what can execute. If market data is down, the captain holds and says so in its log. Odds also appear on every boat card as a risk signal.

## QuickNode Streams

- **Network:** Arc Testnet. **Dataset:** logs.
- **Filter:** `PriceUpdated` from the oracle and `Traded` from the boats (by address and topic0). See `docs/quicknode.md`.
- **Destination:** webhook `POST /api/keeper` (header `x-keeper-secret`). The keeper simulates `checkVoyage()` on every official boat, sends it when a limit is crossed, then calls `returnToPort()`.
- **Backup:** a GitHub Actions cron (`.github/workflows/keeper.yml`) calls the same endpoint every 10 minutes.

## Run it

```bash
npm install               # workspaces: sdk, captain, app
npm test                  # SDK, captain and MCP unit tests

cd contracts
forge install foundry-rs/forge-std --no-git
forge test -vv            # 18 tests incl. invariants
```

Deploy to Arc testnet without Foundry (viem + solc-js), after funding three wallets at faucet.circle.com:

```bash
# contracts/.env: DEPLOYER_KEY, CAPTAIN_PRIVATE_KEY, CREW_PRIVATE_KEY
ADAPTER_USDC=10 STAKE=3 CREW_AMOUNT=12 npm run deploy:arc -w app
npm run deploy:arc -w app -- --seed-open   # stake + seed crew on Safe Harbor and Open Sea
npm run deploy:arc -w app -- --refresh     # re-post oracle prices (testnet max age: 30 days)
```

Or with Foundry:

```bash
cd contracts
cp .env.example .env      # DEPLOYER_KEY, CAPTAIN_PRIVATE_KEY, CREW_PRIVATE_KEY, CAPTAIN_HUMAN
./deploy-testnet.sh       # deploys, writes app/src/config/arc-deployment.json, seeds Westerly
NEXT_PUBLIC_CHAIN=arc npm run build -w app
```

Local demo (no wallets needed): `npm run chain -w app` in one terminal, `npm run build -w app && npm run start -w app` in another. `npm run e2e -w app` runs the full voyage on an iPhone viewport.

AI captain: `cp captain/.env.example captain/.env`, fill it, then `npm run captain -w captain` (`captain:rogue` shows the contract blocking a bad trade).

## Contract addresses (Arc testnet)

Deployed Nov 20, 2026 with `npm run deploy:arc -w app` (viem + solc-js; `contracts/deploy-testnet.sh` does the same with Foundry). On testnet the oracle accepts prices up to 30 days old so the demo never goes stale; production would use a live feed with a short max age. Re-post prices with `node app/scripts/deploy-arc.mjs --refresh`.

| Contract | Address |
|---|---|
| BoatFactory | [`0x90acf1bb09a7b71c276187a7791e0593dfc68e74`](https://testnet.arcscan.app/address/0x90acf1bb09a7b71c276187a7791e0593dfc68e74) |
| PriceOracle | [`0xec5c4538335dc7712ae98660574b071232272093`](https://testnet.arcscan.app/address/0xec5c4538335dc7712ae98660574b071232272093) |
| SwapAdapter | [`0x0cca2f532467984014445bef61b592a1eaec9cf0`](https://testnet.arcscan.app/address/0x0cca2f532467984014445bef61b592a1eaec9cf0) |
| Safe Harbor | [`0x89376Bb6bE0824A4bCD832C86C8Fac483B6Eb978`](https://testnet.arcscan.app/address/0x89376Bb6bE0824A4bCD832C86C8Fac483B6Eb978) |
| Westerly (AI captain, sailing) | [`0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359`](https://testnet.arcscan.app/address/0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359) |
| Open Sea | [`0xC2FFFAAA021f4214E6e685e883Cc06E0601e5c29`](https://testnet.arcscan.app/address/0xC2FFFAAA021f4214E6e685e883Cc06E0601e5c29) |
| Trade Winds (finished voyage) | [`0x7281C2b57894d9061B83A316426fC6149C729160`](https://testnet.arcscan.app/address/0x7281C2b57894d9061B83A316426fC6149C729160) |
| USDC (Circle) | [`0x3600000000000000000000000000000000000000`](https://testnet.arcscan.app/address/0x3600000000000000000000000000000000000000) |
| EURC (mock) | [`0x1a5dc3284fc658472fe2a7eaef3c87f0c7575000`](https://testnet.arcscan.app/address/0x1a5dc3284fc658472fe2a7eaef3c87f0c7575000) |
| USYC (mock; Circle's USYC needs an allowlist) | [`0xc1401fecd029e1f3a528cc02535e98f95873fac1`](https://testnet.arcscan.app/address/0xc1401fecd029e1f3a528cc02535e98f95873fac1) |
| cirBTC (mock) | [`0x1f99f14b0704bd2551129385867a7f477d2b1e5e`](https://testnet.arcscan.app/address/0x1f99f14b0704bd2551129385867a7f477d2b1e5e) |
| AI captain wallet | [`0x6C40b242f6bF39AA488c3fD0bdFC6834A24020dF`](https://testnet.arcscan.app/address/0x6C40b242f6bF39AA488c3fD0bdFC6834A24020dF) |

## License

[MIT](LICENSE)
