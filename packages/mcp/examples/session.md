# Example agent session (live reads on Arc testnet, unsigned writes)

Real output of the Boats MCP server against the live deployment, captured 2026-11-20. No private key was configured, so write tools return checked, unsigned calls; with `BOATS_PRIVATE_KEY` set, `boats_act` simulates and sends them and returns explorer links.

## Crew agent: is Safe Harbor safe enough for $5?

```
boats_score {"boat":"0x89376Bb6bE0824A4bCD832C86C8Fac483B6Eb978"}
```

```json
{
  "boat": "Safe Harbor",
  "seaworthiness": 83,
  "outOf": 100,
  "verdict": "Calm waters",
  "factors": [
    {
      "factor": "Captain's stake",
      "points": 30,
      "max": 30,
      "why": "The captain puts in 40% of the boat and loses it first."
    },
    {
      "factor": "Floor tightness",
      "points": 20,
      "max": 20,
      "why": "The voyage ends if the boat falls 10%."
    },
    {
      "factor": "Asset risk",
      "points": 13,
      "max": 20,
      "why": "Riskier assets allowed: cirBTC up to 10%."
    },
    {
      "factor": "Max in one asset",
      "points": 10,
      "max": 10,
      "why": "At most 10% in one risky asset."
    },
    {
      "factor": "Track record",
      "points": 10,
      "max": 20,
      "why": "New captain: neutral until the first voyage ends."
    }
  ],
  "note": "Code risk is the same for every boat (one factory, no custom code), so this scores strategy risk only."
}
```


```
boats_worst_case {"boat":"0x89376Bb6bE0824A4bCD832C86C8Fac483B6Eb978","amountUsd":5}
```

```json
{
  "boat": "Safe Harbor",
  "canBoard": true,
  "depositUsd": 5,
  "stopLossPct": 10,
  "captainStakeUsd": 2,
  "crewDepositsAfterYouUsd": 8,
  "worstCaseLossUsd": 0,
  "worstCaseLossPct": 0,
  "plusExitSlippageUpToPct": 1,
  "explanation": "If the boat falls 10% and the stop loss fires, the captain's $2 stake absorbs losses first, so your target loss is $0 (0%). Selling back to dollars may cost up to 1% more. Not a guarantee: a target max loss."
}
```

## Crew agent tries to board Westerly, which already sailed

```
boats_act {"action":"board","boat":"0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359","amountUsd":5}
```

```json
{
  "ok": false,
  "boat": "Westerly",
  "problems": [
    "board needs the boat to be Open; it is Sailing. Right now crew can't act; captain can swap; anyone can check_voyage."
  ],
  "note": "Nothing was built or sent. Fix the problems above and try again."
}
```

## Captain agent reads the market it trades on

```
boats_odds_contracts {}
```

```json
{
  "event": "FED261211",
  "title": "Fed decision in December?",
  "contracts": [
    {
      "label": "Hike 25bps",
      "probability": 0.91
    },
    {
      "label": "Fed maintains rate",
      "probability": 0.05
    },
    {
      "label": "Hike >25bps",
      "probability": 0.09
    },
    {
      "label": "Cut >25bps",
      "probability": 0.03
    },
    {
      "label": "Cut 25bps",
      "probability": 0.03
    }
  ],
  "note": "Probability is the YES price (mid of best bid and ask when both exist). Pass a label to boats_odds as `match`."
}
```

## Captain agent wants to put $3 into Bitcoin

```
boats_check_trade {"boat":"0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359","from":"USDC","to":"bitcoin","amountUsd":3,"who":"0x6C40b242f6bF39AA488c3fD0bdFC6834A24020dF"}
```

```json
{
  "ok": false,
  "boat": "Westerly",
  "trade": "Move $3 of value from USDC to cirBTC",
  "problems": [
    "Max 20% in cirBTC. This makes it 27%."
  ],
  "brokenRule": "max-weight",
  "weightAfterPct": 27.26,
  "maxAllowedUsd": 2.2,
  "maxAllowedNote": "Largest amount, to the cent, that passes both the balance and the max weight right now.",
  "enforcedBy": "Boat.swap() on chain. This is a dry run of the same rule."
}
```

## It sizes the trade down to what the mandate allows and records why

```
boats_act {"action":"swap","boat":"0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359","from":"USDC","to":"bitcoin","amountUsd":2,"caller":"0x6C40b242f6bF39AA488c3fD0bdFC6834A24020dF","reason":"Hike 25bps at 91%: small Bitcoin hedge inside the 20% cap"}
```

```json
{
  "ok": true,
  "signed": false,
  "boat": "Westerly",
  "summary": "Swap $2 of USDC into cirBTC on Westerly, reverting if it returns less than $1.98 of value (1% slippage cap). Your reason is recorded in the transaction (decodeSwapMemo).",
  "calls": [
    {
      "step": 1,
      "chainId": 5042002,
      "to": "0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359",
      "data": "0xfe029156000000000000…",
      "value": "0"
    }
  ],
  "howToSend": "Send these transactions in order, from the wallet that will act, on Arc testnet (chainId 5042002). Gas is paid in USDC."
}
```

## Anyone can audit what happened on chain

```
boats_activity {"boat":"0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359","limit":2}
```

```json
{
  "events": [
    {
      "what": "captain swapped",
      "kind": "traded",
      "boat": "0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359",
      "block": 73190893,
      "tx": "https://testnet.arcscan.app/tx/0x7fd20ec1dc368c1180c3156638ae4a9914e719722cc10962680879cd477225ea",
      "details": {
        "sold": "USDC",
        "soldAmount": 5.5,
        "bought": "USYC",
        "boughtAmount": 5.232856,
        "boatValueAfterUsd": 10.99
      }
    },
    {
      "what": "voyage started",
      "kind": "sailed",
      "boat": "0xeaA3d4Bc9B2Be8341B76B04d3c2E7ce4B9DdC359",
      "block": 73190767,
      "tx": "https://testnet.arcscan.app/tx/0x62fc5ac78b956aa1748c080ee949ecb815d65d59d4c19bfc093365ca2d0e42d5",
      "details": {
        "startValueUsd": 11
      }
    }
  ],
  "note": "Dollar amounts end in Usd. Swap amounts are in units of the named token (soldAmount of USDC is dollars)."
}
```
