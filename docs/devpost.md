# Boats: Devpost submission

Listo para copiar y pegar. Cada bloque de abajo es un campo de Devpost. Vence el viernes 20 de nov a las 12:00 PM CST (meta: 11:00 AM).

## Checklist (solo ustedes)

- [ ] **Verificar el login.** Abran https://boats-liard.vercel.app en el teléfono. Si dice "Continue with Face ID", el texto queda como está. Si dice "Open my account", la Circle client key no está en Vercel: borren las dos frases marcadas con ⚠️ passkey.
- [ ] **QuickNode.** Creen el stream con [docs/quicknode.md](quicknode.md) (unos 15 min) y prueben que `/api/keeper` responde. Si no llegan, borren las frases marcadas con ⚠️ QuickNode, quiten "QuickNode Streams" de Built with y no se inscriban en ese track.
- [ ] **Grabar el video** (guion abajo, máximo 3 min). Subirlo a YouTube como no listado y pegar el link.
- [ ] **Imágenes:** subir las 4 capturas de `docs/screenshots/` y una del diagrama del README.
- [ ] **Equipo:** invitar a los compañeros desde "Manage team" y que cada uno acepte.
- [ ] **Tracks:** DeFi & Onchain Applications, Best use of Arc, Gemini Prediction Markets, QuickNode (solo si el stream funciona).
- [ ] **Links:** "Try it out" con la app y el repo. Confirmar que el repo es público.
- [ ] **Submit antes de las 11 AM CST** y revisar la página publicada desde otra cuenta o en incógnito.

---

## Project name

Boats

## Elevator pitch (max 200 chars)

A fund manager who can't take your money. A human or AI captain trades inside a contract mandate on Arc, puts up a stake that loses first, and can never withdraw.

## Try it out

- https://boats-liard.vercel.app (Arc testnet; $5 of test USDC on first open)
- https://github.com/Villarley/boats

## Built with

arc, usdc, circle-modular-wallets, solidity, foundry, viem, typescript, next.js, gemini-prediction-markets, quicknode-streams ⚠️ QuickNode

## About the project (pegar todo este bloque)

```markdown
## Inspiration
To let someone manage your money today, you hand over custody. A fund manager, the friend who "knows crypto", a trading bot, an AI agent: any of them can take it, take too much risk, or charge fees while they lose.

The mechanism is already failing with AI. In a controlled experiment with real USDC (I-HITL, Cornell Tech and Yale/IC3, Oct 2026), 9 of 10 AI models read the owner's approval code and raised their own spending cap. The damage from intermediaries is already huge: Americans lost $7.2B to crypto investment fraud in 2025 (FBI IC3).

But people don't say "never". Only 7% are comfortable with an AI buying without approval, yet 29% accept automatic actions within their own rules (Riskified, Nov 2026). Boats writes those rules into a contract.

## What it does
A boat is a fund with a fixed voyage. A captain, a person or an AI, trades the crew's money, but:

- **The captain can only swap.** One function, `swap()`, only through an allowlisted router, only into listed assets, only below each asset's max weight. There is no transfer, withdraw or approve. A trade outside the mandate reverts.
- **The captain loses first.** Their stake absorbs losses before the crew's money. Their fee is a share of the crew's profit only.
- **The worst case is known before boarding.** Every voyage ends at a stop loss, a take profit or a date. `checkVoyage()` is public, so anyone can end it when a limit is crossed.

Example: crew $10,000, captain stake $1,000, stop loss at -10%. **The market falls 10%. Grandma loses 1%.**

The crew signs in with Face ID, never sees a seed phrase or gas, and reads the worst case in dollars before boarding. ⚠️ passkey

## Proof on Arc testnet
- The AI captain reads Gemini's "Fed decision in December?" market (hike 25bps at 91%) and moves half the boat into Treasuries: https://testnet.arcscan.app/tx/0x7fd20ec1dc368c1180c3156638ae4a9914e719722cc10962680879cd477225ea
- A rogue captain tries to put everything into Bitcoin. The contract refuses: https://testnet.arcscan.app/tx/0x748ab0dbcdb8f122e27c3dff303eb268950f194111bb804e731ad348ee186ee6
- A full voyage (Trade Winds): Bitcoin rises, anyone calls `checkVoyage()`, the +10% goal is hit, the boat sells back to dollars, and the crew withdraws +9.9% after the captain's fee: https://testnet.arcscan.app/tx/0x87a3d5ffd2b045ba0aa702d64247a4b2716211a98234501e330b811d5f88954e

## How we built it
- **Contracts (Solidity, Foundry):** `Boat`, `BoatFactory`, `PriceOracle`, `SwapAdapter`. 18 tests, including invariants: value is conserved, the captain can't siphon funds, weights hold, the crew is protected in a loss.
- **@boats/sdk (TypeScript, viem):** reads, a mandate pre-check that mirrors the contract, first-loss math (tested to match `Boat.waterfall()`), the seaworthiness score, calldata builders and the keeper.
- **PWA (Next.js):** crew and captain modes in one app. Invisible wallet: a Circle Modular Wallets passkey smart account plus paymaster, so boarding is one sponsored user operation. ⚠️ passkey
- **AI captain:** reads Gemini Prediction Markets odds and acts on plain-words rules ("if Fed hike odds pass 70%, move half to Treasuries"). The odds inform the decision; the contract limits what can execute.
- **Keeper:** a QuickNode Stream on oracle and trade logs calls our webhook, which runs `checkVoyage()` and `returnToPort()`. ⚠️ QuickNode
- **Arc:** USDC is the gas token, so the crew only ever holds dollars. One factory and no custom code per boat, so code risk is equal for every boat and the score measures strategy risk only.
- **CI:** contract, SDK and captain tests plus a full-voyage end-to-end test on an iPhone viewport on every push.

## Challenges we ran into
- **No liquidity on Arc testnet** for these pairs. We built an oracle-priced swap adapter behind an allowlist, so a real DEX router can replace it without changing the boat.
- **Keeping the worst case honest.** Every new crew member dilutes the captain's cushion, so a static "max loss" would lie. The app computes it at review time.
- **A stop loss can't guarantee the exit price.** It guarantees the boat stops taking risk and returns to USDC, with exit slippage capped at 1%. We say "target max loss", never "you can't lose".

## Accomplishments that we're proud of
- A captain, human or AI, who can't take your money, can't break the rules, and loses first, live on Arc.
- A complete voyage on chain: stake, board, sail, trade, take profit, withdraw, captain claim.
- An AI agent whose safety doesn't depend on the model behaving. The limit is in the contract.

## What we learned
Non-custodial vaults already exist for perp traders (Hyperliquid, Drift). What's missing is the consumer version: safe assets, a worst case known up front, and a manager whose own money is on the line first.

## What's next for Boats
- Fee clawback when later voyages lose.
- A captain leaderboard built from on-chain voyage history.
- Decentralized price feeds and a real DEX router, then mainnet.
- Real USYC and cirBTC instead of testnet mocks.

## Honest notes
Testnet prototype. We post the oracle prices ourselves; EURC, USYC and cirBTC are labelled mocks; USDC is Circle's. In production, captains would need to be licensed or boats self-managed.
```

---

## Video script (2:45)

Una pantalla de teléfono (la app) y una pestaña con arcscan. Grabar en inglés, voz en off, sin música alta. Ensayar una vez antes.

| Tiempo | Pantalla | Decir |
|---|---|---|
| 0:00 | Título: "A fund manager who can't take your money." | "Last month, Cornell Tech and Yale gave ten AI models a wallet with real dollars and access to the owner's email. Nine of ten raised their own spending limit. Nobody, human or AI, should hold the keys to your money." |
| 0:20 | App: Welcome → login | "This is Boats. Grandma has never touched crypto. One tap with Face ID. No seed phrase, no gas." |
| 0:35 | Explore: tres boats | "Each boat is a voyage run by a captain. Every card shows a score and the worst case in plain dollars." |
| 0:50 | Safe Harbor → keypad → review | "She boards with a few dollars. Before she confirms, the app tells her the worst that can happen." |
| 1:10 | Westerly: log del capitán IA | "Westerly is run by an AI captain. It reads Gemini's prediction market on the Fed. Hike odds are above 70%, so it moves half the boat to Treasuries." |
| 1:25 | arcscan: tx del swap | "That trade is on Arc. The captain can only call swap." |
| 1:35 | arcscan: tx revertida | "Now a rogue captain tries to put everything into Bitcoin. The contract says no. Max weight exceeded." |
| 1:50 | Trade Winds en la app (voyage terminado) | "This voyage ran start to finish on chain. Bitcoin rose, anyone could call checkVoyage, the goal was hit, and the crew withdrew 9.9% after the captain's fee." |
| 2:10 | Tabla del ejemplo (diapositiva) | "And when it goes wrong, the captain's stake pays first. The market falls 10%. Grandma loses 1%." |
| 2:25 | Diagrama del README | "Contracts plus an SDK on Arc. Our app, the AI captain and the keeper all use it, and anyone can build another captain on top." |
| 2:40 | URL de la app | "Boats. Your money sails. Nobody can take it." |

Si el login con Face ID no funciona en vivo (ver checklist), cambiar 0:20 por: "One tap. No seed phrase, no gas."
