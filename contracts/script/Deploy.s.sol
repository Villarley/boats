// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Boat} from "../src/Boat.sol";
import {BoatFactory} from "../src/BoatFactory.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {MockToken} from "../src/MockToken.sol";
import {IERC20, IPriceOracle, ISwapAdapter} from "../src/interfaces.sol";

/// Deploys oracle, adapter, factory and the 3 demo boats on Arc testnet.
///
/// Env:
///   USDC     Arc testnet USDC ERC-20 interface address (6 decimals). Required.
///   EURC     Arc testnet EURC address. Optional: a mock is deployed if unset.
///   USYC     Optional, mock if unset (USYC needs an allowlist).
///   CIRBTC   Optional, mock if unset.
///   CAPTAIN  AI captain address (the captain bot's EOA). Required.
///
/// forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_KEY
contract Deploy is Script {
    uint256 constant U = 1e6;

    function run() external {
        address usdc = vm.envAddress("USDC");
        address captain = vm.envAddress("CAPTAIN");

        vm.startBroadcast();

        address eurc = _tokenOrMock("EURC", "Euro Coin (mock)", "EURC", 6);
        address usyc = _tokenOrMock("USYC", "US Yield Coin (mock)", "USYC", 6);
        address cirbtc = _tokenOrMock("CIRBTC", "Circle BTC (mock)", "cirBTC", 8);

        // Prices: USDC base units per token base unit, * 1e18. Max age 1 day, max move 30% per update.
        PriceOracle oracle = new PriceOracle(usdc, 1 days, 3_000);
        oracle.setPrice(usyc, 1.05e18); // USYC ~ 1.05 USDC
        oracle.setPrice(eurc, 1.08e18); // EUR ~ 1.08 USD
        oracle.setPrice(cirbtc, 90_000 * U * 1e18 / 1e8); // BTC ~ 90k

        SwapAdapter adapter = new SwapAdapter(IPriceOracle(address(oracle)), 10); // 0.10% spread
        BoatFactory factory = new BoatFactory();

        Boat safeHarbor = factory.createBoat(_cfg("Safe Harbor", captain, usdc, oracle, adapter, usyc, eurc, cirbtc, 6_000, 3_000, 1_000, 1_000, 1_500));
        Boat westerly = factory.createBoat(_cfg("Westerly", captain, usdc, oracle, adapter, usyc, eurc, cirbtc, 5_000, 4_000, 2_500, 1_500, 2_500));
        Boat openSea = factory.createBoat(_cfg("Open Sea", captain, usdc, oracle, adapter, usyc, eurc, cirbtc, 4_000, 3_000, 5_000, 2_500, 4_000));

        vm.stopBroadcast();

        console2.log("USDC", usdc);
        console2.log("EURC", eurc);
        console2.log("USYC", usyc);
        console2.log("CIRBTC", cirbtc);
        console2.log("ORACLE", address(oracle));
        console2.log("ADAPTER", address(adapter));
        console2.log("FACTORY", address(factory));
        console2.log("BOAT_SAFE_HARBOR", address(safeHarbor));
        console2.log("BOAT_WESTERLY", address(westerly));
        console2.log("BOAT_OPEN_SEA", address(openSea));
        console2.log("Next: fund the adapter with each token and run Seed.s.sol");
    }

    function _tokenOrMock(string memory key, string memory name, string memory symbol, uint8 decimals)
        internal
        returns (address)
    {
        address a = vm.envOr(key, address(0));
        if (a != address(0)) return a;
        MockToken t = new MockToken(name, symbol, decimals);
        return address(t);
    }

    function _cfg(
        string memory name,
        address captain,
        address usdc,
        PriceOracle oracle,
        SwapAdapter adapter,
        address usyc,
        address eurc,
        address cirbtc,
        uint16 wUsyc,
        uint16 wEurc,
        uint16 wBtc,
        uint16 stopLossBps,
        uint16 takeProfitBps
    ) internal view returns (Boat.Config memory c) {
        address[] memory assets = new address[](3);
        assets[0] = usyc;
        assets[1] = eurc;
        assets[2] = cirbtc;
        uint16[] memory w = new uint16[](3);
        w[0] = wUsyc;
        w[1] = wEurc;
        w[2] = wBtc;
        c = Boat.Config({
            name: name,
            captain: captain,
            usdc: IERC20(usdc),
            oracle: IPriceOracle(address(oracle)),
            router: ISwapAdapter(address(adapter)),
            assets: assets,
            maxWeightBps: w,
            stopLossBps: stopLossBps,
            takeProfitBps: takeProfitBps,
            endTime: uint64(block.timestamp + 7 days),
            feeBps: 2_000,
            vestingDuration: 3 days
        });
    }
}
