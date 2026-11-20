# Boats design system

Everything the app needs to look and read like Boats. Source of truth for UI decisions.

- **Visual guide (all screens, components, rules):** open `design/boats/brandbook.html` in a browser, or the hosted copy https://claude.ai/artifact/1N4n7Wbwt61Z2gY6zL6eKu (ask Santiago for access).
- **Written guide (Spanish):** https://docs.google.com/document/d/1gMLhGehfZORHoI-xmBCohm_aYQ1ljaEr25-qL0Hrnd4/edit

## Files

| File | Use |
|---|---|
| `boats/tokens.css` | All colors, type, radius and spacing as `--bt-*` variables, light and dark. Import once in `globals.css`. |
| `boats/tailwind-v4.css` / `boats/tailwind.preset.js` | Tailwind mapping (`bg-primary`, `bg-crew`, `text-down`, ...). |
| `boats/copy.en.ts` | Every string and headline. Don't hardcode copy in components. |
| `boats/icons.md` | Which Lucide icon goes where. `lucide-react`, `strokeWidth={1.5}`. |
| `boats/flags.tsx` | `<Flag code="N" />`. Signal flags mark status only. |
| `boats/brandbook.html` | The visual guide. |

## The rules that matter

1. **Worst case before every money button**, in dollars. The lock (until floor, goal or date) is shown before Face ID.
2. **Waterline:** crew money is blue above a navy line, the captain's stake is red below it.
3. **Flags mean what they mean at sea:** P boarding, C trade allowed, N trade blocked, U rough seas, H captain, Q back in port.
4. **No "·" separators.** Metadata is icon + label pairs (13px icon, 4px gap, 12px between pairs).
5. **Shape:** radius 8 chips, 10 icon tiles, 16 cards/buttons/inputs, 28 sheets, pill only for filter chips. Nested shapes are concentric. Border *or* shadow, never both.
6. **Layout:** 20px gutter, one left edge, numbers right-aligned with tabular figures, primary buttons at the bottom (52px, 8px apart), list rows at least 56px.
7. **Type:** Archivo 600 sentence-case titles, Archivo 300 for big numbers, 18px body, IBM Plex Mono for labels and addresses.
8. **Headlines:** sentence case with a period, 8 words max, a number beats an adjective. Banned: unlock, empower, seamless, revolutionize, crypto, DeFi, wallet, gas, APY.

## Scope for Friday

- **Build (real on Arc testnet):** Face ID sign-in, gasless deposit, Explore + boat page with score breakdown, board with review, voyage view with captain's log and arcscan links, back in port + withdraw, scripted AI captain, Gemini odds, captain trade ticket with rule check.
- **Mock (clickable, sample data):** Home totals, filters, alerts, invite family, launch wizard, voice rules.
- **Later (pitch only):** next voyage, card deposits, boarding for someone else, recurring deposits, leaderboard, fee clawback.

## Screens and copy

| Screen | Headline (from `copy.en.ts`) |
|---|---|
| Welcome | Your money, with a captain. |
| Explore | Pick a boat. |
| Board | You put in $1,000 / Worst case, you keep $990 |
| Sailing, blocked trade | The contract said no. |
| Back in port | That's all you lost. |
| Invite | Save Mom a seat. |
| Launch | Set rules your crew can trust. |
