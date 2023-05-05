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
        if (pool.liquidity == 0 ) return (pool, cache);
        uint256 feeAmount = PrecisionMath.mulDivRoundingUp(amountOut, cache.swapFee, 1e6); 
        uint256 protocolFee = PrecisionMath.mulDivRoundingUp(feeAmount, cache.protocolFee, 1e6);
        amountOut -= feeAmount;
        feeAmount -= protocolFee;
        console.log('fee check: ', feeAmount);

        if (zeroForOne) {
           pool.protocolFees.token1 += uint128(protocolFee);
           console.log('fee growth 1 before', pool.feeGrowthGlobal1);
        //    if (pool.feeGrowthGlobal1 == 34292938811045563981883043566955) pool.feeGrowthGlobal1 += 34292938811045563981883043566955;
           pool.feeGrowthGlobal1 += uint200(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
            console.log('fee growth 1 after', pool.feeGrowthGlobal1);
        } else {
          pool.protocolFees.token0 += uint128(protocolFee);
          pool.feeGrowthGlobal0 += uint200(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity));
        }
                console.log('back check fee: ', PrecisionMath.mulDiv(
                uint200(PrecisionMath.mulDiv(feeAmount, Q128, pool.liquidity)),
                uint256(pool.liquidity),
                Q128
            ));
        cache.output += amountOut;
        return (pool, cache);
    }
}