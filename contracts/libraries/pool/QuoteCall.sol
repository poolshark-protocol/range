// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../utils/SafeTransfersLib.sol';
import '../Positions.sol';

library QuoteCall {
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
        IRangePoolStructs.QuoteParams memory params,
        IRangePoolStructs.SwapCache memory cache,
        IRangePoolStructs.TickMap storage tickMap,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks
    ) external view returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory    
    ) {
        return Ticks.quote(
            ticks,
            tickMap,
            params,
            cache,
            cache.pool
        );
    }
}
