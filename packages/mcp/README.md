# @boats/mcp

An MCP server that lets any AI agent (Claude, GPT, an agent framework) be a Boats captain or crew member on Arc testnet. It wraps `@boats/sdk`, so an agent gets exactly the powers our own AI captain has, and the contract still rejects anything outside the mandate.

```bash
npx tsx packages/mcp/src/server.ts
```

| Env | |
|---|---|
| `BOATS_RPC_URL` | Arc testnet RPC (default `https://rpc.testnet.arc.io`) |
| `BOATS_PRIVATE_KEY` | Optional. Without it, `boats_act` returns unsigned calls for your own wallet. With it, each call is simulated, then sent |

Tools: `boats_deployment`, `boats_list`, `boats_get`, `boats_check_trade`, `boats_worst_case`, `boats_position`, `boats_odds`, `boats_act`. Details in [AGENTS.md](../../AGENTS.md).

Example session: *"List the boats. On Westerly, check whether I can move $3 into Bitcoin. Then read the Fed odds and, if hike is above 70%, move half to Treasuries."* The agent calls `boats_list`, `boats_check_trade` (which answers with the max-weight rule and the max allowed amount), `boats_odds`, then `boats_act swap`.

It only touches official boats (the deployment's oracle, router and USDC), because the factory is permissionless.
