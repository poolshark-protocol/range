// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import "./IRangePoolERC20.sol";

interface IRangePoolStructs {
    //TODO: adjust nearestTick if someone burns all liquidity from current nearestTick
    struct PoolState {
        uint8 unlocked;
        int24  nearestTick;
        uint32 observationIndex;
        uint128 liquidity; /// @dev Liquidity currently active
        uint128 liquidityGlobal; /// @dev Globally deposited liquidity
        uint160 price; /// @dev Starting price current
        uint160 secondsGrowthGlobal; /// @dev Multiplied by 2^128.
        uint216 feeGrowthGlobal0;
        uint216 feeGrowthGlobal1;
        ProtocolFees protocolFees;
    }

    struct Tick {
        int24 previousTick;
        int24 nextTick;
        int128 liquidityDelta;
        uint216 feeGrowthOutside0; // Per unit of liquidity.
        uint216 feeGrowthOutside1;
        uint160 secondsGrowthOutside;
    }

    struct Position {
        uint128 liquidity;
        uint256 feeGrowthInside0Last;
        uint256 feeGrowthInside1Last;
        uint128 amount0;
        uint128 amount1;
    }

    struct Observation {
        uint32 blockTimestamp;
        int56 tickSeconds;
        uint160 secondsPerLiquidityUnit;
    }

    struct ProtocolFees {
        uint128 token0;
        uint128 token1;
    }

    struct MintParams {
        address to;
        int24 lowerOld;
        int24 lower;
        int24 upper;
        int24 upperOld;
        uint128 amount0;
        uint128 amount1;
        bool fungible;
    }

    struct BurnParams {
        address to;
        int24 lower;
        int24 upper;
        uint128 amount;
        bool fungible;
        bool collect;
    }

    struct CompoundParams {
        address owner;
        int24 lower;
        int24 upper;
        bool fungible;
    }

    struct SwapParams {
        address recipient;
        bool zeroForOne;
        uint160 priceLimit;
        uint256 amountIn;
    }

    //TODO: should we have a recipient field here?
    struct AddParams {
        uint128 amount;
        uint128 liquidity;
        uint256 tokenSupply;
        IRangePoolERC20 token;
    }

    struct RemoveParams {
        uint128 amount0;
        uint128 amount1;
        uint256 totalSupply;
        uint256 liquidityAmount;
        IRangePoolERC20 token;
    }

    struct UpdateParams {
        address owner;
        int24 lower;
        int24 upper;
        uint128 amount;
        bool fungible;
        uint256 totalSupply; /// @dev - totalSupply of the position token if fungible
    }

    struct ValidateParams {
        int24 lowerOld;
        int24 lower;
        int24 upper;
        int24 upperOld;
        uint128 amount0;
        uint128 amount1;
        PoolState state;
    }

    struct MintCache {
        PoolState pool;
        MintParams params;
        Position position;
        IRangePoolERC20 positionToken;
    }

    struct SwapCache {
        bool    cross;
        int24   crossTick;
        uint16  swapFee;
        uint16  protocolFee;
        uint256 input;
        uint256 output;
        uint256 amountIn;
    }

    struct PositionCache {
        uint160 priceLower;
        uint160 priceUpper;
    }

    struct UpdatePositionCache {
        Position position;
        uint160 priceLower;
        uint160 priceUpper;
        bool removeLower;
        bool removeUpper;
        int128 amountInDelta;
        int128 amountOutDelta;
    }
}
