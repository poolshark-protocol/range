// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../../interfaces/callbacks/IPoolsharkSwapCallback.sol';
import '../../interfaces/IERC20Minimal.sol';
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
        save(cache.pool, poolState);
        
        // transfer output amount
        SafeTransfersLib.transferOut(
            params.to, 
            params.zeroForOne ? cache.constants.token1
                              : cache.constants.token0,
            cache.output
        );

        // check balance and execute callback
        uint256 balanceStart = balance(params, cache);
        IPoolsharkSwapCallback(msg.sender).poolsharkSwapCallback(
            params.zeroForOne ? -int256(cache.input) : int256(cache.output),
            params.zeroForOne ? int256(cache.output) : -int256(cache.input),
            params.callbackData
        );

        // check balance requirements after callback
        if (balance(params, cache) < balanceStart + cache.input)
            require(false, 'SwapInputAmountTooLow()');

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

    function balance(
        IRangePoolStructs.SwapParams memory params,
        IRangePoolStructs.SwapCache memory cache
    ) private view returns (uint256) {
        (
            bool success,
            bytes memory data
        ) = (params.zeroForOne ? cache.constants.token0
                               : cache.constants.token1)
                               .staticcall(
                                    abi.encodeWithSelector(
                                        IERC20Minimal.balanceOf.selector,
                                        address(this)
                                    )
                                );
        require(success && data.length >= 32);
        return abi.decode(data, (uint256));
    }
}
