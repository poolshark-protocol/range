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

    event Initialize(
        uint160 startPrice,
        int24 tickAtPrice,
        int24 minTick,
        int24 maxTick
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

    uint256 internal constant Q96 = 0x1000000000000000000000000;
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function initialize(
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state,
        int24 tickSpacing
    ) external returns (
        IRangePoolStructs.PoolState memory
    )    
    {
        int24 minTick = TickMap._round(TickMath.MIN_TICK, tickSpacing);
        int24 maxTick = TickMap._round(TickMath.MAX_TICK, tickSpacing);
        uint160 minPrice = TickMath.getSqrtRatioAtTick(minTick);
        uint160 maxPrice = TickMath.getSqrtRatioAtTick(maxTick);
        if (state.price < minPrice || state.price >= maxPrice)
            require(false, 'StartPriceInvalid()');

        TickMap.init(tickMap, TickMath.MIN_TICK, tickSpacing);
        TickMap.init(tickMap, TickMath.MAX_TICK, tickSpacing);
        state.tickAtPrice = TickMath.getTickAtSqrtRatio(state.price);
        
        emit Initialize(
            state.price,
            state.tickAtPrice,
            minTick,
            maxTick
        );

        return (
            Samples.initialize(samples, state)
        );
    }

    function validate(
        int24 lower,
        int24 upper,
        int24 tickSpacing
    ) internal pure {
        if (lower % tickSpacing != 0) require(false, 'InvalidLowerTick()');
        if (lower <= TickMath.MIN_TICK) require(false, 'InvalidLowerTick()');
        if (upper % tickSpacing != 0) require(false, 'InvalidUpperTick()');
        if (upper >= TickMath.MAX_TICK) require(false, 'InvalidUpperTick()');
        if (lower >= upper) require(false, 'InvalidPositionBounds()');
    }

    function swap(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.SwapParams memory params,
        IRangePoolStructs.SwapCache memory cache,
        IRangePoolStructs.PoolState memory pool
    ) internal returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        cache = IRangePoolStructs.SwapCache({
            constants: cache.constants,
            pool: cache.pool,
            price: pool.price,
            liquidity: pool.liquidity,
            cross: true,
            crossTick: params.zeroForOne ? TickMap.previous(tickMap, pool.tickAtPrice, true) 
                                         : TickMap.next(tickMap, pool.tickAtPrice),
            crossPrice: 0,
            protocolFee: pool.protocolFee,
            input:  0,
            output: 0,
            exactIn: params.exactIn,
            amountLeft: params.amount,
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });
        if (!cache.exactIn) cache.amountLeft = PrecisionMath.mulDivRoundingUp(uint256(params.amount), 1e6, (1e6 - cache.constants.swapFee));
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
                    pool.tickAtPrice,
                    pool.liquidity
                ),
                0
        );
        while (cache.cross) {
            cache.crossPrice = TickMath.getSqrtRatioAtTick(cache.crossTick);
            (pool, cache) = _quoteSingle(params.zeroForOne, params.priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _cross(
                    ticks,
                    tickMap,
                    pool,
                    cache,
                    params.zeroForOne
                );
            }
        }
        /// @dev - write oracle entry after start of block
        (
            pool.samples.index,
            pool.samples.length
        ) = Samples.save(
            samples,
            pool,
            pool.tickAtPrice
        );
        pool.price = cache.price;
        pool.liquidity = cache.liquidity;
        if (cache.price != cache.crossPrice) {
            pool.tickAtPrice = TickMath.getTickAtSqrtRatio(cache.price);
        } else {
            pool.tickAtPrice = cache.crossTick;
        }
        emit Swap(
            params.to,
            params.zeroForOne,
            cache.input,
            cache.output, /// @dev - subgraph will do math to compute fee amount
            pool.price,
            pool.liquidity,
            pool.tickAtPrice
        );
        return (pool, cache);
    }

    function quote(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.QuoteParams memory params,
        IRangePoolStructs.SwapCache memory cache,
        IRangePoolStructs.PoolState memory pool
    ) internal view returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        cache = IRangePoolStructs.SwapCache({
            constants: cache.constants,
            pool: cache.pool,
            price: pool.price,
            liquidity: pool.liquidity,
            cross: true,
            crossTick: params.zeroForOne ? TickMap.previous(tickMap, pool.tickAtPrice, true) 
                                         : TickMap.next(tickMap, pool.tickAtPrice),
            crossPrice: 0,
            protocolFee: pool.protocolFee,
            input:  0,
            output: 0,
            exactIn: params.exactIn,
            amountLeft: params.amount,
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });
        if (!cache.exactIn) cache.amountLeft = PrecisionMath.mulDivRoundingUp(uint256(params.amount), 1e6, uint256(1e6 - cache.constants.swapFee));
        console.log('amount left', cache.amountLeft, params.amount);
        while (cache.cross) {
            cache.crossPrice = TickMath.getSqrtRatioAtTick(cache.crossTick);
            (pool, cache) = _quoteSingle(params.zeroForOne, params.priceLimit, pool, cache);
            if (cache.cross) {
                (pool, cache) = _pass(
                    ticks,
                    tickMap,
                    pool,
                    cache,
                    params.zeroForOne
                );
            }
        }
        pool.price = cache.price;
        return (pool, cache);
    }

    function _quoteSingle(
        bool zeroForOne,
        uint160 priceLimit,
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache
    ) internal view returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory
    ) {
        if ((zeroForOne ? priceLimit >= cache.price
                        : priceLimit <= cache.price) ||
            cache.price == TickMath.MIN_SQRT_RATIO ||
            cache.price == TickMath.MAX_SQRT_RATIO ||
            cache.amountLeft == 0)
        {
            cache.cross = false;
            return (pool, cache);
        }
        uint256 nextPrice = cache.crossPrice;
        uint256 amountOut;
        if (zeroForOne) {
            // Trading token 0 (x) for token 1 (y).
            // price  is decreasing.
            if (nextPrice < priceLimit) {
                nextPrice = priceLimit;
            }
            uint256 amountMax = cache.exactIn ? DyDxMath.getDx(cache.liquidity, nextPrice, cache.price, true)
                                              : DyDxMath.getDy(cache.liquidity, nextPrice, cache.price, false);
            if (cache.amountLeft <= amountMax) {
                // We can swap within the current range.
                uint256 liquidityPadded = uint256(cache.liquidity) << 96;
                // calculate price after swap
                uint256 newPrice;
                if (cache.exactIn) {
                    newPrice = PrecisionMath.mulDivRoundingUp(
                        liquidityPadded,
                        cache.price,
                        liquidityPadded + uint256(cache.price) * uint256(cache.amountLeft)
                    );
                    amountOut = DyDxMath.getDy(cache.liquidity, newPrice, uint256(cache.price), false);
                    cache.input += cache.amountLeft;
                    console.log('new price', newPrice, cache.price, cache.liquidity);
                } else {
                    newPrice = cache.price - 
                        PrecisionMath.divRoundingUp(cache.amountLeft << 96, cache.liquidity);
                    amountOut = cache.amountLeft;
                    cache.input += DyDxMath.getDx(cache.liquidity, newPrice, uint256(cache.price), true);
                    console.log('new price', newPrice, cache.price, cache.liquidity);
                }
                cache.amountLeft = 0;
                cache.cross = false;
                cache.price = uint160(newPrice);
            } else {
                if (cache.exactIn) {
                    amountOut = DyDxMath.getDy(cache.liquidity, nextPrice, cache.price, false);
                    cache.input += amountMax;
                } else {
                    amountOut = amountMax;
                    cache.input += DyDxMath.getDx(cache.liquidity, nextPrice, cache.price, true);
                }
                cache.amountLeft -= amountMax;
                if (nextPrice == cache.crossPrice
                        && nextPrice != cache.price) { cache.cross = true; }
                else cache.cross = false;
                cache.price = uint160(nextPrice);
            }
        } else {
            // Price is increasing.
            if (nextPrice > priceLimit) {
                nextPrice = priceLimit;
            }
            uint256 amountMax = cache.exactIn ? DyDxMath.getDy(cache.liquidity, uint256(cache.price), nextPrice, true)
                                              : DyDxMath.getDx(cache.liquidity, uint256(cache.price), nextPrice, false);
            console.log('amount max', amountMax);
            if (cache.amountLeft <= amountMax) {
                uint256 newPrice;
                if (cache.exactIn) {
                    newPrice = cache.price +
                        PrecisionMath.mulDiv(cache.amountLeft, Q96, cache.liquidity);
                console.log('new price', newPrice, cache.price);
                    // Calculate output of swap
                    amountOut = DyDxMath.getDx(cache.liquidity, cache.price, newPrice, false);
                    cache.input += cache.amountLeft;
                } else {
                    uint256 liquidityPadded = uint256(cache.liquidity) << 96;
                    newPrice = PrecisionMath.mulDivRoundingUp(
                        liquidityPadded, 
                        cache.price,
                        liquidityPadded - uint256(cache.price) * cache.amountLeft
                    );
                    // newPrice = liquidity * cache.price / (liquidity - price * amount)
                    // liquidity - price * amount = liquiidty * cache.price / newPrice
                    // amount = (liquidity - liquidity * cache.price / newPrice) / price
                    console.log('exact out no tick cross', liquidityPadded, cache.price, cache.amountLeft);
                    console.log('new price', newPrice, cache.price);
                    amountOut = cache.amountLeft;
                    cache.input += DyDxMath.getDy(cache.liquidity, cache.price, newPrice, true);
                    // console.log
                }
                cache.amountLeft = 0;
                cache.cross = false;
                cache.price = uint160(newPrice);
            } else {
                // Swap & cross the tick.
                if (cache.exactIn) {
                    amountOut = DyDxMath.getDx(cache.liquidity, cache.price, nextPrice, false);
                    cache.input += amountMax;
                } else {
                    amountOut = amountMax;
                    cache.input += DyDxMath.getDy(cache.liquidity, cache.price, nextPrice, true);
                }
                cache.amountLeft -= amountMax;
                if (nextPrice == cache.crossPrice 
                    && nextPrice != cache.price) { cache.cross = true; }
                else cache.cross = false;
                cache.price = uint160(nextPrice);
            }
        }
        (pool, cache) = FeeMath.calculate(pool, cache, amountOut, zeroForOne);
        return (pool, cache);
    }

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
        IRangePoolStructs.Tick memory crossTick = ticks[cache.crossTick];
        crossTick.feeGrowthOutside0       = pool.feeGrowthGlobal0 - crossTick.feeGrowthOutside0;
        crossTick.feeGrowthOutside1       = pool.feeGrowthGlobal1 - crossTick.feeGrowthOutside1;
        crossTick.tickSecondsAccumOutside = cache.tickSecondsAccum - crossTick.tickSecondsAccumOutside;
        crossTick.secondsPerLiquidityAccumOutside = cache.secondsPerLiquidityAccum - crossTick.secondsPerLiquidityAccumOutside;
        ticks[cache.crossTick] = crossTick;
        int128 liquidityDelta = ticks[cache.crossTick].liquidityDelta;
        // observe most recent oracle update
        if (zeroForOne) {
            unchecked {
                if (liquidityDelta >= 0){
                    cache.liquidity -= uint128(ticks[cache.crossTick].liquidityDelta);
                } else {
                    cache.liquidity += uint128(-ticks[cache.crossTick].liquidityDelta); 
                }
            }
            pool.tickAtPrice = cache.crossTick;
            cache.crossTick = TickMap.previous(tickMap, cache.crossTick, false);
        } else {
            unchecked {
                if (liquidityDelta >= 0) {
                    cache.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
                } else {
                    cache.liquidity -= uint128(-ticks[cache.crossTick].liquidityDelta);
                }
            }
            pool.tickAtPrice = cache.crossTick;
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
        int128 liquidityDelta = ticks[cache.crossTick].liquidityDelta;
        if (zeroForOne) {
            unchecked {
                if (liquidityDelta >= 0){
                    cache.liquidity -= uint128(ticks[cache.crossTick].liquidityDelta);
                } else {
                    cache.liquidity += uint128(-ticks[cache.crossTick].liquidityDelta); 
                }
            }
            pool.tickAtPrice = cache.crossTick;
            cache.crossTick = TickMap.previous(tickMap, cache.crossTick, false);
        } else {
            unchecked {
                if (liquidityDelta >= 0) {
                    cache.liquidity += uint128(ticks[cache.crossTick].liquidityDelta);
                } else {
                    cache.liquidity -= uint128(-ticks[cache.crossTick].liquidityDelta);
                }
            }
            pool.tickAtPrice = cache.crossTick;
            cache.crossTick = TickMap.next(tickMap, cache.crossTick);
        }
        return (pool, cache);
    }

    function insert(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState memory state,
        int24 lower,
        int24 upper,
        uint128 amount
    ) internal returns (IRangePoolStructs.PoolState memory) {
        validate(lower, upper, IRangePool(address(this)).tickSpacing());
        // check for amount to overflow liquidity delta & global
        if (amount == 0) return state;
        if (amount > uint128(type(int128).max)) require(false, 'LiquidityOverflow()');
        if (type(uint128).max - state.liquidityGlobal < amount) require(false, 'LiquidityOverflow()');

        // get tick at price
        int24 tickAtPrice = state.tickAtPrice;

        if(TickMap.set(tickMap, lower)) {
            ticks[lower].liquidityDelta += int128(amount);
        } else {
            if (lower <= tickAtPrice) {
                (
                    int56 tickSecondsAccum,
                    uint160 secondsPerLiquidityAccum
                ) = Samples.getSingle(
                        IRangePool(address(this)), 
                        IRangePoolStructs.SampleParams(
                            state.samples.index,
                            state.samples.length,
                            uint32(block.timestamp),
                            new uint32[](2),
                            state.tickAtPrice,
                            state.liquidity
                        ),
                        0
                );
                ticks[lower] = IRangePoolStructs.Tick(
                    int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    tickSecondsAccum,
                    secondsPerLiquidityAccum
                );
            } else {
                ticks[lower].liquidityDelta = int128(amount);
            }
        }

        if(TickMap.set(tickMap, upper)) {
            ticks[upper].liquidityDelta -= int128(amount);
        } else {
            if (upper <= tickAtPrice) {
                (
                    int56 tickSecondsAccum,
                    uint160 secondsPerLiquidityAccum
                ) = Samples.getSingle(
                        IRangePool(address(this)), 
                        IRangePoolStructs.SampleParams(
                            state.samples.index,
                            state.samples.length,
                            uint32(block.timestamp),
                            new uint32[](2),
                            state.tickAtPrice,
                            state.liquidity
                        ),
                        0
                );
                ticks[upper] = IRangePoolStructs.Tick(
                    -int128(amount),
                    state.feeGrowthGlobal0,
                    state.feeGrowthGlobal1,
                    tickSecondsAccum,
                    secondsPerLiquidityAccum
                );
            } else {
                ticks[upper].liquidityDelta = -int128(amount);
            }
        }
        if (tickAtPrice >= lower && tickAtPrice < upper) {
            // write an oracle entry
            (state.samples.index, state.samples.length) = Samples.save(
                samples,
                state,
                state.tickAtPrice
            );
            // update pool liquidity
            state.liquidity += amount;
        }
        // update global liquidity
        state.liquidityGlobal += amount;

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
    ) internal returns (IRangePoolStructs.PoolState memory) {
        validate(lower, upper, IRangePool(address(this)).tickSpacing());
        //check for amount to overflow liquidity delta & global
        if (amount == 0) return state;
        if (amount > uint128(type(int128).max)) require(false, 'LiquidityUnderflow()');
        if (amount > state.liquidityGlobal) require(false, 'LiquidityUnderflow()');

        // get tick at price
        int24 tickAtPrice = state.tickAtPrice;

        IRangePoolStructs.Tick storage current = ticks[lower];
        if (lower != TickMath.MIN_TICK && current.liquidityDelta == int128(amount)) {
            TickMap.unset(tickMap, lower);
            delete ticks[lower];
        } else {
            unchecked {
                current.liquidityDelta -= int128(amount);
            }
        }
        current = ticks[upper];

        if (upper != TickMath.MAX_TICK && current.liquidityDelta == -int128(amount)) {
            TickMap.unset(tickMap, upper);
            delete ticks[upper];
        } else {
            unchecked {
                current.liquidityDelta += int128(amount);
            }
        }
        if (tickAtPrice >= lower && tickAtPrice < upper) {
            // write an oracle entry
            (state.samples.index, state.samples.length) = Samples.save(
                samples,
                state,
                tickAtPrice
            );
            state.liquidity -= amount;  
        }
        state.liquidityGlobal -= amount;

        return state;
    }
}
