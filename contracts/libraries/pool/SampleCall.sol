// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../utils/SafeTransfersLib.sol';
import '../Samples.sol';

library SampleCall {
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
        IRangePoolStructs.PoolState memory state,
        uint32[] memory secondsAgo
    ) external view returns (
        int56[]   memory tickSecondsAccum,
        uint160[] memory secondsPerLiquidityAccum
    ) {
        return Samples.get(
            address(this),
            IRangePoolStructs.SampleParams(
                state.samples.index,
                state.samples.length,
                uint32(block.timestamp),
                secondsAgo,
                state.tickAtPrice,
                state.liquidity
            )
        );
    }
}
