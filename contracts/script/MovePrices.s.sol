// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PriceOracle} from "../src/PriceOracle.sol";

/// Moves (or refreshes) oracle prices for the demo. Each update is capped by the oracle's max deviation
/// (30% by default), so a bigger move is done in steps.
///
/// Env: ORACLE, TOKENS (comma-separated addresses), CHANGE_BPS (signed, e.g. -2500 for -25%; 0 = refresh only)
///
/// forge script script/MovePrices.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_KEY
contract MovePrices is Script {
    function run() external {
        PriceOracle oracle = PriceOracle(vm.envAddress("ORACLE"));
        address[] memory tokens = vm.envAddress("TOKENS", ",");
        int256 change = vm.envOr("CHANGE_BPS", int256(0));
        uint256 maxStep = oracle.maxDeviationBps();

        vm.startBroadcast();
        for (uint256 i; i < tokens.length; ++i) {
            uint256 p = oracle.price(tokens[i]);
            require(p > 0, "no price");
            uint256 target = uint256(int256(p) * (10_000 + change) / 10_000);
            if (change == 0) {
                oracle.setPrice(tokens[i], p);
                continue;
            }
            while (p != target) {
                uint256 step = p * maxStep / 10_000;
                uint256 next = target > p ? (target - p > step ? p + step : target) : (p - target > step ? p - step : target);
                oracle.setPrice(tokens[i], next);
                p = next;
            }
            console2.log("token", tokens[i]);
            console2.log("new price", p);
        }
        vm.stopBroadcast();
    }
}
