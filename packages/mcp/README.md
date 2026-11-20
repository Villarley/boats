# @boats/mcp

An MCP server that lets any AI agent (Claude, GPT, an agent framework) be a Boats captain or crew member on Arc testnet. It wraps `@boats/sdk`, so an agent gets exactly the powers our own AI captain has, and the contract still rejects anything outside the mandate.

```bash
npx tsx packages/mcp/src/server.ts
```

| Env | |
|---|---|
| `BOATS_RPC_URL` | Arc testnet RPC (default `https://rpc.testnet.arc.io`) |
| `BOATS_PRIVATE_KEY` | Optional. Without it, `boats_act` returns unsigned calls for your own wallet. With it, each call is simulated, then sent |

Tools (14): `boats_deployment`, `boats_list`, `boats_get`, `boats_score`, `boats_worst_case`, `boats_check_trade`, `boats_position`, `boats_my_positions`, `boats_activity`, `boats_odds`, `boats_odds_contracts`, `boats_create`, `boats_act`, `boats_tx_status`. Details and conventions in [AGENTS.md](../../AGENTS.md). A real session: [examples/session.md](examples/session.md).

Safety: every write tool checks that the boat is official, in the right state, that the caller has the right role and, for swaps, that the trade passes the mandate. It answers `ok: false` with `problems` instead of returning a call that would revert. Swaps get a 1% slippage cap by default and can carry the agent's `reason` on chain.

Example session: *"List the boats. On Westerly, check whether I can move $3 into Bitcoin. Then read the Fed odds and, if hike is above 70%, move half to Treasuries."* The agent calls `boats_list`, `boats_check_trade` (which answers with the max-weight rule and the max allowed amount), `boats_odds`, then `boats_act swap`.

It only touches official boats (the deployment's oracle, router and USDC), because the factory is permissionless.
