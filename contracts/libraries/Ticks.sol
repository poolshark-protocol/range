// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './TickMath.sol';
import '../interfaces/IRangePoolStructs.sol';
import '../utils/RangePoolErrors.sol';
import './PrecisionMath.sol';
import './DyDxMath.sol';
import './FeeMath.sol';
import './Positions.sol';

/// @notice Tick management library for ranged llibrary Tilibrary Ticks
library Ticks {
    error Debug();
    error LiquidityOverflow();
    error LiquidityUnderflow();
    error InvalidLatestTick();
    error InfiniteTickLoop0(int24);
    error InfiniteTickLoop1(int24);
    error WrongTickOrder();
    error WrongTickLowerRange();
    error WrongTickUpperRange();
    error WrongTickLowerOld();
    error WrongTickUpperOld();
    error NoLiquidityToRollover();
    error AmountInDeltaNeutral();
    error AmountOutDeltaNeutral();

    event Swap(
        address indexed recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOut
    );

    uint256 internal constant Q96 = 0x1000000000000000000000000;
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    using Ticks for mapping(int24 => IRangePoolStructs.Tick);

    function initialize(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks
    ) external {
        ticks[TickMath.MIN_TICK] = IRangePoolStructs.Tick(
            TickMath.MIN_TICK,
            TickMath.MAX_TICK,
            0,
            0,
            0,
            0
        );
        ticks[TickMath.MAX_TICK] = IRangePoolStructs.Tick(
            TickMath.MIN_TICK,
            TickMath.MAX_TICK,
            0,
            0,
            0,
            0
        );
    }

    function swap(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
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
            crossTick: zeroForOne ? pool.nearestTick : ticks[pool.nearestTick].nextTick,
            swapFee: swapFee,
            protocolFee: pool.protocolFee,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickInput: 0,
            feeReturn: PrecisionMath.mulDivRoundingUp(amountIn, swapFee, 1e6)
        });
        // take fee from input amount
        cache.input -= cache.feeReturn;
        while (pool.price != priceLimit && cache.cross) {
            (pool, cache) = _quoteSingle(zeroForOne, priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _cross(
                    ticks,
                    pool,
                    cache,
                    zeroForOne
                );
            }
        }
        if (cache.input > 0) {
                    cache.input += cache.feeReturn;
        }
        emit Swap(recipient, zeroForOne, amountIn - cache.input, cache.output);
        return (pool, cache);
    }

    function quote(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        bool zeroForOne,
        uint160 priceLimit,
        uint16 swapFee,
        uint256 amountIn,
        IRangePoolStructs.PoolState memory pool
    )
        public view returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        IRangePoolStructs.SwapCache memory cache = IRangePoolStructs.SwapCache({
            cross: true,
            crossTick: zeroForOne ? pool.nearestTick : ticks[pool.nearestTick].nextTick,
            swapFee: swapFee,
            protocolFee: pool.protocolFee,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickInput: 0,
            feeReturn: PrecisionMath.mulDivRoundingUp(amountIn, swapFee, 1e6)
        });
        cache.input -= cache.feeReturn;
        while (pool.price != priceLimit && cache.cross) {
            (pool, cache) = _quoteSingle(zeroForOne, priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _pass(
                    ticks,
                    pool,
                    cache,
                    zeroForOne
                );
            }
        }
        if (zeroForOne) {
            if (cache.input > 0) {
                cache.input += cache.feeReturn;
            }
        } else {
            if (cache.input > 0) {
                cache.input += cache.feeReturn;
            }
        }
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
        if (pool.price == 0
            || (zeroForOne ? priceLimit >= pool.price || pool.price == TickMath.MIN_SQRT_RATIO
                           : priceLimit <= pool.price || pool.price == TickMath.MAX_SQRT_RATIO) 
        ) {
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
            uint256 maxDx = DyDxMath.getDx(pool.liquidity, nextPrice, pool.price, false);
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
                //  }23626289714699386012
                cache.tickInput = cache.input;
                cache.input = 0;
                cache.output += DyDxMath.getDy(pool.liquidity, newPrice, uint256(pool.price), false);
                cache.cross = false;
                pool.price = uint160(newPrice);
            } else {
                cache.tickInput = maxDx;
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
            uint256 maxDy = DyDxMath.getDy(pool.liquidity, nextTickPrice, uint256(pool.price), false);
            if (cache.input <= maxDy) {
                // We can swap within the current range.
                // Calculate new price after swap: ΔP = Δy/L.
                uint256 newPrice = pool.price +
                    PrecisionMath.mulDiv(cache.input, Q96, pool.liquidity);
                // Calculate output of swap
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, newPrice, false);
                pool.price = uint160(newPrice);
                cache.cross = false;
                cache.tickInput = cache.input;
                cache.input = 0;
            } else {
                // Swap & cross the tick.
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, nextTickPrice, false);
                pool.price = uint160(nextPrice);
                if (nextPrice == nextTickPrice) { cache.cross = true; }
                else cache.cross = false;
                cache.input -= maxDy;
                cache.tickInput = maxDy;
            }
        }
        (pool, cache) = FeeMath.calculate(pool, cache, zeroForOne);
        return (pool, cache);
    }

    //TODO: set custom metadata for NFT pic

    //maybe call ticks on msg.sender to get tick
    function _cross(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        bool zeroForOne
    ) internal returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory
    ) {
        ticks[cache.crossTick].secondsGrowthOutside =
            pool.secondsGrowthGlobal -
            ticks[cache.crossTick].secondsGrowthOutside;
        ticks[cache.crossTick].feeGrowthOutside0 =
                pool.feeGrowthGlobal0 -
                ticks[cache.crossTick].feeGrowthOutside0;
        ticks[cache.crossTick].feeGrowthOutside1 =
                pool.feeGrowthGlobal1 -
                ticks[cache.crossTick].feeGrowthOutside1;
        if (zeroForOne) {
            unchecked {
                pool.liquidity -= uint128(ticks[cache.crossTick].liquidityDelta);
            }
            cache.crossTick = ticks[cache.crossTick].previousTick;
            pool.nearestTick = cache.crossTick;
        } else {
            unchecked {
                pool.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
            }
            pool.nearestTick = cache.crossTick;
            cache.crossTick = ticks[cache.crossTick].nextTick;
        }
        return (pool, cache);
    }

    function _pass(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
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
            cache.crossTick = ticks[cache.crossTick].previousTick;
            pool.nearestTick = cache.crossTick;
        } else {
            unchecked {
                pool.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
            }
            pool.nearestTick = cache.crossTick;
            cache.crossTick = ticks[cache.crossTick].nextTick;
        }
        return (pool, cache);
    }

    //TODO: pass in lowerTick and upperTick
    function insert(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        int24 lowerOld,
        int24 lower,
        int24 upperOld,
        int24 upper,
        uint128 amount
    ) public returns (IRangePoolStructs.PoolState memory) {
        //TODO: doesn't check if upper/lowerOld is greater/less than MAX/MIN_TICK
        if (lower >= upper || lowerOld >= upperOld) {
            revert WrongTickOrder();
        }
        if (TickMath.MIN_TICK > lower) {
            revert WrongTickLowerRange();
        }
        if (upper > TickMath.MAX_TICK) {
            revert WrongTickUpperRange();
        }
        //check for amount to overflow liquidity delta & global
        if (amount > uint128(type(int128).max)) revert LiquidityOverflow();
        if (type(uint128).max - state.liquidityGlobal < amount) revert LiquidityOverflow();

        if (ticks[lower].previousTick != ticks[lower].nextTick) {
            ticks[lower].liquidityDelta += int128(amount);
        } else {
            int24 oldNextTick = ticks[lowerOld].nextTick;
            if (upper < oldNextTick) {
                oldNextTick = upper;
            }
            /// @dev - don't set previous tick so upper can be initialized
            else {
                ticks[oldNextTick].previousTick = lower;
            }

            if (lowerOld >= lower || lower >= oldNextTick) {
                revert WrongTickLowerOld();
            }
            if (lower <= state.nearestTick) {
                ticks[lower] = IRangePoolStructs.Tick(
                    lowerOld,
                    oldNextTick,
                    int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    state.secondsGrowthGlobal
                );
            } else {
                ticks[lower] = IRangePoolStructs.Tick(
                    lowerOld,
                    oldNextTick,
                    int128(amount),
                    0,
                    0,
                    0
                );
            }
            ticks[lowerOld].nextTick = lower;
        }

        if (ticks[upper].nextTick != ticks[upper].previousTick) {
            ticks[upper].liquidityDelta -= int128(amount);
        } else {
            int24 oldPrevTick = ticks[upperOld].previousTick;
            if (lower > oldPrevTick) oldPrevTick = lower;
            if (
                ticks[upperOld].nextTick == ticks[upperOld].previousTick ||
                upperOld <= upper ||
                upper <= oldPrevTick
            ) {
                revert WrongTickUpperOld();
            }

            if (upper <= state.nearestTick) {
                ticks[upper] = IRangePoolStructs.Tick(
                    oldPrevTick,
                    upperOld,
                    -int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    state.secondsGrowthGlobal
                );
            } else {
                ticks[upper] = IRangePoolStructs.Tick(
                    oldPrevTick,
                    upperOld,
                    -int128(amount),
                    0,
                    0,
                    0
                );
            }
            ticks[oldPrevTick].nextTick = upper;
            ticks[upperOld].previousTick = upper;
        }
        state.liquidityGlobal += amount;
        // get tick at current price
        int24 tickAtPrice = TickMath.getTickAtSqrtRatio(state.price);
        if (state.nearestTick < upper && upper <= tickAtPrice) {
            state.nearestTick = upper;
        } else if (state.nearestTick < lower && lower <= tickAtPrice) {
            state.nearestTick = lower;
        }
        return state;
    }

    function remove(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        int24 lower,
        int24 upper,
        uint128 amount
    ) public returns (IRangePoolStructs.PoolState memory) {
        if (lower >= upper) {
            revert WrongTickOrder();
        }
        if (TickMath.MIN_TICK > lower) {
            revert WrongTickLowerRange();
        }
        if (upper > TickMath.MAX_TICK) {
            revert WrongTickUpperRange();
        }
        //check for amount to overflow liquidity delta & global
        if (amount > state.liquidityGlobal) revert LiquidityUnderflow();
        if (state.nearestTick >= lower && state.nearestTick < upper) {
            state.liquidity -= amount;
        }
        IRangePoolStructs.Tick storage current = ticks[lower];
        if (lower != TickMath.MIN_TICK && current.liquidityDelta == int128(amount)) {
            // Delete lower tick.
            IRangePoolStructs.Tick storage previous = ticks[current.previousTick];
            IRangePoolStructs.Tick storage next = ticks[current.nextTick];
            //TODO: handle lower and upper being next to each other
            previous.nextTick = current.nextTick;
            next.previousTick = current.previousTick;

            if (state.nearestTick == lower) {
                state.nearestTick = current.previousTick;
                if (state.liquidity == 0) {
                    state.price = TickMath.getSqrtRatioAtTick(state.nearestTick);
                }
            } 
            // price; pool liquidity
            delete ticks[lower];
        } else {
            unchecked {
                current.liquidityDelta -= int128(amount);
            }
        }

        current = ticks[upper];

        if (upper != TickMath.MAX_TICK && current.liquidityDelta == -int128(amount)) {
            // Delete upper tick.
            IRangePoolStructs.Tick storage previous = ticks[current.previousTick];
            IRangePoolStructs.Tick storage next = ticks[current.nextTick];

            previous.nextTick = current.nextTick;
            next.previousTick = current.previousTick;

            if (state.nearestTick == upper) state.nearestTick = current.previousTick;

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
