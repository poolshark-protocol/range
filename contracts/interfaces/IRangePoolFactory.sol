// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import '../utils/RangePoolFactoryAdmin.sol';

abstract contract IRangePoolFactory is RangePoolFactoryAdmin {
    mapping(uint16 => int24) public feeTierTickSpacing;

    mapping(bytes32 => address) public rangePoolMapping;

    event FeeTierEnabled(uint16 swapFee, int24 tickSpacing);

    event RangePoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        address pool
    );

    function createRangePool(
        address fromToken,
        address destToken,
        uint16 fee,
        uint160 startPrice
    ) external virtual returns (address book);

    function getRangePool(
        address fromToken,
        address destToken,
        uint256 fee
    ) external view virtual returns (address);

    function collectRangePool(
        address fromToken,
        address destToken,
        uint256 fee
    ) external virtual;
}
