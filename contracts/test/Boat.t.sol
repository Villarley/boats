// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Boat} from "../src/Boat.sol";
import {BoatFactory} from "../src/BoatFactory.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {MockToken} from "../src/MockToken.sol";
import {IERC20, IPriceOracle, ISwapAdapter} from "../src/interfaces.sol";

contract BoatTest is Test {
    MockToken usdc;
    MockToken usyc;
    MockToken cirbtc;
    MockToken forbidden;
    PriceOracle oracle;
    SwapAdapter adapter;
    BoatFactory factory;
    Boat boat;

    address captain = makeAddr("captain");
    address grandma = makeAddr("grandma");
    address crew2 = makeAddr("crew2");
    address keeper = makeAddr("keeper");

    uint256 constant U = 1e6; // 1 USDC

    function setUp() public {
        vm.warp(1_700_000_000);
        usdc = new MockToken("USD Coin", "USDC", 6);
        usyc = new MockToken("US Yield Coin", "USYC", 6);
        cirbtc = new MockToken("Circle BTC (mock)", "cirBTC", 8);
        forbidden = new MockToken("Meme", "MEME", 18);

        oracle = new PriceOracle(address(usdc), 1 days, 5_000);
        // price = USDC base units per token base unit * 1e18
        oracle.setPrice(address(usyc), 1e18); // 1 USYC = 1 USDC
        oracle.setPrice(address(cirbtc), 90_000 * U * 1e18 / 1e8); // 1 BTC = 90k USDC
        oracle.setPrice(address(forbidden), 1e18 / 1e12);

        adapter = new SwapAdapter(IPriceOracle(address(oracle)), 0);
        usdc.mint(address(adapter), 1_000_000 * U);
        usyc.mint(address(adapter), 1_000_000 * U);
        cirbtc.mint(address(adapter), 100e8);
        forbidden.mint(address(adapter), 1e30);

        factory = new BoatFactory();
        boat = factory.createBoat(_config(0));

        usdc.mint(captain, 1_000 * U);
        usdc.mint(grandma, 9_000 * U);
        usdc.mint(crew2, 1_000 * U);
    }

    function _config(uint64 vesting) internal view returns (Boat.Config memory c) {
        address[] memory assets = new address[](2);
        assets[0] = address(usyc);
        assets[1] = address(cirbtc);
        uint16[] memory w = new uint16[](2);
        w[0] = 6_000;
        w[1] = 4_000;
        c = Boat.Config({
            name: "Safe Harbor",
            captain: captain,
            usdc: IERC20(address(usdc)),
            oracle: IPriceOracle(address(oracle)),
            router: ISwapAdapter(address(adapter)),
            assets: assets,
            maxWeightBps: w,
            stopLossBps: 1_000,
            takeProfitBps: 1_500,
            endTime: uint64(block.timestamp + 30 days),
            feeBps: 2_000,
            vestingDuration: vesting
        });
    }

    function _sail(Boat b) internal {
        vm.startPrank(captain);
        usdc.approve(address(b), type(uint256).max);
        b.stakeCaptain(1_000 * U);
        vm.stopPrank();
        vm.startPrank(grandma);
        usdc.approve(address(b), type(uint256).max);
        b.board(9_000 * U);
        vm.stopPrank();
        vm.startPrank(crew2);
        usdc.approve(address(b), type(uint256).max);
        b.board(1_000 * U);
        vm.stopPrank();
        vm.prank(captain);
        b.sail();
    }

    // 1. The captain cannot withdraw or transfer crew money.
    function test_CaptainCannotTakeMoney() public {
        _sail(boat);
        vm.startPrank(captain);
        vm.expectRevert(abi.encodeWithSelector(Boat.WrongState.selector, Boat.State.Closed, Boat.State.Sailing));
        boat.withdraw();
        vm.expectRevert(abi.encodeWithSelector(Boat.WrongState.selector, Boat.State.Closed, Boat.State.Sailing));
        boat.claimCaptain();
        vm.stopPrank();
        // A low-level call to a transfer-like selector has no matching function.
        vm.prank(captain);
        (bool ok,) = address(boat).call(abi.encodeWithSignature("transfer(address,uint256)", captain, 1));
        assertFalse(ok);
        assertEq(usdc.balanceOf(address(boat)), 11_000 * U);
    }

    // 2. Swap into an asset not on the list reverts.
    function test_SwapIntoForbiddenAssetReverts() public {
        _sail(boat);
        vm.prank(captain);
        vm.expectRevert(abi.encodeWithSelector(Boat.MandateViolation.selector, "asset not allowed"));
        boat.swap(address(usdc), address(forbidden), 100 * U, 0);
    }

    // 3. Swap past the max weight reverts; inside the limit works.
    function test_MaxWeight() public {
        _sail(boat);
        vm.startPrank(captain);
        vm.expectRevert(abi.encodeWithSelector(Boat.MandateViolation.selector, "max weight exceeded"));
        boat.swap(address(usdc), address(cirbtc), 11_000 * U, 0); // 100% BTC
        boat.swap(address(usdc), address(cirbtc), 4_000 * U, 0); // ~36% BTC: ok
        vm.stopPrank();
        assertGt(cirbtc.balanceOf(address(boat)), 0);
    }

    // 4. Only the captain trades, and only while sailing.
    function test_OnlyCaptainTradesWhileSailing() public {
        vm.prank(captain);
        vm.expectRevert(abi.encodeWithSelector(Boat.WrongState.selector, Boat.State.Sailing, Boat.State.Open));
        boat.swap(address(usdc), address(usyc), 1, 0);
        _sail(boat);
        vm.prank(grandma);
        vm.expectRevert(Boat.NotCaptain.selector);
        boat.swap(address(usdc), address(usyc), 1, 0);
    }

    // 5a. checkVoyage triggers the stop loss when the market falls.
    function test_StopLossThenReturnToPort() public {
        _sail(boat);
        vm.startPrank(captain);
        boat.swap(address(usdc), address(cirbtc), 4_400 * U, 0); // 40% BTC
        boat.swap(address(usdc), address(usyc), 6_500 * U, 0); // ~59% USYC (60% cap)
        vm.stopPrank();
        assertFalse(boat.checkVoyage());

        // BTC falls 25%: NAV -10% -> stop loss.
        oracle.setPrice(address(cirbtc), oracle.price(address(cirbtc)) * 75 / 100);
        vm.prank(keeper);
        assertTrue(boat.checkVoyage());
        assertEq(uint256(boat.state()), uint256(Boat.State.Returning));
        assertEq(uint256(boat.endReason()), uint256(Boat.EndReason.StopLoss));

        vm.prank(keeper);
        boat.returnToPort();
        assertEq(uint256(boat.state()), uint256(Boat.State.Closed));
        // V = 9,900: captain loses the whole stake, crew loses 100 in total (-1%).
        assertApproxEqAbs(boat.finalValue(), 9_900 * U, U / 100); // swap rounding dust
        assertApproxEqAbs(boat.crewPayout(), 9_900 * U, U / 100);
        assertEq(boat.captainBase(), 0);

        vm.prank(grandma);
        uint256 got = boat.withdraw();
        assertApproxEqAbs(got, 8_910 * U, U / 100); // 9,000 -> 8,910: grandma lost 1%
    }

    // 5b. Take profit.
    function test_TakeProfit() public {
        _sail(boat);
        vm.prank(captain);
        boat.swap(address(usdc), address(cirbtc), 4_400 * U, 0);
        oracle.setPrice(address(cirbtc), oracle.price(address(cirbtc)) * 140 / 100); // +16% NAV
        assertTrue(boat.checkVoyage());
        assertEq(uint256(boat.endReason()), uint256(Boat.EndReason.TakeProfit));
    }

    // 5c. End date.
    function test_EndDate() public {
        _sail(boat);
        vm.warp(block.timestamp + 31 days);
        oracle.setPrice(address(usyc), 1e18); // refresh so prices are not stale
        oracle.setPrice(address(cirbtc), oracle.price(address(cirbtc)));
        assertTrue(boat.checkVoyage());
        assertEq(uint256(boat.endReason()), uint256(Boat.EndReason.EndDate));
    }

    // 6. First-loss math: the three scenarios from the plan, exact.
    function test_WaterfallScenarios() public view {
        uint256 c = 10_000 * U;
        uint256 k = 1_000 * U;
        (uint256 crew, uint256 cap, uint256 fee) = boat.waterfall(c, k, 10_340 * U, 2_000);
        assertEq(crew, 10_000 * U);
        assertEq(cap, 340 * U);
        assertEq(fee, 0);

        (crew, cap, fee) = boat.waterfall(c, k, 9_900 * U, 2_000);
        assertEq(crew, 9_900 * U);
        assertEq(cap, 0);
        assertEq(fee, 0);

        (crew, cap, fee) = boat.waterfall(c, k, 12_650 * U, 2_000);
        assertEq(crew, 11_200 * U);
        assertEq(cap, 1_150 * U);
        assertEq(fee, 300 * U);
    }

    function testFuzz_WaterfallConserves(uint96 v) public view {
        (uint256 crew, uint256 cap, uint256 fee) = boat.waterfall(10_000 * U, 1_000 * U, v, 2_000);
        assertEq(crew + cap + fee, v);
    }

    // 7. The fee vests over time and only exists when there is profit.
    function test_FeeVests() public {
        Boat b = factory.createBoat(_config(10 days));
        usdc.mint(captain, 1_000 * U);
        usdc.mint(grandma, 9_000 * U);
        usdc.mint(crew2, 1_000 * U);
        _sail(b);
        vm.prank(captain);
        b.swap(address(usdc), address(cirbtc), 4_400 * U, 0);
        oracle.setPrice(address(cirbtc), oracle.price(address(cirbtc)) * 13_800 / 10_000); // BTC +38% -> NAV ~12,672 (past +15%)
        assertTrue(b.checkVoyage());
        b.returnToPort();
        assertApproxEqAbs(b.captainFee(), 304 * U, U / 100); // 20% of crew profit 1,520

        vm.warp(block.timestamp + 5 days);
        vm.prank(captain);
        (uint256 base, uint256 fee) = b.claimCaptain();
        assertApproxEqAbs(base, 1_152 * U, U / 100); // stake + pro-rata profit
        assertApproxEqAbs(fee, 152 * U, U / 100); // half vested

        vm.warp(block.timestamp + 10 days);
        vm.prank(captain);
        (base, fee) = b.claimCaptain();
        assertEq(base, 0);
        assertApproxEqAbs(fee, 152 * U, U / 100);
    }

    // 8. No boarding after sailing; no sailing without a captain stake.
    function test_BoardingRules() public {
        vm.prank(grandma);
        usdc.approve(address(boat), type(uint256).max);
        vm.prank(grandma);
        boat.board(100 * U);
        vm.prank(captain);
        vm.expectRevert(abi.encodeWithSelector(Boat.MandateViolation.selector, "no captain stake"));
        boat.sail();

        vm.startPrank(captain);
        usdc.approve(address(boat), type(uint256).max);
        boat.stakeCaptain(100 * U);
        boat.sail();
        vm.stopPrank();

        vm.prank(grandma);
        vm.expectRevert(abi.encodeWithSelector(Boat.WrongState.selector, Boat.State.Open, Boat.State.Sailing));
        boat.board(100 * U);
    }

    // 9. Stale oracle price reverts; one update cannot move a price too far.
    function test_OracleGuards() public {
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(abi.encodeWithSelector(PriceOracle.StalePrice.selector, address(cirbtc)));
        oracle.getPrice(address(cirbtc));

        uint256 p = oracle.price(address(usyc));
        vm.expectRevert();
        oracle.setPrice(address(usyc), p * 2); // +100% > 50% cap
    }

    function test_WorstCaseCopy() public {
        _sail(boat);
        // Stop loss -10% on 11,000 with a 1,000 first-loss stake: crew loses 1% (100 bps).
        assertEq(boat.worstCaseCrewLossBps(), 100);
    }
}
