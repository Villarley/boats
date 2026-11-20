# QuickNode Stream → keeper (unconfigured integration plan)

No deployed Stream or delivery evidence was found during the November 20 verification. Production currently uses the GitHub Actions keeper schedule. This document is a setup recipe, not evidence of an active integration; do not claim the Streams bounty until a real stream delivers authenticated logs and drives a verified keeper run.

If configured, a stream can call the keeper after oracle or trade events. No execution latency is guaranteed.

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
  const ORACLE = "0x712f8c439e455e928b2f84c6f389d77e93c980f0";
  const BOATS = [
    "0xed438b7a67c22aa48d0f32a69584405057535d4d", // Safe Harbor
    "0x6f762e474d9aa387631f2f32013b8bdb6d0a66e5", // Westerly
    "0xb751031f927a1fd9fb9b9eee074894aebcb04439", // Open Sea
  ];
  const PRICE = "0xb556fac599c3c70efb9ab1fa725ecace6c81cc48d1455f886607def065f3e0c0";  // PriceUpdated(address,uint256,uint256)
  const TRADED = "0x825f67dcf8bc9df74117166defc432f4cdf0a331eff757dd049327c83c2e02e1"; // Traded(address,address,uint256,uint256,uint256)
  const logs = (stream.data || []).flat().filter((l) => {
    const a = (l.address || "").toLowerCase();
    return (a === ORACLE && l.topics[0] === PRICE) || (BOATS.includes(a) && l.topics[0] === TRADED);
  });
  return logs.length ? { logs } : null;
}
```

Topic hashes computed with viem `toEventSelector` (same as `cast sig-event`). Addresses are the live Arc testnet deployment.

## Keeper endpoint

`app/api/keeper` checks the secret and reads the stream payload. A `Traded` log means only that boat needs a check; a `PriceUpdated` log (or no payload) means every official boat does. For each boat:

1. If `Sailing`, simulate `checkVoyage()`. If it returns true, send it.
2. If `Returning`, send `returnToPort()`.

Both functions are public, so the keeper key only pays gas: it never touches crew money. The app's "Check now" button calls the same endpoint as a fallback if the stream is late.
