# AGENTS.md: Boats for AI agents

Boats is a fund ("boat") on Arc where a captain, human or AI, trades the crew's USDC inside an on-chain mandate. The captain can only call `swap()`, puts up a stake that loses first, and every voyage ends at a stop loss, a take profit or a date. **Your safety as an agent does not depend on you behaving: the contract rejects anything outside the mandate.**

## Fastest path: the MCP server

```bash
npm install
npx tsx packages/mcp/src/server.ts          # stdio MCP server, reads Arc testnet
```

Claude Desktop / Claude Code config:

```json
{ "mcpServers": { "boats": { "command": "npx", "args": ["tsx", "/path/to/boats/packages/mcp/src/server.ts"],
  "env": { "BOATS_PRIVATE_KEY": "0x... (optional: without it, write tools return unsigned calls)" } } } }
```

| Tool | What it does |
|---|---|
| Tool | Use it to |
|---|---|
| `boats_deployment` | Get chain id, RPC, contract and token addresses, faucet, and whether the server can sign |
| `boats_list` / `boats_get` | Read official boats: state, `allowedActions` per role, value, limits, holdings with current and max weights |
| `boats_score` | Get the 0-100 seaworthiness score with a reason per factor |
| `boats_worst_case` | Before boarding: `canBoard` and the target worst-case loss in dollars |
| `boats_check_trade` | Dry-run a captain swap against the mandate (and the caller's role) |
| `boats_position` / `boats_my_positions` | See a wallet's deposits, value now, `canWithdraw`, captain stakes, USDC balance |
| `boats_activity` | Recent on-chain events with explorer links |
| `boats_odds` / `boats_odds_contracts` | Read live Gemini Prediction Markets odds; list an event's contracts |
| `boats_create` | Launch a boat on the official factory, oracle and router (validated like the constructor) |
| `boats_act` | `board`, `withdraw`, `stake_and_sail`, `swap` (with slippage cap and optional on-chain `reason`), `claim_captain`, `check_voyage`, `return_to_port` |
| `boats_tx_status` | Check a sent transaction |

Conventions: money is a number in dollars (`...Usd`), percentages are positive numbers (`stopLossPct: 10` means the voyage ends at -10%). Write tools never return calls that would revert: they answer `ok: false` with `problems` instead.

## Typical flows

- **Crew:** `boats_list` → `boats_score` + `boats_worst_case` → `boats_act board` → later `boats_my_positions` → `boats_act withdraw`.
- **Captain:** `boats_create` → `boats_act stake_and_sail` → `boats_odds` → `boats_check_trade` → `boats_act swap` (with `reason`) → `boats_act claim_captain`.
- **Keeper (anyone):** `boats_list` → `boats_act check_voyage` on Sailing boats → `boats_act return_to_port` on Returning ones.

See [packages/mcp/examples/session.md](packages/mcp/examples/session.md) for a real session against Arc testnet.

## Network

| | |
|---|---|
| Chain | Arc testnet, id `5042002`, gas token USDC |
| RPC | `https://rpc.testnet.arc.io` (logs are capped below 10k blocks per call) |
| Explorer | `https://testnet.arcscan.app` |
| Addresses | `app/src/config/arc-deployment.json` (also `arcTestnetDeployment` in `@boats/sdk`) |
| Test USDC | https://faucet.circle.com (Arc testnet) |
| Sandbox proxy | If your environment needs an HTTP proxy, run Node with `NODE_USE_ENV_PROXY=1` |

## Voyage lifecycle

```
Open ──sail()──▶ Sailing ──checkVoyage()──▶ Returning ──returnToPort()──▶ Closed
```

| Who | Open | Sailing | Returning | Closed |
|---|---|---|---|---|
| Captain | `stakeCaptain(amount)`, `sail()` | `swap(tokenIn, tokenOut, amountIn, minOut)` | | `claimCaptain()` (fee vests) |
| Crew | `board(amount)` (approve USDC first) | | | `withdraw()` |
| Anyone | | `checkVoyage()` ends it past a limit or the end date | `returnToPort()` sells back to USDC (max 1% slippage) | |

Amounts are USDC base units (6 decimals). Prices come from `PriceOracle` (18 decimals).

## Mandate rules (enforced in `Boat.swap()`)

- Only the captain, only while `Sailing`.
- Only through the boat's router, only between assets of the boat (USDC or its listed assets, in any direction).
- After the trade, each asset's value must stay at or below its `maxWeightBps` of NAV.
- Reverts: `NotCaptain()`, `WrongState(expected, actual)`, `MandateViolation(reason)`, `ZeroAmount()`. Constructor: `BadConfig(reason)`.

Mirror of the check in TypeScript: `checkTrade()` in `packages/sdk/src/mandate.ts`. Always pre-check, then send.

## Only trust official boats

The factory is permissionless. A boat created with another oracle or router is not safe. Use `listOfficialBoats(publicClient, arcTestnetDeployment)` from the SDK (the MCP server and the app already do).

## Write your own captain

See "Captain quickstart" in `packages/sdk/README.md`, or copy `captain/src/index.ts` (our AI captain: Gemini odds → plain-words rule → `checkTrade` → `swap`).

## Repo map

| Path | What |
|---|---|
| `contracts/` | Solidity (Foundry): `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter`, tests incl. invariants |
| `packages/sdk/` | `@boats/sdk`: reads, mandate pre-check, first-loss math, calldata builders, keeper, Gemini odds |
| `packages/mcp/` | MCP server over the SDK |
| `captain/` | The AI captain and a keeper CLI |
| `app/` | Next.js PWA plus API routes (`/api/odds`, `/api/activity`, `/api/captain-log`, `/api/keeper`, `/api/faucet`) |

## Working in this repo

- `npm install`, then `npm test` (SDK, captain, MCP unit tests). Contracts: `cd contracts && forge test`.
- `npm run typecheck` before committing. Don't commit `.env` files: keys never go in the repo.
- Don't redeploy contracts: the addresses above are live and linked from the docs.
