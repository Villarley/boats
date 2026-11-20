# QuickNode Stream → keeper

The stream calls the keeper whenever a price moves or a captain trades, so stop losses and take profits fire within seconds without anyone watching.

## Stream

- **Network:** Arc Testnet
- **Dataset:** `logs`
- **Start:** latest block
- **Destination:** Webhook, `POST https://<app>/api/keeper`, header `x-keeper-secret: <KEEPER_SECRET>`

## Filter (JavaScript filter function)

Keep only the events that can move a boat across a limit. Topic0 values are the keccak of the event signatures:

- `PriceUpdated(address,uint256,uint256)` from `PriceOracle`
- `Traded(address,address,uint256,uint256,uint256)` from each `Boat`

```js
function main(stream) {
  const ORACLE = "<oracle address lowercase>";
  const BOATS = ["<safe harbor>", "<westerly>", "<open sea>"];
  const PRICE = "<keccak256('PriceUpdated(address,uint256,uint256)')>";
  const TRADED = "<keccak256('Traded(address,address,uint256,uint256,uint256)')>";
  const logs = (stream.data || []).flat().filter((l) => {
    const a = (l.address || "").toLowerCase();
    return (a === ORACLE && l.topics[0] === PRICE) || (BOATS.includes(a) && l.topics[0] === TRADED);
  });
  return logs.length ? { boats: BOATS, logs } : null;
}
```

Get the topic hashes with `cast sig-event "PriceUpdated(address,uint256,uint256)"` (and the same for `Traded`).

## Keeper endpoint

`app/api/keeper` checks the secret, then calls `runKeeper(boats, { privateKey: KEEPER_PRIVATE_KEY })` from `@boats/sdk`. For each boat:

1. If `Sailing`, simulate `checkVoyage()`. If it returns true, send it.
2. If `Returning`, send `returnToPort()`.

Both functions are public, so the keeper key only pays gas: it never touches crew money. The app's "Check now" button calls the same endpoint as a fallback if the stream is late.
