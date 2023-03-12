// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

abstract contract RangePoolFactoryEvents {
    event RangePoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        address pool,
        uint160 startPrice
    );
}