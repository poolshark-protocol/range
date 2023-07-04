// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../utils/SafeTransfersLib.sol';
import '../Positions.sol';

library BurnCall {
    event Burn(
        address indexed recipient,
        int24 lower,
        int24 upper,
        uint256 indexed tokenId,
        uint128 tokenBurned,
        uint128 liquidityBurned,
        uint128 amount0,
        uint128 amount1
    );

    function perform(
        IRangePoolStructs.BurnParams memory params,
        IRangePoolStructs.BurnCache memory cache,
        IRangePoolStructs.TickMap storage tickMap,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples
    ) external returns (IRangePoolStructs.BurnCache memory) {
        if (params.burnPercent > 1e38) params.burnPercent = 1e38;
        (
            cache.position,
            cache.amount0,
            cache.amount1,
            cache.tokenBurned
        ) = Positions.update(
                ticks,
                cache.position,
                cache.pool,
                IRangePoolStructs.UpdateParams(
                    params.lower,
                    params.upper,
                    params.burnPercent
                )
        );
        (
            cache.pool,
            cache.position,
            cache.amount0,
            cache.amount1
        ) = Positions.remove(
            cache.position,
            ticks,
            samples,
            tickMap,
            cache.pool,
            params,
            IRangePoolStructs.RemoveParams(
                cache.amount0,
                cache.amount1,
                cache.tokenBurned
            )
        );
        cache.position.amount0 -= cache.amount0;
        cache.position.amount1 -= cache.amount1;
        if (cache.position.amount0 > 0 || cache.position.amount1 > 0) {
            (cache.position, cache.pool) = Positions.compound(
                cache.position,
                ticks,
                samples,
                tickMap,
                cache.pool,
                IRangePoolStructs.CompoundParams(
                    params.lower,
                    params.upper
                )
            );
        }
        if (cache.amount0 > 0) SafeTransfersLib.transferOut(params.to, cache.constants.token0, cache.amount0);
        if (cache.amount1 > 0) SafeTransfersLib.transferOut(params.to, cache.constants.token1, cache.amount1);
        return cache;
    }
}
