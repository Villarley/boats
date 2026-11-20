# Boats

A fund with a fixed voyage on Arc. A captain (human or AI) trades the crew's money but can never withdraw it, the captain's stake takes the first loss, and the contract enforces the stop loss and take profit.

> "The market fell 10%. Grandma lost 1%."

## Repo

- `contracts/`: Foundry. `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter`, `MockToken`.
- `app/`: Next.js app (passkeys, gasless deposit, marketplace).
- `captain/`: AI captain bot (Gemini odds → swap inside the mandate).
- `packages/shared/`: ABIs and addresses.

## Contracts

```
cd contracts
forge install foundry-rs/forge-std --no-git
forge test -vv
```

Voyage: `Open` (stakeCaptain, board) → `sail()` → `Sailing` (captain `swap()` only) → `checkVoyage()` (anyone) → `Returning` → `returnToPort()` (anyone) → `Closed` (crew `withdraw()`, captain `claimCaptain()`).

### Economic design (first-loss waterfall)

C = crew principal, K = captain stake, V = final value.

- Loss (V < C + K): the captain absorbs first. Crew gets min(C, V). Captain gets V − crew.
- Profit: P = V − C − K. Crew profit = P·C/(C+K). Fee = feeBps × crew profit (vested linearly). Crew gets C + crew profit − fee.

| Scenario | V | Crew | Captain |
|---|---|---|---|
| Market −6% | 10,340 | 10,000 (0%) | 340 |
| Stop loss −10% | 9,900 | 9,900 (−1%) | 0 |
| Take profit +15% | 12,650 | 11,200 (+12%) | 1,150 + 300 fee |

### Risk assumptions

- Testnet oracle is pushed by us (max age 1 day, max move per update). A production version uses a real oracle.
- `SwapAdapter` swaps at oracle price against liquidity we fund, because Arc testnet has no liquidity for these pairs. Boats only trade through the allowlisted router.
- Assets not available on Arc testnet are deployed as clearly labelled mocks.

## Arc testnet

Chain ID 5042002 · RPC https://rpc.testnet.arc.io · Explorer https://explorer.testnet.arc.io · USDC is gas.

Contract addresses: _filled after deploy_.
