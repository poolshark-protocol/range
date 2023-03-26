// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./IRangePoolERC1155.sol";

interface IRangePoolStructs {
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
        int128 liquidityDelta;
        uint216 feeGrowthOutside0; // Per unit of liquidity.
        uint216 feeGrowthOutside1;
        uint160 secondsGrowthOutside;
    }

    struct TickMap {
        uint256 blocks;                     /// @dev - sets of words
        mapping(uint256 => uint256) words;  /// @dev - sets to words
        mapping(uint256 => uint256) ticks;  /// @dev - words to ticks
    }

    struct TickParams {
        TickMap tickMap;
        mapping(int24 => Tick) ticks;
    }

    struct Position {
        uint128 liquidity;
        uint128 amount0;
        uint128 amount1;
        uint256 feeGrowthInside0Last;
        uint256 feeGrowthInside1Last;
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
        int24 lower;
        int24 upper;
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

    struct AddParams {
        uint128 amount;
        uint128 liquidity;
        IRangePoolERC1155 tokens;
    }

    struct RemoveParams {
        uint128 amount0;
        uint128 amount1;
        IRangePoolERC1155 tokens;
    }

    struct UpdateParams {
        address owner;
        int24 lower;
        int24 upper;
        uint128 amount;
        bool fungible;
        IRangePoolERC1155 tokens; /// @dev - totalSupply of the position token if fungible
    }

    struct MintCache {
        PoolState pool;
        MintParams params;
        Position position;
        IRangePoolERC1155 tokens;
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
        uint256 liquidityOnPosition;
        uint256 liquidityAmount;
        uint256 totalSupply;
        uint256 tokenId;
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
