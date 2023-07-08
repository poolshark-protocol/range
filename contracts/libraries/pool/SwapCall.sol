// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../utils/SafeTransfersLib.sol';
import '../Positions.sol';

library SwapCall {
    event Swap(
        address indexed recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint256 amountOut,
        uint160 price,
        uint128 liquidity,
        int24 tickAtPrice
    );

    function perform(
        IRangePoolStructs.SwapParams memory params,
        IRangePoolStructs.SwapCache memory cache,
        IRangePoolStructs.TickMap storage tickMap,
        IRangePoolStructs.PoolState storage poolState,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples
    ) external returns (
        int256,
        int256
    ) {
        (cache.pool, cache) = Ticks.swap(
            ticks,
            samples,
            tickMap,
            params,
            cache,
            cache.pool
        );
        SafeTransfersLib.transferIn(params.zeroForOne ? cache.constants.token0 : cache.constants.token1, cache.input);
        save(cache.pool, poolState);
        if (params.zeroForOne) {
            SafeTransfersLib.transferOut(params.to, cache.constants.token1, cache.output);
        } else {
            SafeTransfersLib.transferOut(params.to, cache.constants.token0, cache.output);
        }
        return (
            params.zeroForOne ? 
                (
                    -int256(cache.input),
                     int256(cache.output)
                )
              : (
                     int256(cache.output),
                    -int256(cache.input)
                )
        );
    }

    function save(
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.PoolState storage poolState
    ) internal {
        poolState.tickAtPrice = pool.tickAtPrice;
        poolState.tickSecondsAccum = pool.tickSecondsAccum;
        poolState.secondsPerLiquidityAccum = pool.secondsPerLiquidityAccum;
        poolState.price = pool.price;
        poolState.liquidity = pool.liquidity;
        poolState.liquidityGlobal = pool.liquidityGlobal;
        poolState.feeGrowthGlobal0 = pool.feeGrowthGlobal0;
        poolState.feeGrowthGlobal1 = pool.feeGrowthGlobal1;
        poolState.samples = pool.samples;
        poolState.protocolFees = pool.protocolFees;
    }
}
