# @boats/mcp

An MCP server that lets MCP-capable AI agents act as Boats captains or crew on Arc testnet. It wraps `@boats/sdk`; the contract enforces trading permissions independently of the agent. The bundled Gemini-driven captain uses deterministic rules, with no embedded LLM.

```bash
npx tsx packages/mcp/src/server.ts
```

| Env | |
|---|---|
| `BOATS_RPC_URL` | Arc testnet RPC (default `https://rpc.testnet.arc.io`) |
| `BOATS_PRIVATE_KEY` | Optional. Without it, `boats_act` returns unsigned calls for your own wallet. With it, each call is simulated, then sent |

Tools (14): `boats_deployment`, `boats_list`, `boats_get`, `boats_score`, `boats_worst_case`, `boats_check_trade`, `boats_position`, `boats_my_positions`, `boats_activity`, `boats_odds`, `boats_odds_contracts`, `boats_create`, `boats_act`, `boats_tx_status`. Details and conventions in [AGENTS.md](../../AGENTS.md). A real session: [examples/session.md](examples/session.md).

Discover context with `resources/list`, then read `boats://playbook`, `boats://evidence` and `boats://proof-report`. The evidence manifest maps each claim to its command, transaction and scope; the report is timestamped historical output. The `review_voyage` prompt accepts a boat plus optional wallet (`who`) and deposit (`amountUsd`), guides current-state checks and requires explicit intent before preparing an unsigned plan. All resources are fixed repository files; reading them needs no RPC or private key.

Run `npm run verify:agent` from the root for eight offline synthetic scenarios using the production parser, decision engine and SDK mandate check. It is behavioral verification, not a backtest or proof of profitable trading. SDK/MCP odds now include raw bid/ask strings and probability spread; the bundled captain refuses absent, one-sided, closed, stale or over-five-point-wide quotes. Other MCP captains must apply their own signal policy before proposing a swap.

Pre-checks verify the official deployment, state and swap mandate. Pass `caller` for role, balance and deposit checks; unsigned plans disclose skipped checks in `warnings`. Detected failures return `ok: false` and `problems`. State, prices and liquidity can change after planning, so success cannot be guaranteed. Swaps get a 1% default slippage cap and can carry a self-reported `reason` in calldata.

All tools publish read/write annotations and matching text/`structuredContent` responses. Signed actions reject a mismatched `caller`, simulate each step and return all sent hashes on partial failure. Check pending hashes with `boats_tx_status` before retrying. Without a key, or with `dryRun: true`, no transaction is sent.

Captain setup: `boats_create` → `boats_act stake` → crew `board` → `boats_act sail`. Posting a stake leaves boarding open; sailing requires crew and captain capital. `stake_and_sail` is available once crew has joined.

Judge verification: `npm run verify:proof` at the repository root checks five submitted transactions, decodes the Gemini decision memo, replays the rejected swap historically and verifies the crew payout. No key or write transaction is needed. For a proxy environment use `NODE_USE_ENV_PROXY=1 npm run verify:proof`. See [judge guide](../../docs/judging.md) and [recorded evidence](../../docs/evidence-report.json).

Example session: *"List the boats. On Westerly, check whether I can move $3 into Bitcoin. Then read the Fed odds and, if hike is above 70%, move half to Treasuries."* The agent calls `boats_list`, `boats_check_trade` (which answers with the max-weight rule and the max allowed amount), `boats_odds`, then `boats_act swap`.

It only touches official boats (the deployment's oracle, router and USDC), because the factory is permissionless.
