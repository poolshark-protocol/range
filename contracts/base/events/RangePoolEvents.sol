// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

abstract contract RangePoolEvents {
    event Mint(
        address indexed recipient,
        int24 indexed lower,
        int24 indexed upper,
        uint128 liquidityMinted,
        uint128 amount0,
        uint128 amount1
    );

    event MintFungible(
        address indexed token,
        address indexed recipient,
        int24 lower,
        int24 upper,
        uint128 tokenMinted,
        uint128 liquidityMinted,
        uint128 amount0,
        uint128 amount1
    );

    event Burn(
        address owner,
        address indexed recipient,
        int24 indexed lower,
        int24 indexed upper,
        uint128 liquidityBurned,
        uint128 amount0,
        uint128 amount1,
        bool collect
    );

    event BurnFungible(
        address indexed recipient,
        address indexed token,
        uint128 tokenBurned,
        uint128 liquidityBurned,
        uint128 amount0,
        uint128 amount1
    );

    event Compound(
        address indexed owner,
        int24 indexed lower,
        int24 indexed upper,
        uint128 liquidityCompounded,
        uint128 positionAmount0,
        uint128 positionAmount1
    );

    event Swap(
        address indexed recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOut,
        uint160 price,
        uint128 liquidity,
        int24 tickAtPrice
    );
}
