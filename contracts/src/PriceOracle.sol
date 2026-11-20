// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPriceOracle} from "./interfaces.sol";

/// @title PriceOracle
/// @notice Prices pushed by a trusted updater. Testnet stand-in for a real oracle:
///         rejects stale prices and caps how far one update can move a price.
contract PriceOracle is IPriceOracle {
    address public owner;
    address public immutable usdc;
    uint256 public maxAge;
    uint16 public maxDeviationBps;

    mapping(address => uint256) public price;
    mapping(address => uint256) public updatedAt;

    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);

    error NotOwner();
    error StalePrice(address token);
    error NoPrice(address token);
    error DeviationTooLarge(address token, uint256 oldPrice, uint256 newPrice);

    constructor(address _usdc, uint256 _maxAge, uint16 _maxDeviationBps) {
        owner = msg.sender;
        usdc = _usdc;
        maxAge = _maxAge;
        maxDeviationBps = _maxDeviationBps;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setPrice(address token, uint256 newPrice) public onlyOwner {
        uint256 old = price[token];
        if (old != 0) {
            uint256 diff = newPrice > old ? newPrice - old : old - newPrice;
            if (diff * 10_000 > old * maxDeviationBps) revert DeviationTooLarge(token, old, newPrice);
        }
        price[token] = newPrice;
        updatedAt[token] = block.timestamp;
        emit PriceUpdated(token, newPrice, block.timestamp);
    }

    function setPrices(address[] calldata tokens, uint256[] calldata prices) external onlyOwner {
        for (uint256 i; i < tokens.length; ++i) setPrice(tokens[i], prices[i]);
    }

    function setParams(uint256 _maxAge, uint16 _maxDeviationBps) external onlyOwner {
        maxAge = _maxAge;
        maxDeviationBps = _maxDeviationBps;
    }

    function getPrice(address token) external view returns (uint256) {
        if (token == usdc) return 1e18;
        uint256 p = price[token];
        if (p == 0) revert NoPrice(token);
        if (block.timestamp - updatedAt[token] > maxAge) revert StalePrice(token);
        return p;
    }
}
