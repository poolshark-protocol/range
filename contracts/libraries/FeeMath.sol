// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import "./PrecisionMath.sol";
import "../interfaces/IRangePoolStructs.sol";

/// @notice Math library that facilitates fee handling for Trident Concentrated Liquidity Pools.
library FeeMath {
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function calculate(
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        bool zeroForOne
    )
        internal
        pure
        returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        if (pool.liquidity == 0 ) return (pool, cache);
        uint256 originalAmount = PrecisionMath.mulDivRoundingUp(cache.tickInput, 1e6, (1e6 - cache.swapFee));
        uint256 feeAmount = PrecisionMath.mulDivRoundingUp(originalAmount, cache.swapFee, 1e6); 
        cache.feeReturn -= feeAmount;
        if (zeroForOne) {
           pool.feeGrowthGlobal0 += uint216(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
        } else {
          pool.feeGrowthGlobal1 += uint216(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
        }

        return (pool, cache);
    }
}