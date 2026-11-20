// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20, IPriceOracle, ISwapAdapter, SafeTransfer} from "./interfaces.sol";

/// @title SwapAdapter
/// @notice Swaps at the oracle price minus a small spread, against liquidity we fund.
///         Arc testnet has no real liquidity for these pairs; a real router can replace
///         this adapter because boats only trade through an allowlisted router.
contract SwapAdapter is ISwapAdapter {
    using SafeTransfer for IERC20;

    IPriceOracle public immutable oracle;
    address public owner;
    uint16 public spreadBps;

    event Swapped(address indexed sender, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    error NotOwner();
    error Slippage(uint256 amountOut, uint256 minOut);

    constructor(IPriceOracle _oracle, uint16 _spreadBps) {
        oracle = _oracle;
        owner = msg.sender;
        spreadBps = _spreadBps;
    }

    function quote(address tokenIn, address tokenOut, uint256 amountIn) public view returns (uint256) {
        uint256 valueUsdc = amountIn * oracle.getPrice(tokenIn) / 1e18;
        uint256 out = valueUsdc * 1e18 / oracle.getPrice(tokenOut);
        return out * (10_000 - spreadBps) / 10_000;
    }

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut)
    {
        amountOut = quote(tokenIn, tokenOut, amountIn);
        if (amountOut < minOut) revert Slippage(amountOut, minOut);
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(to, amountOut);
        emit Swapped(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    /// @notice Owner pulls liquidity back out (adapter liquidity is ours, never a boat's).
    function withdrawLiquidity(address token, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
