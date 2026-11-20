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
///   CAPTAIN        AI captain address (the captain bot's EOA). Captains Westerly. Required.
///   CAPTAIN_HUMAN  Human captain (Ana's passkey smart account). Captains Safe Harbor and Open Sea.
///                  Defaults to CAPTAIN.
///   ADAPTER_USDC   USDC (base units) the deployer sends to the adapter as liquidity. Default 0.
///
/// forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast --private-key $DEPLOYER_KEY
contract Deploy is Script {
    uint256 constant U = 1e6;

    struct Infra {
        address usdc;
        PriceOracle oracle;
        SwapAdapter adapter;
        address usyc;
        address eurc;
        address cirbtc;
    }

    function run() external {
        address usdc = vm.envAddress("USDC");
        address captain = vm.envAddress("CAPTAIN");
        address human = vm.envOr("CAPTAIN_HUMAN", captain);
        uint256 adapterUsdc = vm.envOr("ADAPTER_USDC", uint256(0));

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

        Infra memory inf = Infra(usdc, oracle, adapter, usyc, eurc, cirbtc);
        // weights: [USYC, EURC, cirBTC] in bps; then stop loss, take profit
        Boat safeHarbor = factory.createBoat(_cfg("Safe Harbor", human, inf, [uint16(7_000), 3_000, 1_000], 1_000, 1_500));
        Boat westerly = factory.createBoat(_cfg("Westerly", captain, inf, [uint16(6_000), 4_000, 2_000], 1_500, 2_000));
        Boat openSea = factory.createBoat(_cfg("Open Sea", human, inf, [uint16(4_000), 3_000, 5_000], 2_500, 4_000));

        // Liquidity: mocks are minted straight into the adapter; real tokens are sent by the deployer.
        _fund(eurc, address(adapter), 1_000_000 * U);
        _fund(usyc, address(adapter), 1_000_000 * U);
        _fund(cirbtc, address(adapter), 20e8);
        if (adapterUsdc > 0) IERC20(usdc).transfer(address(adapter), adapterUsdc);

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
        console2.log("Next: run Seed.s.sol for the AI boat (Westerly) and share these in packages/shared");
    }

    /// Mints if the token is one of our mocks; otherwise transfers from the deployer if it has enough.
    function _fund(address token, address to, uint256 amount) internal {
        (bool ok,) = token.call(abi.encodeWithSignature("mint(address,uint256)", to, amount));
        if (!ok) {
            uint256 bal = IERC20(token).balanceOf(msg.sender);
            if (bal > 0) IERC20(token).transfer(to, bal < amount ? bal : amount);
        }
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

    function _cfg(string memory name, address captain, Infra memory inf, uint16[3] memory w3, uint16 stopLossBps, uint16 takeProfitBps)
        internal
        view
        returns (Boat.Config memory c)
    {
        address[] memory assets = new address[](3);
        assets[0] = inf.usyc;
        assets[1] = inf.eurc;
        assets[2] = inf.cirbtc;
        uint16[] memory w = new uint16[](3);
        w[0] = w3[0];
        w[1] = w3[1];
        w[2] = w3[2];
        c = Boat.Config({
            name: name,
            captain: captain,
            usdc: IERC20(inf.usdc),
            oracle: IPriceOracle(address(inf.oracle)),
            router: ISwapAdapter(address(inf.adapter)),
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
