// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./PrecisionMath.sol";
import "../interfaces/IRangePoolStructs.sol";
import 'hardhat/console.sol';

/// @notice Math library that facilitates fee handling.
library FeeMath {
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function calculate(
        IRangePoolStructs.PoolState memory pool,
        IRangePoolStructs.SwapCache memory cache,
        uint256 amountOut,
        bool zeroForOne
    ) internal view returns (
        IRangePoolStructs.PoolState memory,
        IRangePoolStructs.SwapCache memory
    )
    {
        if (cache.liquidity == 0 ) return (pool, cache);
        uint256 feeAmount = PrecisionMath.mulDivRoundingUp(amountOut, cache.constants.swapFee, 1e6); 
        uint256 protocolFee = PrecisionMath.mulDivRoundingUp(feeAmount, cache.protocolFee, 1e6);
        amountOut -= feeAmount;
        feeAmount -= protocolFee;

        if (zeroForOne) {
           pool.protocolFees.token1 += uint128(protocolFee);
        //    console.log('fee growth 1 increased', feeAmount, Q128, cache.liquidity);
           console.log('fee growth 1 add', pool.feeGrowthGlobal1, uint200(PrecisionMath.mulDiv(feeAmount, Q128, cache.liquidity)));
           pool.feeGrowthGlobal1 += uint200(PrecisionMath.mulDiv(feeAmount, Q128, cache.liquidity));
        } else {
          pool.protocolFees.token0 += uint128(protocolFee);
        //   console.log('fee growth 0 increased', feeAmount, Q128, cache.liquidity);
           console.log('fee growth 0 add', pool.feeGrowthGlobal0, uint200(PrecisionMath.mulDiv(feeAmount, Q128, cache.liquidity)));
          pool.feeGrowthGlobal0 += uint200(PrecisionMath.mulDiv(feeAmount, Q128, cache.liquidity));
        }
        cache.output += amountOut;
        return (pool, cache);
    }
}