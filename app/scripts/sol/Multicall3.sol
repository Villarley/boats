// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// Minimal Multicall3 (aggregate3 only) for the local chain. Placed at the canonical address with hardhat_setCode.
contract Multicall3 {
    struct Call3 { address target; bool allowFailure; bytes callData; }
    struct Result { bool success; bytes returnData; }

    function aggregate3(Call3[] calldata calls) external payable returns (Result[] memory out) {
        out = new Result[](calls.length);
        for (uint256 i; i < calls.length; i++) {
            (bool ok, bytes memory data) = calls[i].target.call(calls[i].callData);
            require(ok || calls[i].allowFailure, "Multicall3: call failed");
            out[i] = Result(ok, data);
        }
    }
}
