// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../utils/SafeTransfersLib.sol';
import '../Positions.sol';

library MintCall {
    event Mint(
        address indexed recipient,
        int24 lower,
        int24 upper,
        uint256 indexed tokenId,
        uint128 tokenMinted,
        uint128 liquidityMinted,
        uint128 amount0,
        uint128 amount1
    );

    function perform(
        IRangePoolStructs.MintParams memory params,
        IRangePoolStructs.MintCache memory cache,
        IRangePoolStructs.TickMap storage tickMap,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples
    ) external returns (IRangePoolStructs.MintCache memory) {
        (
            cache.position,
            ,,
        ) = Positions.update(
                ticks,
                cache.position,
                cache.pool,
                IRangePoolStructs.UpdateParams(
                    params.lower,
                    params.upper,
                    0
                )
        );
        (params, cache.liquidityMinted) = Positions.validate(params, cache.pool, cache.constants);
        if (params.amount0 > 0) SafeTransfersLib.transferIn(cache.constants.token0, params.amount0);
        if (params.amount1 > 0) SafeTransfersLib.transferIn(cache.constants.token1, params.amount1);
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
        // update position with latest fees accrued
        (cache.pool, cache.position, cache.liquidityMinted) = Positions.add(
            cache.position,
            ticks,
            samples,
            tickMap,
            IRangePoolStructs.AddParams(
                cache.pool, 
                params,
                uint128(cache.liquidityMinted),
                uint128(cache.liquidityMinted)
            )
        );
        return cache;
    }
}
