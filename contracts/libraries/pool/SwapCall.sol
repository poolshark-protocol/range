// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

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
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples
    ) external returns (IRangePoolStructs.PoolState memory) {
        SafeTransfersLib.transferIn(params.zeroForOne ? cache.constants.token0 : cache.constants.token1, params.amountIn);
         (cache.pool, cache) = Ticks.swap(
            ticks,
            samples,
            tickMap,
            params,
            cache,
            cache.pool
        );
        if (params.zeroForOne) {
            if (cache.input > 0) {
                SafeTransfersLib.transferOut(params.to, cache.constants.token0, cache.input);
            }
            SafeTransfersLib.transferOut(params.to, cache.constants.token1, cache.output);
        } else {
            if (cache.input > 0) {
                SafeTransfersLib.transferOut(params.to, cache.constants.token1, cache.input);
            }
            SafeTransfersLib.transferOut(params.to, cache.constants.token0, cache.output);
        }
        return cache.pool;
    }
}
