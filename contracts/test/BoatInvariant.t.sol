// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Boat} from "../src/Boat.sol";
import {BoatFactory} from "../src/BoatFactory.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {MockToken} from "../src/MockToken.sol";
import {IERC20, IPriceOracle, ISwapAdapter} from "../src/interfaces.sol";

/// Handler that drives one Boat through the full voyage lifecycle with bounded random inputs.
contract BoatHandler is Test {
    uint256 constant U = 1e6;

    MockToken public usdc;
    MockToken public usyc;
    MockToken public cirbtc;
    PriceOracle public oracle;
    SwapAdapter public adapter;
    Boat public boat;

    address public captain;
    address[] public actors;

    // Ghost accounting.
    uint256 public ghostTotalDeposited;
    uint256 public ghostTotalWithdrawn;
    uint256 public ghostTotalClaimed;
    uint256 public ghostCaptainUsdcBaseline;
    bool public weightViolation;
    bool public captainBalanceViolation;

    mapping(address => bool) public isActor;

    constructor(
        MockToken _usdc,
        MockToken _usyc,
        MockToken _cirbtc,
        PriceOracle _oracle,
        SwapAdapter _adapter,
        Boat _boat,
        address _captain,
        address[] memory _actors
    ) {
        usdc = _usdc;
        usyc = _usyc;
        cirbtc = _cirbtc;
        oracle = _oracle;
        adapter = _adapter;
        boat = _boat;
        captain = _captain;
        for (uint256 i; i < _actors.length; ++i) {
            actors.push(_actors[i]);
            isActor[_actors[i]] = true;
        }
        ghostCaptainUsdcBaseline = usdc.balanceOf(captain);
    }

    function board(uint256 actorSeed, uint256 amountSeed) external {
        if (boat.state() != Boat.State.Open) return;
        address actor = actors[actorSeed % actors.length];
        uint256 bal = usdc.balanceOf(actor);
        if (bal == 0) return;
        uint256 amount = bound(amountSeed, 1, bal);
        vm.startPrank(actor);
        usdc.approve(address(boat), amount);
        boat.board(amount);
        vm.stopPrank();
        ghostTotalDeposited += amount;
    }

    function stakeCaptain(uint256 amountSeed) external {
        if (boat.state() != Boat.State.Open) return;
        uint256 bal = usdc.balanceOf(captain);
        if (bal == 0) return;
        uint256 amount = bound(amountSeed, 1, bal);
        uint256 beforeBal = usdc.balanceOf(captain);
        vm.startPrank(captain);
        usdc.approve(address(boat), amount);
        boat.stakeCaptain(amount);
        vm.stopPrank();
        ghostTotalDeposited += amount;
        // Stake decreases captain balance; refresh baseline so only claimCaptain may increase it.
        ghostCaptainUsdcBaseline = usdc.balanceOf(captain);
        assertLe(usdc.balanceOf(captain), beforeBal);
    }

    function sail() external {
        if (boat.state() != Boat.State.Open) return;
        if (boat.captainStake() == 0 || boat.crewTotal() == 0) return;
        vm.prank(captain);
        boat.sail();
    }

    function swap(uint256 pairSeed, uint256 amountSeed) external {
        if (boat.state() != Boat.State.Sailing) return;
        address tokenIn;
        address tokenOut;
        uint256 pair = pairSeed % 4;
        if (pair == 0) {
            tokenIn = address(usdc);
            tokenOut = address(usyc);
        } else if (pair == 1) {
            tokenIn = address(usdc);
            tokenOut = address(cirbtc);
        } else if (pair == 2) {
            tokenIn = address(usyc);
            tokenOut = address(usdc);
        } else {
            tokenIn = address(cirbtc);
            tokenOut = address(usdc);
        }
        uint256 bal = IERC20(tokenIn).balanceOf(address(boat));
        if (bal == 0) return;
        uint256 amountIn = bound(amountSeed, 1, bal);

        uint256 captainBefore = usdc.balanceOf(captain);
        vm.prank(captain);
        try boat.swap(tokenIn, tokenOut, amountIn, 0) {
            // (c) tokenOut weight must stay within maxWeightBps after a successful swap
            // (same check as Boat.swap; price drift on other holdings is out of scope).
            if (tokenOut != address(usdc)) {
                uint256 n = boat.nav();
                uint256 w = boat.valueOf(tokenOut);
                uint16 maxW = boat.maxWeightBps(tokenOut);
                if (n > 0 && w * 10_000 > n * maxW) {
                    weightViolation = true;
                }
            }
        } catch (bytes memory reason) {
            // MandateViolation (and others) are expected for oversize swaps.
            reason;
        }
        _checkCaptainBalance(captainBefore);
    }

    function movePrice(uint256 assetSeed, uint256 deltaSeed, bool down) external {
        address token = assetSeed % 2 == 0 ? address(usyc) : address(cirbtc);
        uint256 old = oracle.price(token);
        if (old == 0) return;
        // Stay inside the oracle deviation cap (5000 bps in this fixture).
        uint16 maxDev = oracle.maxDeviationBps();
        uint256 deltaBps = bound(deltaSeed, 0, maxDev);
        uint256 newPrice;
        if (down) {
            newPrice = old - old * deltaBps / 10_000;
        } else {
            newPrice = old + old * deltaBps / 10_000;
        }
        if (newPrice == 0) newPrice = 1;
        vm.prank(oracle.owner());
        try oracle.setPrice(token, newPrice) {} catch {}
    }

    function warpTime(uint256 secsSeed) external {
        uint256 secs = bound(secsSeed, 1, 7 days);
        vm.warp(block.timestamp + secs);
        // Refresh prices so they do not go stale after warps.
        vm.startPrank(oracle.owner());
        try oracle.setPrice(address(usyc), oracle.price(address(usyc))) {} catch {}
        try oracle.setPrice(address(cirbtc), oracle.price(address(cirbtc))) {} catch {}
        vm.stopPrank();
    }

    function checkVoyage() external {
        if (boat.state() != Boat.State.Sailing) return;
        uint256 captainBefore = usdc.balanceOf(captain);
        try boat.checkVoyage() {} catch {}
        _checkCaptainBalance(captainBefore);
    }

    function returnToPort() external {
        if (boat.state() != Boat.State.Returning) return;
        uint256 captainBefore = usdc.balanceOf(captain);
        boat.returnToPort();
        _checkCaptainBalance(captainBefore);
    }

    function withdraw(uint256 actorSeed) external {
        if (boat.state() != Boat.State.Closed) return;
        address actor = actors[actorSeed % actors.length];
        if (boat.crewDeposit(actor) == 0 || boat.crewWithdrawn(actor)) return;
        uint256 captainBefore = usdc.balanceOf(captain);
        vm.prank(actor);
        try boat.withdraw() returns (uint256 amount) {
            ghostTotalWithdrawn += amount;
        } catch {}
        // Crew withdraw must not increase captain balance.
        if (actor != captain) {
            _checkCaptainBalance(captainBefore);
        } else {
            // Captain who also boarded: withdraw can increase their USDC; that is not claimCaptain.
            // Track via ghost; baseline for (b) only cares about claimCaptain path.
            ghostCaptainUsdcBaseline = usdc.balanceOf(captain);
        }
    }

    function claimCaptain() external {
        if (boat.state() != Boat.State.Closed) return;
        vm.prank(captain);
        try boat.claimCaptain() returns (uint256 base, uint256 fee) {
            ghostTotalClaimed += base + fee;
            ghostCaptainUsdcBaseline = usdc.balanceOf(captain);
        } catch {}
    }

    function _checkCaptainBalance(uint256 beforeBal) internal {
        uint256 afterBal = usdc.balanceOf(captain);
        if (afterBal > beforeBal && afterBal > ghostCaptainUsdcBaseline) {
            // Increase without going through claimCaptain.
            captainBalanceViolation = true;
        }
    }
}

contract BoatInvariantTest is StdInvariant, Test {
    uint256 constant U = 1e6;

    MockToken usdc;
    MockToken usyc;
    MockToken cirbtc;
    PriceOracle oracle;
    SwapAdapter adapter;
    BoatFactory factory;
    Boat boat;
    BoatHandler handler;

    address captain = makeAddr("captain");
    address crew1 = makeAddr("crew1");
    address crew2 = makeAddr("crew2");
    address crew3 = makeAddr("crew3");

    function setUp() public {
        vm.warp(1_700_000_000);

        usdc = new MockToken("USD Coin", "USDC", 6);
        usyc = new MockToken("US Yield Coin", "USYC", 6);
        cirbtc = new MockToken("Circle BTC (mock)", "cirBTC", 8);

        oracle = new PriceOracle(address(usdc), 1 days, 5_000);
        oracle.setPrice(address(usyc), 1e18);
        oracle.setPrice(address(cirbtc), 90_000 * U * 1e18 / 1e8);

        adapter = new SwapAdapter(IPriceOracle(address(oracle)), 10);
        usdc.mint(address(adapter), 10_000_000 * U);
        usyc.mint(address(adapter), 10_000_000 * U);
        cirbtc.mint(address(adapter), 1_000e8);

        factory = new BoatFactory();

        address[] memory assets = new address[](2);
        assets[0] = address(usyc);
        assets[1] = address(cirbtc);
        uint16[] memory w = new uint16[](2);
        w[0] = 6_000;
        w[1] = 4_000;
        boat = factory.createBoat(
            Boat.Config({
                name: "Invariant Harbor",
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
                vestingDuration: 0,
                inviteOnly: false
            })
        );

        usdc.mint(captain, 100_000 * U);
        usdc.mint(crew1, 100_000 * U);
        usdc.mint(crew2, 100_000 * U);
        usdc.mint(crew3, 100_000 * U);

        address[] memory actors = new address[](3);
        actors[0] = crew1;
        actors[1] = crew2;
        actors[2] = crew3;

        handler = new BoatHandler(usdc, usyc, cirbtc, oracle, adapter, boat, captain, actors);

        targetContract(address(handler));
    }

    /// (a) Open: boat USDC + withdrawn + claimed == total deposited.
    ///     Closed: crewPayout + captainBase + captainFee == finalValue.
    function invariant_conservation() public view {
        Boat.State s = boat.state();
        if (s == Boat.State.Open) {
            assertEq(
                usdc.balanceOf(address(boat)) + handler.ghostTotalWithdrawn() + handler.ghostTotalClaimed(),
                handler.ghostTotalDeposited()
            );
        }
        if (s == Boat.State.Closed) {
            assertEq(boat.crewPayout() + boat.captainBase() + boat.captainFee(), boat.finalValue());
        }
    }

    /// (b) Captain USDC never rises except via claimCaptain (tracked in handler).
    function invariant_captainCannotSiphon() public view {
        assertFalse(handler.captainBalanceViolation());
        assertLe(usdc.balanceOf(captain), handler.ghostCaptainUsdcBaseline());
    }

    /// (c) Weight cap after successful swaps.
    function invariant_noWeightViolation() public view {
        assertFalse(handler.weightViolation());
    }

    /// (d) Withdrawals bounded by settlement amounts.
    function invariant_claimsBounded() public view {
        if (boat.state() != Boat.State.Closed) return;
        assertLe(handler.ghostTotalWithdrawn(), boat.crewPayout());
        assertLe(handler.ghostTotalClaimed(), boat.captainBase() + boat.captainFee());
    }

    /// (e) In a loss, crew payout >= min(crewTotal, finalValue).
    function invariant_lossCrewProtected() public view {
        if (boat.state() != Boat.State.Closed) return;
        uint256 c = boat.crewTotal();
        uint256 k = boat.captainStake();
        uint256 v = boat.finalValue();
        if (v >= c + k) return; // profit case
        uint256 minCrew = v < c ? v : c;
        assertGe(boat.crewPayout(), minCrew);
    }
}
