// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Boat} from "../src/Boat.sol";
import {BoatFactory} from "../src/BoatFactory.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {MockToken} from "../src/MockToken.sol";
import {IERC20, IPriceOracle, ISwapAdapter} from "../src/interfaces.sol";

/// Deploys a full local stack on Anvil (chain id 31337) and writes `app/src/config/local-deployment.json`.
///
/// forge script script/Local.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
contract Local is Script {
    uint256 constant U = 1e6;

    // Anvil default accounts.
    address constant CAPTAIN = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // account 1 — human captain (Ana)
    address constant AI_CAPTAIN = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // account 4 — AI captain
    address constant PASSENGER = 0x3c44Cddd6a900FA2b585DD299E03D12FA4293Bc6;
    address constant PASSENGER2 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    uint256 constant ANVIL_KEY0 = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    // Storage temps avoid stack-too-deep without via-ir.
    MockToken internal _usdc;
    MockToken internal _usyc;
    MockToken internal _eurc;
    MockToken internal _cirbtc;
    PriceOracle internal _oracle;
    SwapAdapter internal _adapter;
    BoatFactory internal _factory;
    address internal _boat0;
    address internal _boat1;
    address internal _boat2;
    uint256 internal _deployBlock;

    function run() external {
        uint256 deployerKey = vm.envOr("DEPLOYER_KEY", ANVIL_KEY0);

        vm.startBroadcast(deployerKey);

        _usdc = new MockToken("USD Coin (local)", "USDC", 6);
        _usyc = new MockToken("US Yield Coin (mock)", "USYC", 6);
        _eurc = new MockToken("Euro Coin (mock)", "EURC", 6);
        _cirbtc = new MockToken("Circle BTC (mock)", "cirBTC", 8);

        // Long max age for local; same 30% deviation cap as Deploy.s.sol.
        _oracle = new PriceOracle(address(_usdc), 365 days, 3_000);
        _oracle.setPrice(address(_usyc), 1.05e18);
        _oracle.setPrice(address(_eurc), 1.08e18);
        _oracle.setPrice(address(_cirbtc), 90_000 * U * 1e18 / 1e8);

        _adapter = new SwapAdapter(IPriceOracle(address(_oracle)), 10);
        _factory = new BoatFactory();

        // Large adapter liquidity so swaps never run dry.
        _usdc.mint(address(_adapter), 1_000_000_000 * U);
        _usyc.mint(address(_adapter), 1_000_000_000 * U);
        _eurc.mint(address(_adapter), 1_000_000_000 * U);
        _cirbtc.mint(address(_adapter), 10_000e8);

        // Fund demo users: captains, passengers, AI captain.
        _usdc.mint(CAPTAIN, 100_000 * U);
        _usdc.mint(AI_CAPTAIN, 100_000 * U);
        _usdc.mint(PASSENGER, 100_000 * U);
        _usdc.mint(PASSENGER2, 100_000 * U);

        _boat0 = _create("Safe Harbor", CAPTAIN, 6_000, 3_000, 1_000, 1_000, 1_500);
        _boat1 = _create("Westerly", AI_CAPTAIN, 5_000, 4_000, 2_500, 1_500, 2_500);
        _boat2 = _create("Open Sea", CAPTAIN, 4_000, 3_000, 5_000, 2_500, 4_000);

        _deployBlock = block.number;

        vm.stopBroadcast();

        _writeDeployment();

        console2.log("USDC", address(_usdc));
        console2.log("USYC", address(_usyc));
        console2.log("EURC", address(_eurc));
        console2.log("CIRBTC", address(_cirbtc));
        console2.log("ORACLE", address(_oracle));
        console2.log("ADAPTER", address(_adapter));
        console2.log("FACTORY", address(_factory));
        console2.log("BOAT_SAFE_HARBOR", _boat0);
        console2.log("BOAT_WESTERLY", _boat1);
        console2.log("BOAT_OPEN_SEA", _boat2);
        console2.log("Wrote ../app/src/config/local-deployment.json");
    }

    function _create(
        string memory name,
        address captain,
        uint16 wUsyc,
        uint16 wEurc,
        uint16 wBtc,
        uint16 stopLossBps,
        uint16 takeProfitBps
    ) internal returns (address) {
        return address(_factory.createBoat(_cfg(name, captain, wUsyc, wEurc, wBtc, stopLossBps, takeProfitBps)));
    }

    function _tokensJson() internal returns (string memory) {
        string memory tok = "tokens";
        vm.serializeAddress(tok, "USDC", address(_usdc));
        vm.serializeAddress(tok, "USYC", address(_usyc));
        vm.serializeAddress(tok, "EURC", address(_eurc));
        return vm.serializeAddress(tok, "cirBTC", address(_cirbtc));
    }

    function _boatsArrayJson() internal returns (string memory) {
        string memory b0 = "boat0";
        vm.serializeString(b0, "name", "Safe Harbor");
        string memory b0Json = vm.serializeAddress(b0, "address", _boat0);

        string memory b1 = "boat1";
        vm.serializeString(b1, "name", "Westerly");
        string memory b1Json = vm.serializeAddress(b1, "address", _boat1);

        string memory b2 = "boat2";
        vm.serializeString(b2, "name", "Open Sea");
        string memory b2Json = vm.serializeAddress(b2, "address", _boat2);

        return string(abi.encodePacked("[", b0Json, ",", b1Json, ",", b2Json, "]"));
    }

    function _writeDeployment() internal {
        string memory root = "local";
        string memory tokensJson = _tokensJson();
        string memory boatsArr = _boatsArrayJson();

        string[] memory mockSyms = new string[](4);
        mockSyms[0] = "USDC";
        mockSyms[1] = "USYC";
        mockSyms[2] = "EURC";
        mockSyms[3] = "cirBTC";

        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "factory", address(_factory));
        vm.serializeAddress(root, "oracle", address(_oracle));
        vm.serializeAddress(root, "adapter", address(_adapter));
        vm.serializeString(root, "mocks", mockSyms);
        vm.serializeJson(root, string(abi.encodePacked('{"tokens":', tokensJson, "}")));
        vm.serializeJson(root, string(abi.encodePacked('{"boats":', boatsArr, "}")));
        string memory json = vm.serializeUint(root, "deployBlock", _deployBlock);
        vm.writeJson(json, "../app/src/config/local-deployment.json");
    }

    function _cfg(
        string memory name,
        address captain,
        uint16 wUsyc,
        uint16 wEurc,
        uint16 wBtc,
        uint16 stopLossBps,
        uint16 takeProfitBps
    ) internal view returns (Boat.Config memory c) {
        address[] memory assets = new address[](3);
        assets[0] = address(_usyc);
        assets[1] = address(_eurc);
        assets[2] = address(_cirbtc);
        uint16[] memory w = new uint16[](3);
        w[0] = wUsyc;
        w[1] = wEurc;
        w[2] = wBtc;
        c = Boat.Config({
            name: name,
            captain: captain,
            usdc: IERC20(address(_usdc)),
            oracle: IPriceOracle(address(_oracle)),
            router: ISwapAdapter(address(_adapter)),
            assets: assets,
            maxWeightBps: w,
            stopLossBps: stopLossBps,
            takeProfitBps: takeProfitBps,
            endTime: uint64(block.timestamp + 7 days),
            feeBps: 2_000,
            vestingDuration: 3 days,
            inviteOnly: false
        });
    }
}