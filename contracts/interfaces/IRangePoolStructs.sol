// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./IRangePoolERC1155.sol";

interface IRangePoolStructs {
    struct PoolState {
        uint8   unlocked;
        uint16  protocolFee;
        int24   tickAtPrice;
        int56   tickSecondsAccum;
        uint160 secondsPerLiquidityAccum;
        uint160 price;               /// @dev Starting price current
        uint128 liquidity;           /// @dev Liquidity currently active
        uint128 liquidityGlobal;     /// @dev Globally deposited liquidity
        uint200 feeGrowthGlobal0;
        uint200 feeGrowthGlobal1;
        SampleState  samples;
        ProtocolFees protocolFees;
    }

    struct SampleState {
        uint16  index;
        uint16  length;
        uint16  lengthNext;
    }

    struct Tick {
        int128  liquidityDelta;
        uint200 feeGrowthOutside0; // Per unit of liquidity.
        uint200 feeGrowthOutside1;
        int56   tickSecondsAccumOutside;
        uint160 secondsPerLiquidityAccumOutside;
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

    struct Sample {
        uint32  blockTimestamp;
        int56   tickSecondsAccum;
        uint160 secondsPerLiquidityAccum;
    }

    struct ProtocolFees {
        uint128 token0;
        uint128 token1;
    }

    struct Immutables {
        address token0;
        address token1;
        uint16 swapFee;
        int24  tickSpacing;
    }

    struct MintParams {
        address to;
        int24 lower;
        int24 upper;
        uint128 amount0;
        uint128 amount1;
    }

    struct BurnParams {
        address to;
        int24 lower;
        int24 upper;
        uint128 amount;
    }

    struct SnapshotParams {
        address owner;
        int24 lower;
        int24 upper;
    }

    struct CompoundParams {
        int24 lower;
        int24 upper;
    }

    struct SwapParams {
        address to;
        address refundTo;
        uint160 priceLimit;
        uint128 amountIn;
        bool zeroForOne;
    }

    struct QuoteParams {
        uint160 priceLimit;
        uint128 amountIn;
        bool zeroForOne;
    }

    struct SampleParams {
        uint16 sampleIndex;
        uint16 sampleLength;
        uint32 time;
        uint32[] secondsAgos;
        int24 tick;
        uint128 liquidity;
    }

    struct AddParams {
        PoolState state;
        MintParams mint;
        uint128 amount;
        uint128 liquidity;
    }

    struct RemoveParams {
        uint128 amount0;
        uint128 amount1;
    }

    struct UpdateParams {
        int24 lower;
        int24 upper;
        uint128 amount;
    }

    struct MintCache {
        PoolState pool;
        Position position;
        Immutables constants;
        uint256 liquidityMinted;
    }

    struct BurnCache {
        PoolState pool;
        Position position;
        Immutables constants;
        uint128 amount0;
        uint128 amount1;
    }

    struct SwapCache {
        Immutables constants;
        PoolState pool;
        uint160 price;
        uint128 liquidity;
        bool    cross;
        int24   crossTick;
        uint160 crossPrice;
        uint16  protocolFee;
        int56   tickSecondsAccum;
        uint160 secondsPerLiquidityAccum;
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

    struct SnapshotCache {
        int24   tick;
        uint160 price;
        uint32  blockTimestamp;
        uint32  secondsOutsideLower;
        uint32  secondsOutsideUpper;
        int56   tickSecondsAccum;
        int56   tickSecondsAccumLower;
        int56   tickSecondsAccumUpper;
        uint128 liquidity;
        uint160 secondsPerLiquidityAccum;
        uint160 secondsPerLiquidityAccumLower;
        uint160 secondsPerLiquidityAccumUpper;
        uint256 userBalance;
        uint256 totalSupply;
        Position position;
        SampleState samples;
    }
}
