// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './TickMath.sol';
import '../interfaces/IRangePoolStructs.sol';
import '../utils/RangePoolErrors.sol';
import './PrecisionMath.sol';
import './DyDxMath.sol';
import 'hardhat/console.sol';

/// @notice Tick management library for ranged llibrary Tilibrary Ticks
library Ticks {
    error NotImplementedYet();
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

    uint256 internal constant Q96 = 0x1000000000000000000000000;
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    using Ticks for mapping(int24 => IRangePoolStructs.Tick);

    function getMaxLiquidity() external pure returns (uint128) {
        return uint128(type(int128).max);
    }

    function initialize(mapping(int24 => IRangePoolStructs.Tick) storage ticks) external {
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

    function quote(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        bool zeroForOne,
        uint160 priceLimit,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache
    )
        external
        view
        returns (IRangePoolStructs.PoolState memory, IRangePoolStructs.SwapCache memory)
    {
        if (zeroForOne ? priceLimit >= pool.price : priceLimit <= pool.price || pool.price == 0)
            return (pool, cache);
        uint256 nextTickPrice = TickMath.getSqrtRatioAtTick(
            zeroForOne ? pool.nearestTick : ticks[pool.nearestTick].nextTick
        );
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
                uint256 liquidityPadded = pool.liquidity << 96;
                // calculate price after swap
                uint256 newPrice = PrecisionMath.mulDivRoundingUp(
                    liquidityPadded,
                    pool.price,
                    liquidityPadded + pool.price * cache.input
                );
                /// @auditor - check tests to see if we need overflow handle
                // if (!(nextTickPrice <= newPrice && newPrice < pool.price)) {
                //     newPrice = uint160(PrecisionMath.divRoundingUp(liquidityPadded, liquidityPadded / pool.price + cache.input));
                // }
                cache.output += DyDxMath.getDy(pool.liquidity, newPrice, pool.price, false);
                pool.price = uint160(newPrice);
                cache.input = 0;
            } else {
                cache.output += DyDxMath.getDy(pool.liquidity, nextPrice, pool.price, false);
                pool.price = uint160(nextPrice);
                cache.input -= maxDx;
            }
        } else {
            // Price is increasing.
            if (nextPrice > priceLimit) {
                nextPrice = priceLimit;
            }
            uint256 maxDy = DyDxMath.getDy(pool.liquidity, pool.price, nextTickPrice, false);
            if (cache.input <= maxDy) {
                // We can swap within the current range.
                // Calculate new price after swap: ΔP = Δy/L.
                uint256 newPrice = pool.price +
                    PrecisionMath.mulDiv(cache.input, Q96, pool.liquidity);
                // Calculate output of swap
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, newPrice, false);
                pool.price = uint160(newPrice);
                cache.input = 0;
            } else {
                // Swap & cross the tick.
                cache.output += DyDxMath.getDx(pool.liquidity, pool.price, nextTickPrice, false);
                pool.price = uint160(nextPrice);
                cache.input -= maxDy;
            }
        }
        return (pool, cache);
    }

    //TODO: set custom metadata for NFT pic

    //maybe call ticks on msg.sender to get tick
    function _cross(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        int24 nextTickToCross,
        uint160 secondsGrowthGlobal,
        uint128 currentLiquidity,
        uint216 feeGrowthGlobalIn,
        uint216 feeGrowthGlobalOut,
        bool zeroForOne
    ) internal returns (uint256, int24) {
        ticks[nextTickToCross].secondsGrowthOutside =
            secondsGrowthGlobal -
            ticks[nextTickToCross].secondsGrowthOutside;

        if (zeroForOne) {
            unchecked {
                currentLiquidity -= uint128(ticks[nextTickToCross].liquidityDelta);
            }
            ticks[nextTickToCross].feeGrowthOutside0 =
                feeGrowthGlobalIn -
                ticks[nextTickToCross].feeGrowthOutside0;
            ticks[nextTickToCross].feeGrowthOutside1 =
                feeGrowthGlobalOut -
                ticks[nextTickToCross].feeGrowthOutside1;
            nextTickToCross = ticks[nextTickToCross].previousTick;
        } else {
            unchecked {
                currentLiquidity += uint128(ticks[nextTickToCross].liquidityDelta);
            }
            ticks[nextTickToCross].feeGrowthOutside1 =
                feeGrowthGlobalIn -
                ticks[nextTickToCross].feeGrowthOutside1;
            ticks[nextTickToCross].feeGrowthOutside0 =
                feeGrowthGlobalOut -
                ticks[nextTickToCross].feeGrowthOutside0;
            nextTickToCross = ticks[nextTickToCross].nextTick;
        }
        return (currentLiquidity, nextTickToCross);
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
            ticks[lower].liquidityDelta -= int128(amount);
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
                    upperOld,
                    oldPrevTick,
                    -int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    state.secondsGrowthGlobal
                );
            } else {
                ticks[upper] = IRangePoolStructs.Tick(
                    upperOld,
                    oldPrevTick,
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
        IRangePoolStructs.Tick storage current = ticks[lower];

        if (lower != TickMath.MIN_TICK && current.liquidityDelta == int128(amount)) {
            // Delete lower tick.
            IRangePoolStructs.Tick storage previous = ticks[current.previousTick];
            IRangePoolStructs.Tick storage next = ticks[current.nextTick];
            //TODO: handle lower and upper being next to each other
            previous.nextTick = current.nextTick;
            next.previousTick = current.previousTick;

            if (state.nearestTick == lower) state.nearestTick = current.previousTick;

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

        if (state.nearestTick == upper) {
            state.nearestTick = current.previousTick;
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
