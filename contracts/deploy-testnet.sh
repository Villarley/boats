#!/usr/bin/env bash
# One command to put Boats on Arc testnet and point the app at it.
#
#   cp .env.example .env   # fill DEPLOYER_KEY, CAPTAIN_PRIVATE_KEY, CREW_PRIVATE_KEY, CAPTAIN_HUMAN
#   ./deploy-testnet.sh
#
# Needs testnet USDC (gas + stakes) on the deployer, AI captain and crew wallets: https://faucet.circle.com
# Writes app/src/config/arc-deployment.json, then seeds Westerly (AI captain staked, crew boarded, sailing).
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

: "${DEPLOYER_KEY:?set DEPLOYER_KEY in contracts/.env}"
: "${CAPTAIN_PRIVATE_KEY:?set CAPTAIN_PRIVATE_KEY (AI captain) in contracts/.env}"
: "${CREW_PRIVATE_KEY:?set CREW_PRIVATE_KEY (seed crew) in contracts/.env}"
RPC="${ARC_RPC:-https://rpc.testnet.arc.io}"

# Circle's tokens on Arc testnet (docs.arc.io/arc/references/contract-addresses).
export USDC="${USDC:-0x3600000000000000000000000000000000000000}"
# EURC is real only if you set USE_REAL_EURC=1 and the deployer holds EURC for adapter liquidity.
if [ "${USE_REAL_EURC:-0}" = "1" ]; then export EURC="0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"; fi
export CAPTAIN="$(cast wallet address --private-key "$CAPTAIN_PRIVATE_KEY")"
export CAPTAIN_HUMAN="${CAPTAIN_HUMAN:-$CAPTAIN}"

echo "Deploying to $RPC (AI captain $CAPTAIN, human captain $CAPTAIN_HUMAN)"
START_BLOCK="$(cast block-number --rpc-url "$RPC")"
LOG="$(mktemp)"
forge script script/Deploy.s.sol --rpc-url "$RPC" --broadcast --private-key "$DEPLOYER_KEY" | tee "$LOG"

get() { grep -E "^\s*$1 " "$LOG" | awk '{print $2}' | tail -1; }
MOCKS='"USYC","cirBTC"'; [ "${USE_REAL_EURC:-0}" = "1" ] || MOCKS='"USYC","EURC","cirBTC"'
cat > ../app/src/config/arc-deployment.json <<JSON
{
  "chainId": 5042002,
  "factory": "$(get FACTORY)",
  "oracle": "$(get ORACLE)",
  "adapter": "$(get ADAPTER)",
  "tokens": { "USDC": "$(get USDC)", "USYC": "$(get USYC)", "EURC": "$(get EURC)", "cirBTC": "$(get CIRBTC)" },
  "mocks": [$MOCKS],
  "boats": [
    { "name": "Safe Harbor", "address": "$(get BOAT_SAFE_HARBOR)" },
    { "name": "Westerly", "address": "$(get BOAT_WESTERLY)" },
    { "name": "Open Sea", "address": "$(get BOAT_OPEN_SEA)" }
  ],
  "startBlock": $START_BLOCK,
  "demo": { "aiCaptain": "$CAPTAIN" }
}
JSON
echo "Wrote app/src/config/arc-deployment.json"

# Faucet amounts are small: seed with a few dollars unless told otherwise.
export STAKE="${STAKE:-2000000}" CREW_AMOUNT="${CREW_AMOUNT:-8000000}"
BOAT="$(get BOAT_WESTERLY)" forge script script/Seed.s.sol --rpc-url "$RPC" --broadcast
cat ../app/src/config/arc-deployment.json
echo "Done. App: NEXT_PUBLIC_CHAIN=arc npm run build -w app. Captain: copy these addresses into captain/.env."
