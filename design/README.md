# Boats design system — v9

Source of truth for how the app looks and reads. **Replaces v3** (Archivo, signal flags, red captain stake, "boat/captain/crew" copy).

- **Visual guide:** open `design/boats/brandbook.html` in a browser. Every screen, component and token is there, mobile and web.
- Hosted copy: https://claude.ai/artifact/GfCoZbeUY4YWqSqcmbZdUw (private; ask Matias for access).

## Files

| File | Use |
|---|---|
| `boats/tokens.css` | All colors, type, radius, shadows as `--bt-*`. Light only. Ends with a **legacy aliases** block that maps every v3 name the app uses (`--bt-paper`, `--bt-primary`, `--bt-crew`...) to v9 values. |
| `boats/tailwind-v4.css` | `@theme inline` mapping: `bg-card`, `text-muted`, `bg-signal`, `text-gain`, `bg-navy`, `rounded-card`, `shadow-float`… plus the v3 names so old classes keep compiling. |
| `boats/copy.en.ts` | Every string. Don't hardcode copy in components. |
| `boats/brandbook.html` | The visual guide. |
| `boats/assets/` | `boats-wordmark.svg`, `boats-icon.svg` (both `currentColor`), `icons/helm.svg` (manager mode), `tokens/` (USDC, USYC, EURC, cirBTC logos), `shapes/ribbons.svg`, `shapes/sparkle.svg`. |

Obsolete from v3 (delete): `boats/flags.tsx`, `boats/icons.md`, `boats/tailwind.preset.js`, and `app/src/components/flags.tsx` once nothing imports it.

## Migration order (do these first)

1. `app/src/app/tokens.css` → replace with `design/boats/tokens.css`. In `globals.css`, replace the `@theme inline {…}` block with the contents of `tailwind-v4.css`. Remove `next/font` Archivo / IBM Plex Mono; the font is the system stack.
2. Icons: `npm i @phosphor-icons/react -w app`, remove `lucide-react`. **Fill** weight for objects (house, compass, bell, shield-check, bank, lock), **bold** for glyphs (plus, x, carets, arrows, magnifying-glass). Manager mode = `assets/icons/helm.svg` (ship's wheel, not a steering wheel).
3. Replace `copy.en.ts`. Rename UI words only: boat→fund, captain→manager, crew→investors, board→invest, back in port→fund closed. Routes can stay (`/boat/[address]`) until later.
4. Delete signal flags from the UI. Status = colored dot + word (Open blue, Active green, Closed grey).
5. Rebuild components (below), then screens (below), mobile first, then the ≥1024 layout.

## Principles

1. **White canvas, navy ink, one action color (Signal #2B4FD8).** Primary button, Invest FAB, chart lines, toggles, safety meter, FolderCard, Ticket.
2. **Navy #0B1A30 marks the manager:** avatar, Create FAB, the manager's money in bars, chart value pill. No yellow, orange or bronze anywhere.
3. **No pastel tinted badges.** Values are colored text (gain green, loss red). Badges are neutral grey (`card-2` + ink). A pill that needs color is solid (e.g. green `Minutes`, green `Yes 70%`).
4. **Every screen has its own centerpiece.** Don't repeat one grouped list with icons everywhere. Colored icon tiles live **only** in Profile/settings and the "Your money is safe" sheet.
5. **Decoration rule (Phantom-style):** ribbons and sparkles go only on **light art panels** (`signal-50` bg) with a white floating card on top. Never inside blue blocks, never as a logo, never the logo inline in text.
6. **Plain language.** Investors see people and dollars; managers see tokens. Token logos only in manager mode and the demo USDC balance. Nautical words only in the brand and fund names.
7. **Worst case before every money button**, in dollars.

## Components

| Component | Spec |
|---|---|
| `Button` | Pill. h52 (46 dense, 38 `sm`). `primary` signal/white, `secondary` card-2/ink, `outline` 1.5px card-3 inset. Optional leading icon (Face ID). |
| `TabBar` | Floating pill h64, `rgba(255,255,255,.86)` + blur, `shadow-tabbar`, **no border**, 16px from edges. 3 tabs (icon 21 + label 10.5), active = card-2 pill. Separate round FAB 64px: signal (Invest) / navy (Create). Investor: Home · Explore · Activity. Manager: Dashboard · Trade · Activity. Profile opens from the avatar, not a tab. |
| `FolderCard` | **Home only** (mobile). Folder tabs (34px, r14 top corners; active tab signal, attached) over a signal card r22 (top-left square). Inside: "Hi María, you have", amount 38/700 with cents at 60% opacity, pill `+$0.42 today` (white 18%). Right: mini area chart 138×62 — "Last 7 days" label, white line 2.2px + white 30%→0 fill, dashed baseline = start of week, end dot with halo, axis "Mon / Today". Bottom strip `signal-deep`: shield + "Laura covers the first **$1,000** of losses" + chevron. |
| `CushionCard` | Fund detail. card bg r22. Header "If the fund falls" + "Loss limit −10%". Headline 22/700: "Laura loses **$1,000** (signal) before you lose **$1** (loss)". Bar h34: manager segment (diagonal signal stripes, shield + "Laura's money") ~90% + loss-red end segment. Axis 0% · −5% · −10% closes. |
| `HoldingsBar` | "What it holds": 10px segmented bar (signal / teal / faint) + legend rows with % right. |
| `OddsCard` | "Gemini market" + question 13.5/600 + Yes/No bar: solid green "Yes 70%" / card-3 "30%". |
| `WorstCaseGauge` | Review & web invest panel. "Worst case, if it falls 10%" → **$99.00**. 14px bar: signal fill + striped red end (the −$1). Caption "You keep about $99" / "−$1". |
| `LabelRows` | Apple Pay style, **no icons**: mono 11px caps label (faint) · note (muted) · value right 600. 1px card-2 dividers. |
| `Timeline` | Fund closed. 2px card-3 rail, 10px ring dots colored by event, mono caps timestamp ("NOV 18 · 2:14 PM", "NOW"), title 15.5/600, amount right. Never numbered colored circles. |
| `ArtBanner` | light `signal-50` panel r22–24, `shapes/ribbons.svg` covering it, sparkles, one white floating card (`shadow-float`) with the message, optional tilted chip. Used: Fund closed hero, web promo. |
| `Ticket` | Private invite. Signal gradient (160°, #3A5DEB→#2B4FD8→#2443BF), r24, `shadow-ticket`. Kicker mono caps + Boats icon; fund name 28/700; inviter avatar + "Family manager · not verified"; perforation (dashed line + 22px notches); 3 stats; "4 of 10 spots taken" with 10 segment dots + avatars; stub (navy 22%) "INVITE CODE RJS-4F2K · barcode · EXPIRES 7 days". |
| `WalletStack` | Several invites = Apple Wallet stack: other tickets show only their 44px header (fund name + "From Diego" + avatar, each in an accent color), the active Ticket in front. One invite → just the Ticket. |
| `OrbitBanner` | Web family banner: card bg, text + "Invite family" left; right: two signal-soft ellipse rings, white pot card center ("Family fund $4,800 · 4 of 10 joined"), member avatars on the ring, "+" on the free seat. |
| `PayMethodTiles` | 3 equal tiles (Apple Pay / Debit card / Boats balance), inset 1.5px card-2, selected = 2px signal + check badge. |
| `DestinationCards` | Withdraw: card (VISA mini) "Minutes" solid green / bank "1–2 days" grey badge; selected 2px signal. |
| `ManagerAvatar` | 40px (28 sm). Person = initials on navy. AI = signal + sparkle. Unverified = slate #5E6A7E. Verified = white 17px badge with signal check. Used as the fund avatar everywhere. |
| `SafetyMeter` | 5 bars 4×12, gap 2, signal / card-3 + score 13/600 muted. |
| `FundChart` | Signal line 2.5 + 16%→0 fill, zone above profit target gain 5%, zone below loss limit red hatch, dashed limit lines with white label pills, end dot + navy value pill. Ranges 1H/1D/1W/1M/All. |
| `Sheet` | White r34 inset 8, grabber, title 22/600 + round X. Web: centered dialog 440px. |
| `Seal` | 64px signal circle + white shield-check, 6px signal-50 ring (blocked sheet). |
| Kept from v8 | `AmountInput` + keypad, `SwapBox`, `Segmented`, `Toggle`, `OptionCard`, `LossStack` (manager), `StatusDot`, `TokenIcon/TokenStack`. See brandbook "I" section. |

## Screens (codes match the brandbook)

**Investor** — B1 Home (FolderCard, Invest/Withdraw, promo, Your funds, Recent activity) · B2 Explore · F1 Fund detail (FundChart + CushionCard) · H1 Profile (icon tiles OK here) · F3 Amount (demo: USDC balance) · F4 Review (WorstCaseGauge + LabelRows) · F6 Blocked (Seal + tiles) · G2 Fund closed (ArtBanner "You get back $99.00" + Timeline).

**D · Money in/out (production, not in the hackathon demo)** — D1 Pay with (PayMethodTiles) · D2 Verify it's you (first time only, done by the onramp provider) · D3 Apple Pay system sheet · D4 Withdraw (DestinationCards). Never show "USDC", "KYC" or "wallet". Provider (Circle Arc Onramp Kit / Transak) and countries are still to confirm.

**Become manager** — M1 Choose path · M2 Under review · M3 Profile with Investor/Manager switch.

**Private fund** — P1 Invitations (WalletStack + Ticket) · P2 Private fund · P3 Review (+ "I know Carlos personally") · P4 Joined.

**Manager** — K1 Dashboard · K2 Trade · K3 Create · assets · K4 Create · limits.

**Web ≥1024** — W1 Home: sidebar, original grey balance card with chart, funds table, **OrbitBanner** below it; right column ArtBanner promo + Recent activity. W2 Fund detail: chart + row of CushionCard / HoldingsBar / OddsCard; right panel amount + WorstCaseGauge + LabelRows. W3 blocked as centered dialog.

## Responsive

| Width | Nav | Layout | Actions | Modals |
|---|---|---|---|---|
| < 640 | Floating tab bar + FAB | 1 column, 20px gutter | Sticky pair above tab bar | Bottom sheet |
| 640–1023 | Same, max 420 centered | Column max 600; Explore 2 cols | Sticky pair max 420 | Sheet max 520 |
| ≥ 1024 | Sidebar 240: wordmark, Investor/Manager switch (approved managers only), nav, Invest button, profile card | Grid `1fr 360px`, max 1280 | Right panel | Dialog 440 |

## Product rules that affect UI

- Becoming a manager is not a free switch. Private path: invite link only, no approval, 10 people / $25,000 (proposed). Professional: approval, Explore listing, Verified badge. The switch appears only after a path is active. AI managers are always verified.
- Private funds never show in Explore and always say who manages them and that they're not verified.

## Demo data (label as examples)

Safe Harbor — Laura Méndez (verified), Low risk, safety 90, investors $10,000 + manager $1,000, loss limit −10%, profit target +15%, max 40%, holds Treasuries 40 / Euros 35 / Dollars 25 (USYC/EURC/USDC), fee 20%. Westerly — AI manager, 72. Open Sea — Diego Ruiz (unverified), 48. Rojas Family Fund — Carlos (private), $500 stake, 4/10, $4,800. Invites from Diego (Ruiz Friends Fund) and Ana (Gómez Trip Fund). Gemini rate-cut odds 70%.
