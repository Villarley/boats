// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Boat} from "./Boat.sol";

/// @title BoatFactory
/// @notice Every boat comes from the same audited code: no custom logic per boat,
///         so code risk is identical and the score only has to measure strategy risk.
contract BoatFactory {
    Boat[] public boats;
    mapping(address => bool) public isBoat;

    event BoatCreated(address indexed boat, address indexed captain, string name);

    function createBoat(Boat.Config calldata c) external returns (Boat boat) {
        boat = new Boat(c);
        boats.push(boat);
        isBoat[address(boat)] = true;
        emit BoatCreated(address(boat), c.captain, c.name);
    }

    function allBoats() external view returns (Boat[] memory) {
        return boats;
    }

    function boatCount() external view returns (uint256) {
        return boats.length;
    }
}
