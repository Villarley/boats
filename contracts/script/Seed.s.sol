// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Boat} from "../src/Boat.sol";
import {IERC20} from "../src/interfaces.sol";

/// Opens a voyage on an EOA-captained boat (the AI captain's Westerly): captain stakes, crew boards, captain sails.
///
/// Env: BOAT, CAPTAIN_PRIVATE_KEY, CREW_PRIVATE_KEY,
///      STAKE (USDC base units, default 1,000 USDC), CREW_AMOUNT (default 9,000 USDC), SAIL (default true)
///
/// forge script script/Seed.s.sol --rpc-url arc_testnet --broadcast
contract Seed is Script {
    function run() external {
        Boat boat = Boat(vm.envAddress("BOAT"));
        uint256 captainKey = vm.envUint("CAPTAIN_PRIVATE_KEY");
        uint256 crewKey = vm.envUint("CREW_PRIVATE_KEY");
        uint256 stake = vm.envOr("STAKE", uint256(1_000e6));
        uint256 crewAmount = vm.envOr("CREW_AMOUNT", uint256(9_000e6));
        bool doSail = vm.envOr("SAIL", true);
        IERC20 usdc = boat.usdc();

        require(vm.addr(captainKey) == boat.captain(), "CAPTAIN_PRIVATE_KEY is not this boat's captain");

        vm.startBroadcast(captainKey);
        usdc.approve(address(boat), stake);
        boat.stakeCaptain(stake);
        vm.stopBroadcast();

        vm.startBroadcast(crewKey);
        usdc.approve(address(boat), crewAmount);
        boat.board(crewAmount);
        vm.stopBroadcast();

        if (doSail) {
            vm.startBroadcast(captainKey);
            boat.sail();
            vm.stopBroadcast();
        }
        console2.log("Boat", address(boat));
        console2.log("State (0 Open, 1 Sailing)", uint256(boat.state()));
        console2.log("Start value", boat.startValue());
    }
}
