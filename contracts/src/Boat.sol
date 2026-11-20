// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20, IPriceOracle, ISwapAdapter, SafeTransfer} from "./interfaces.sol";

/// @title Boat
/// @notice A fund with a fixed voyage. The crew boards at the same price, the captain (human or AI)
///         can only swap inside the mandate, the captain's stake takes the first loss, and the
///         voyage ends at the stop loss, the take profit or the end date. The captain has no
///         function that moves crew money out of the boat.
contract Boat {
    using SafeTransfer for IERC20;

    enum State {
        Open,
        Sailing,
        Returning,
        Closed
    }

    enum EndReason {
        None,
        StopLoss,
        TakeProfit,
        EndDate
    }

    struct Config {
        string name;
        address captain;
        IERC20 usdc;
        IPriceOracle oracle;
        ISwapAdapter router;
        address[] assets; // tradeable assets besides USDC
        uint16[] maxWeightBps; // max share of NAV per asset, same order as `assets`
        uint16 stopLossBps; // e.g. 1000 = voyage ends when NAV falls 10% below start
        uint16 takeProfitBps; // e.g. 1500 = voyage ends when NAV rises 15% above start
        uint64 endTime;
        uint16 feeBps; // captain's share of the crew's profit, e.g. 2000 = 20%
        uint64 vestingDuration; // the fee is released linearly over this time after closing
        bool inviteOnly; // only addresses the captain invited can board
    }

    // ---- immutable mandate ----
    string public name;
    address public immutable captain;
    IERC20 public immutable usdc;
    IPriceOracle public immutable oracle;
    ISwapAdapter public immutable router;
    uint16 public immutable stopLossBps;
    uint16 public immutable takeProfitBps;
    uint64 public immutable endTime;
    uint16 public immutable feeBps;
    uint64 public immutable vestingDuration;
    bool public immutable inviteOnly;
    address[] internal _assets;
    mapping(address => uint16) public maxWeightBps; // 0 = not allowed

    // ---- voyage state ----
    State public state;
    EndReason public endReason;
    uint256 public crewTotal; // C: crew principal
    uint256 public captainStake; // K: first-loss stake
    uint256 public startValue; // C + K at sail time
    mapping(address => uint256) public crewDeposit;
    mapping(address => bool) public crewWithdrawn;
    mapping(address => bool) public invited; // only checked when `inviteOnly`

    // ---- settlement ----
    uint256 public finalValue; // V
    uint256 public crewPayout; // total paid to the crew
    uint256 public captainBase; // captain's share without the fee
    uint256 public captainFee; // performance fee, vested
    uint256 public closedAt;
    bool public captainBaseClaimed;
    uint256 public captainFeeClaimed;

    // ---- events ----
    event CaptainStaked(uint256 amount);
    event Boarded(address indexed crew, uint256 amount);
    event Sailed(uint256 startValue);
    event Traded(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 navAfter);
    event VoyageEnded(EndReason reason, uint256 nav);
    event ReturnedToPort(uint256 finalValue, uint256 crewPayout, uint256 captainBase, uint256 captainFee);
    event CrewWithdrawn(address indexed crew, uint256 amount);
    event CaptainClaimed(uint256 base, uint256 fee);
    event Invited(address indexed who);

    // ---- errors ----
    error NotCaptain();
    error WrongState(State expected, State actual);
    error MandateViolation(string reason);
    error ZeroAmount();
    error BadConfig(string reason);
    error NothingToClaim();
    error NotInvited();

    modifier onlyCaptain() {
        if (msg.sender != captain) revert NotCaptain();
        _;
    }

    modifier inState(State s) {
        if (state != s) revert WrongState(s, state);
        _;
    }

    constructor(Config memory c) {
        if (c.captain == address(0)) revert BadConfig("captain");
        if (c.assets.length != c.maxWeightBps.length) revert BadConfig("weights");
        if (c.stopLossBps == 0 || c.stopLossBps >= 10_000) revert BadConfig("stopLoss");
        if (c.takeProfitBps == 0) revert BadConfig("takeProfit");
        if (c.feeBps > 5_000) revert BadConfig("fee");
        if (c.endTime <= block.timestamp) revert BadConfig("endTime");
        name = c.name;
        captain = c.captain;
        usdc = c.usdc;
        oracle = c.oracle;
        router = c.router;
        stopLossBps = c.stopLossBps;
        takeProfitBps = c.takeProfitBps;
        endTime = c.endTime;
        feeBps = c.feeBps;
        vestingDuration = c.vestingDuration;
        inviteOnly = c.inviteOnly;
        for (uint256 i; i < c.assets.length; ++i) {
            address a = c.assets[i];
            if (a == address(c.usdc) || a == address(0)) revert BadConfig("asset");
            if (c.maxWeightBps[i] == 0 || c.maxWeightBps[i] > 10_000) revert BadConfig("weight");
            if (maxWeightBps[a] != 0) revert BadConfig("duplicate");
            maxWeightBps[a] = c.maxWeightBps[i];
            _assets.push(a);
        }
    }

    // =========================================================== boarding

    /// @notice The captain puts up the first-loss stake. Required before sailing.
    function stakeCaptain(uint256 amount) external onlyCaptain inState(State.Open) {
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        captainStake += amount;
        emit CaptainStaked(amount);
    }

    /// @notice The captain invites crew to an invite-only boat. Only while boarding.
    function invite(address[] calldata who) external onlyCaptain inState(State.Open) {
        for (uint256 i; i < who.length; ++i) {
            invited[who[i]] = true;
            emit Invited(who[i]);
        }
    }

    /// @notice Crew deposits USDC. Everyone boards at the same price (1 share = 1 USDC).
    ///         On an invite-only boat, only invited addresses can board.
    function board(uint256 amount) external inState(State.Open) {
        if (inviteOnly && !invited[msg.sender]) revert NotInvited();
        if (amount == 0) revert ZeroAmount();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        crewDeposit[msg.sender] += amount;
        crewTotal += amount;
        emit Boarded(msg.sender, amount);
    }

    /// @notice Closes boarding and starts the voyage.
    function sail() external onlyCaptain inState(State.Open) {
        if (captainStake == 0) revert MandateViolation("no captain stake");
        if (crewTotal == 0) revert MandateViolation("no crew");
        startValue = crewTotal + captainStake;
        state = State.Sailing;
        emit Sailed(startValue);
    }

    // =========================================================== trading

    /// @notice The captain's only power: swap between allowed assets through the approved router.
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut)
        external
        onlyCaptain
        inState(State.Sailing)
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert ZeroAmount();
        if (tokenIn == tokenOut) revert MandateViolation("same asset");
        if (!isAllowed(tokenIn)) revert MandateViolation("asset not allowed");
        if (!isAllowed(tokenOut)) revert MandateViolation("asset not allowed");

        IERC20(tokenIn).safeApprove(address(router), amountIn);
        amountOut = router.swap(tokenIn, tokenOut, amountIn, minOut, address(this));
        IERC20(tokenIn).safeApprove(address(router), 0);

        uint256 n = nav();
        if (tokenOut != address(usdc)) {
            uint256 w = valueOf(tokenOut);
            if (w * 10_000 > n * maxWeightBps[tokenOut]) revert MandateViolation("max weight exceeded");
        }
        emit Traded(tokenIn, tokenOut, amountIn, amountOut, n);
    }

    // =========================================================== voyage limits

    /// @notice Anyone can call (QuickNode keeper, a crew member, a bot). Ends the voyage when a limit is hit.
    function checkVoyage() external returns (bool ended) {
        if (state != State.Sailing) return false;
        uint256 n = nav();
        EndReason r;
        if (n * 10_000 <= startValue * (10_000 - stopLossBps)) r = EndReason.StopLoss;
        else if (n * 10_000 >= startValue * (10_000 + uint256(takeProfitBps))) r = EndReason.TakeProfit;
        else if (block.timestamp >= endTime) r = EndReason.EndDate;
        else return false;
        state = State.Returning;
        endReason = r;
        emit VoyageEnded(r, n);
        return true;
    }

    /// @notice Anyone can call once the voyage ended: sells every asset to USDC through the router
    ///         (max 1% below oracle value) and settles the first-loss waterfall.
    function returnToPort() external inState(State.Returning) {
        for (uint256 i; i < _assets.length; ++i) {
            address a = _assets[i];
            uint256 bal = IERC20(a).balanceOf(address(this));
            if (bal == 0) continue;
            uint256 minOut = bal * oracle.getPrice(a) / 1e18 * 99 / 100;
            IERC20(a).safeApprove(address(router), bal);
            router.swap(a, address(usdc), bal, minOut, address(this));
            IERC20(a).safeApprove(address(router), 0);
        }
        _settle(usdc.balanceOf(address(this)));
    }

    function _settle(uint256 v) internal {
        (uint256 crew, uint256 capBase, uint256 fee) = waterfall(crewTotal, captainStake, v, feeBps);
        finalValue = v;
        crewPayout = crew;
        captainBase = capBase;
        captainFee = fee;
        closedAt = block.timestamp;
        state = State.Closed;
        emit ReturnedToPort(v, crew, capBase, fee);
    }

    /// @notice First-loss waterfall. Losses hit the captain's stake first; profit is shared
    ///         pro-rata and the captain takes `feeBps` of the crew's profit.
    function waterfall(uint256 c, uint256 k, uint256 v, uint16 fBps)
        public
        pure
        returns (uint256 crew, uint256 capBase, uint256 fee)
    {
        if (v < c + k) {
            crew = v < c ? v : c;
            capBase = v - crew;
        } else {
            uint256 profit = v - c - k;
            uint256 crewProfit = profit * c / (c + k);
            fee = crewProfit * fBps / 10_000;
            crew = c + crewProfit - fee;
            capBase = v - crew - fee;
        }
    }

    // =========================================================== withdrawals

    /// @notice Crew members withdraw their pro-rata share after the boat is back in port.
    function withdraw() external inState(State.Closed) returns (uint256 amount) {
        uint256 d = crewDeposit[msg.sender];
        if (d == 0 || crewWithdrawn[msg.sender]) revert NothingToClaim();
        crewWithdrawn[msg.sender] = true;
        amount = crewPayout * d / crewTotal;
        usdc.safeTransfer(msg.sender, amount);
        emit CrewWithdrawn(msg.sender, amount);
    }

    /// @notice The captain claims what is left of the stake plus the fee released so far.
    function claimCaptain() external onlyCaptain inState(State.Closed) returns (uint256 base, uint256 fee) {
        if (!captainBaseClaimed) {
            captainBaseClaimed = true;
            base = captainBase;
        }
        fee = vestedFee() - captainFeeClaimed;
        captainFeeClaimed += fee;
        if (base + fee == 0) revert NothingToClaim();
        usdc.safeTransfer(msg.sender, base + fee);
        emit CaptainClaimed(base, fee);
    }

    function vestedFee() public view returns (uint256) {
        if (state != State.Closed) return 0;
        if (vestingDuration == 0) return captainFee;
        uint256 elapsed = block.timestamp - closedAt;
        if (elapsed >= vestingDuration) return captainFee;
        return captainFee * elapsed / vestingDuration;
    }

    // =========================================================== views

    function isAllowed(address token) public view returns (bool) {
        return token == address(usdc) || maxWeightBps[token] != 0;
    }

    function assets() external view returns (address[] memory) {
        return _assets;
    }

    function valueOf(address token) public view returns (uint256) {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (token == address(usdc)) return bal;
        if (bal == 0) return 0;
        return bal * oracle.getPrice(token) / 1e18;
    }

    /// @notice Net asset value in USDC base units.
    function nav() public view returns (uint256 n) {
        n = usdc.balanceOf(address(this));
        for (uint256 i; i < _assets.length; ++i) {
            n += valueOf(_assets[i]);
        }
    }

    /// @notice Crew loss in bps if the stop loss is hit exactly, before swap costs. Used for "worst case" copy.
    function worstCaseCrewLossBps() external view returns (uint256) {
        uint256 c = crewTotal;
        uint256 k = captainStake;
        if (c == 0) return 0;
        uint256 v = (c + k) * (10_000 - stopLossBps) / 10_000;
        (uint256 crew,,) = waterfall(c, k, v, feeBps);
        return (c - crew) * 10_000 / c;
    }
}
