// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IPriceOracle {
    /// @notice USDC base units per 1 base unit of `token`, scaled by 1e18.
    function getPrice(address token) external view returns (uint256);
}

interface ISwapAdapter {
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        external
        returns (uint256 amountOut);
}

library SafeTransfer {
    error TransferFailed();

    function safeTransfer(IERC20 t, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(t).call(abi.encodeCall(IERC20.transfer, (to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function safeTransferFrom(IERC20 t, address from, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = address(t).call(abi.encodeCall(IERC20.transferFrom, (from, to, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function safeApprove(IERC20 t, address spender, uint256 amount) internal {
        (bool ok, bytes memory data) = address(t).call(abi.encodeCall(IERC20.approve, (spender, amount)));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}
