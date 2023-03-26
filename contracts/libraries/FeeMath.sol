// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./PrecisionMath.sol";
import "../interfaces/IRangePoolStructs.sol";

/// @notice Math library that facilitates fee handling.
library FeeMath {
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function calculate(
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        bool zeroForOne
    ) internal pure returns (
            IRangePoolStructs.PoolState memory,
            IRangePoolStructs.SwapCache memory
        )
    {
        if (pool.liquidity == 0 ) return (pool, cache);
        uint256 feeAmount = PrecisionMath.mulDivRoundingUp(cache.output, cache.swapFee, 1e6); 
        uint256 protocolFee = PrecisionMath.mulDivRoundingUp(feeAmount, cache.protocolFee, 1e6);
        cache.output -= feeAmount;
        feeAmount -= protocolFee;
        if (zeroForOne) {
           pool.protocolFees.token1 += uint128(protocolFee);
           pool.feeGrowthGlobal1 += uint216(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
        } else {
          pool.protocolFees.token0 += uint128(protocolFee);
          pool.feeGrowthGlobal0 += uint216(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
        }
        return (pool, cache);
    }
}