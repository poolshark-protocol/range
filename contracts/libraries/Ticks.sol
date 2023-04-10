// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../interfaces/IRangePoolStructs.sol';
import '../interfaces/IRangePoolFactory.sol';
import '../interfaces/IRangePool.sol';
import './DyDxMath.sol';
import './FeeMath.sol';
import './Positions.sol';
import './PrecisionMath.sol';
import './TickMath.sol';
import './TickMap.sol';
import './Samples.sol';
import 'hardhat/console.sol';

/// @notice Tick management library
library Ticks {
    error LiquidityOverflow();
    error LiquidityUnderflow();
    error InvalidLowerTick();
    error InvalidUpperTick();
    error InvalidPositionAmount();
    error InvalidPositionBounds();

    event Swap(
        address indexed recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOut,
        uint160 price,
        uint128 liquidity,
        int24 nearestTick
    );

    uint256 internal constant Q96 = 0x1000000000000000000000000;
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    using Ticks for mapping(int24 => IRangePoolStructs.Tick);

    function initialize(
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state
    ) external returns (
        IRangePoolStructs.PoolState memory
    )    
    {
        TickMap.set(tickMap, TickMath.MIN_TICK);
        TickMap.set(tickMap, TickMath.MAX_TICK);
        return Samples.initialize(
            samples,
            state
        );
    }

    function validate(
        int24 lower,
        int24 upper,
        int24 tickSpacing
    ) public pure {
        if (lower % tickSpacing != 0) revert InvalidLowerTick();
        if (lower <= TickMath.MIN_TICK) revert InvalidLowerTick();
        if (upper % tickSpacing != 0) revert InvalidUpperTick();
        if (upper >= TickMath.MAX_TICK) revert InvalidUpperTick();
        if (lower >= upper) revert InvalidPositionBounds();
    }

    function swap(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.TickMap storage tickMap,
        address recipient,
        bool zeroForOne,
        uint160 priceLimit,
        uint16 swapFee,
        uint256 amountIn,
        IRangePoolStructs.PoolState memory pool
    )
        external returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        IRangePoolStructs.SwapCache memory cache = IRangePoolStructs.SwapCache({
            cross: true,
            tick: TickMath.getTickAtSqrtRatio(pool.price),
            crossTick: zeroForOne ? pool.nearestTick : TickMap.next(tickMap, pool.nearestTick),
            swapFee: swapFee,
            protocolFee: 0,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });
        // grab latest sample and store in cache for _cross
        (
            cache.tickSecondsAccum,
            cache.secondsPerLiquidityAccum
        ) = Samples.getSingle(
            IRangePool(address(this)), 
            IRangePoolStructs.SampleParams(
                pool.samples.index,
                pool.samples.length,
                uint32(block.timestamp),
                new uint32[](2),
                cache.tick,
                pool.liquidity
            ),
            0
        );
        cache.protocolFee = IRangePool(address(this)).owner().protocolFees(address(this));
        while (cache.cross) {
            (pool, cache) = _quoteSingle(zeroForOne, priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _cross(
                    ticks,
                    tickMap,
                    pool,
                    cache,
                    zeroForOne
                );
            }
        }
        (pool, cache) = FeeMath.calculate(pool, cache, zeroForOne);
        /// @dev - write oracle entry after start of block
        (
            pool.samples.index,
            pool.samples.length
        ) = Samples.save(
            samples,
            pool,
            cache.tick
        );
        emit Swap(
            recipient,
            zeroForOne,
            amountIn - cache.input,
            cache.output, /// @dev - subgraph will do math to compute fee amount
            pool.price,
            pool.liquidity,
            pool.nearestTick
        );
        return (pool, cache);
    }

    function quote(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.TickMap storage tickMap,
        bool zeroForOne,
        uint160 priceLimit,
        uint16 swapFee,
        uint256 amountIn,
        IRangePoolStructs.PoolState memory pool
    )
        external view returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        IRangePoolStructs.SwapCache memory cache = IRangePoolStructs.SwapCache({
            cross: true,
            tick: 0,
            crossTick: zeroForOne ? pool.nearestTick : TickMap.next(tickMap, pool.nearestTick),
            swapFee: swapFee,
            protocolFee: 0,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });
        cache.protocolFee = IRangePool(address(this)).owner().protocolFees(address(this));
        while (cache.cross) {
            (pool, cache) = _quoteSingle(zeroForOne, priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _pass(
                    ticks,
                    tickMap,
                    pool,
                    cache,
                    zeroForOne
                );
            }
        }
        (pool, cache) = FeeMath.calculate(pool, cache, zeroForOne);
        return (pool, cache);
    }

    function _quoteSingle(
        bool zeroForOne,
        uint160 priceLimit,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache
    ) internal pure returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
    ) {
        if (zeroForOne ? priceLimit >= pool.price || pool.price == TickMath.MIN_SQRT_RATIO
                       : priceLimit <= pool.price || pool.price == TickMath.MAX_SQRT_RATIO)
        {
            cache.cross = false;
            return (pool, cache);
        }
        uint256 nextTickPrice = TickMath.getSqrtRatioAtTick(cache.crossTick);
        uint256 nextPrice = nextTickPrice;
        if (zeroForOne) {
            // Trading token 0 (x) for token 1 (y).
            // price  is decreasing.
            if (nextPrice < priceLimit) {
                nextPrice = priceLimit;
            }
            uint256 maxDx = DyDxMath.getDx(pool.liquidity, nextPrice, pool.price, true);
            if (cache.input <= maxDx) {
                // We can swap within the current range.
                uint256 liquidityPadded = uint256(pool.liquidity) << 96;
                // calculate price after swap
                uint256 newPrice = PrecisionMath.mulDivRoundingUp(
                    liquidityPadded,
                    pool.price,
                    liquidityPadded + uint256(pool.price) * uint256(cache.input)
                );
                /// @auditor - check tests to see if we need overflow handle
                // if (!(nextTickPrice <= newPrice && newPrice < pool.price)) {
                //     newPrice = uint160(PrecisionMath.divRoundingUp(liquidityPadded, liquidityPadded / pool.price + cache.input));
                //  }
                cache.input = 0;
                cache.output += DyDxMath.getDy(pool.liquidity, newPrice, uint256(pool.price), false);
                cache.cross = false;
                pool.price = uint160(newPrice);
            } else {
                cache.input -= maxDx;
                cache.output += DyDxMath.getDy(pool.liquidity, nextPrice, pool.price, false);
                if (nextPrice == nextTickPrice) { cache.cross = true; }
                else cache.cross = false;
                pool.price = uint160(nextPrice);
            }
        } else {
            // Price is increasing.
            if (nextPrice > priceLimit) {
                nextPrice = priceLimit;
            }
            uint256 maxDy = DyDxMath.getDy(pool.liquidity, uint256(pool.price), nextPrice, true);
            if (cache.input <= maxDy) {
                // We can swap within the current range.
                // Calculate new price after swap: ΔP = Δy/L.
                uint256 newPrice = pool.price +
                    PrecisionMath.mulDiv(cache.input, Q96, pool.liquidity);
                // Calculate output of swap
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, newPrice, false);
                pool.price = uint160(newPrice);
                cache.cross = false;
                cache.input = 0;
            } else {
                // Swap & cross the tick.
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, nextPrice, false);
                pool.price = uint160(nextPrice);
                if (nextPrice == nextTickPrice) { cache.cross = true; }
                else cache.cross = false;
                cache.input -= maxDy;
            }
        }
        return (pool, cache);
    }

    //TODO: set custom metadata for NFT pic

    //maybe call ticks on msg.sender to get tick
    function _cross(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        bool zeroForOne
    ) internal returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory
    ) {
        // observe most recent oracle update

        IRangePoolStructs.Tick memory crossTick = ticks[cache.crossTick];
        crossTick.feeGrowthOutside0       = pool.feeGrowthGlobal0 - crossTick.feeGrowthOutside0;
        crossTick.feeGrowthOutside1       = pool.feeGrowthGlobal1 - crossTick.feeGrowthOutside1;
        crossTick.tickSecondsAccumOutside = cache.tickSecondsAccum - crossTick.tickSecondsAccumOutside;
        crossTick.secondsGrowthOutside    = uint32(block.timestamp) - crossTick.secondsGrowthOutside;
        crossTick.secondsPerLiquidityAccumOutside = cache.secondsPerLiquidityAccum - crossTick.secondsPerLiquidityAccumOutside;
        ticks[cache.crossTick] = crossTick;

        if (zeroForOne) {
            unchecked {
                pool.liquidity -= uint128(ticks[cache.crossTick].liquidityDelta);
            }
            cache.crossTick = TickMap.previous(tickMap, cache.crossTick);
            pool.nearestTick = cache.crossTick;
        } else {
            unchecked {
                pool.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
            }
            pool.nearestTick = cache.crossTick;
            cache.crossTick = TickMap.next(tickMap, cache.crossTick);
        }
        return (pool, cache);
    }

    function _pass(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        bool zeroForOne
    ) internal view returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory
    ) {
        if (zeroForOne) {
            unchecked {
                pool.liquidity -= uint128(ticks[cache.crossTick].liquidityDelta);
            }
            cache.crossTick = TickMap.previous(tickMap, cache.crossTick);
            pool.nearestTick = cache.crossTick;
        } else {
            unchecked {
                pool.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
            }
            pool.nearestTick = cache.crossTick;
            cache.crossTick = TickMap.next(tickMap, cache.crossTick);
        }
        return (pool, cache);
    }

    //TODO: pass in lowerTick and upperTick
    function insert(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState memory state,
        int24 lower,
        int24 upper,
        uint128 amount
    ) external returns (IRangePoolStructs.PoolState memory) {
        //TODO: doesn't check if upper/lowerOld is greater/less than MAX/MIN_TICK
        validate(lower, upper, IRangePool(address(this)).tickSpacing());
        // check for amount to overflow liquidity delta & global
        if (amount > uint128(type(int128).max)) revert LiquidityOverflow();
        if (type(uint128).max - state.liquidityGlobal < amount) revert LiquidityOverflow();

        // get tick at price
        int24 tickAtPrice = TickMath.getTickAtSqrtRatio(state.price);

        // write an oracle entry
        (state.samples.index, state.samples.length) = Samples.save(
            samples,
            state,
            tickAtPrice
        );

        if(TickMap.set(tickMap, lower)) {
            ticks[lower].liquidityDelta += int128(amount);
        } else {
            if (lower <= tickAtPrice) {
                ticks[lower] = IRangePoolStructs.Tick(
                    int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    state.tickSecondsAccum,
                    state.secondsPerLiquidityAccum,
                    state.secondsGrowthGlobal
                );
            } else {
                ticks[lower] = IRangePoolStructs.Tick(
                    int128(amount),
                    0,0,0,0,0
                );
            }
        }

        if(TickMap.set(tickMap, upper)) {
            ticks[upper].liquidityDelta -= int128(amount);
        } else {
            if (upper <= tickAtPrice) {
                ticks[upper] = IRangePoolStructs.Tick(
                    -int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    state.tickSecondsAccum,
                    state.secondsPerLiquidityAccum,
                    state.secondsGrowthGlobal
                );
            } else {
                ticks[upper] = IRangePoolStructs.Tick(
                    -int128(amount),
                    0,0,0,0,0
                );
            }
        }
        state.liquidityGlobal += amount;
        
        if (state.nearestTick < upper && upper <= tickAtPrice) {
            state.nearestTick = upper;
        } else if (state.nearestTick < lower && lower <= tickAtPrice) {
            state.nearestTick = lower;
        }
        return state;
    }

    function remove(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState memory state,
        int24 lower,
        int24 upper,
        uint128 amount
    ) external returns (IRangePoolStructs.PoolState memory) {
        validate(lower, upper, IRangePool(address(this)).tickSpacing());
        //check for amount to overflow liquidity delta & global
        if (amount > uint128(type(int128).max)) revert LiquidityUnderflow();
        if (amount > state.liquidityGlobal) revert LiquidityUnderflow();

        // get tick at price
        int24 tickAtPrice = TickMath.getTickAtSqrtRatio(state.price);

        // write an oracle entry
        (state.samples.index, state.samples.length) = Samples.save(
            samples,
            state,
            tickAtPrice
        );

        if (state.nearestTick >= lower && state.nearestTick < upper) {
            state.liquidity -= amount;
        }
        IRangePoolStructs.Tick storage current = ticks[lower];
        if (lower != TickMath.MIN_TICK && current.liquidityDelta == int128(amount)) {
            if (state.nearestTick == lower) {
                state.nearestTick = TickMap.previous(tickMap, lower);
                if (state.liquidity == 0) {
                    state.price = TickMath.getSqrtRatioAtTick(state.nearestTick);
                }
            }
            TickMap.unset(tickMap, lower);
            delete ticks[lower];
        } else {
            unchecked {
                current.liquidityDelta -= int128(amount);
            }
        }
        current = ticks[upper];

        if (upper != TickMath.MAX_TICK && current.liquidityDelta == -int128(amount)) {
            if (state.nearestTick == upper)
                state.nearestTick = TickMap.previous(tickMap, upper);
            TickMap.unset(tickMap, upper);
            delete ticks[upper];
        } else {
            unchecked {
                current.liquidityDelta += int128(amount);
            }
        }
        state.liquidityGlobal -= amount;

        return state;
    }
}
