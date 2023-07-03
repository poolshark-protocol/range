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
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Sample[65535] storage samples
    ) external returns (IRangePoolStructs.PoolState memory) {
        // execute swap
        (cache.pool, cache) = Ticks.swap(
            ticks,
            samples,
            tickMap,
            params,
            cache,
            cache.pool
        );

        // calculate amount to transfer in
        cache.amountIn = params.amountIn - cache.input;
        
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
            params.zeroForOne ? -int256(cache.amountIn) : int256(cache.output),
            params.zeroForOne ? int256(cache.output) : -int256(cache.amountIn),
            params.callbackData
        );

        // check balance requirements after callback
        if (balance(params, cache) < balanceStart + cache.amountIn)
            require(false, 'SwapInputAmountTooLow()');

        return cache.pool;
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
