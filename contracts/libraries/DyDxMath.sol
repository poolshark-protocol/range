// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

import './PrecisionMath.sol';

/// @notice Math library that facilitates ranged liquidity calculations.
library DyDxMath {
    uint256 internal constant Q96 = 0x1000000000000000000000000;

    error AmountsOutOfBounds();
    error PriceOutsideBounds();

    function getDy(
        uint256 liquidity,
        uint256 priceLower,
        uint256 priceUpper,
        bool roundUp
    ) internal pure returns (uint256 dy) {
        unchecked {
            if (roundUp) {
                dy = PrecisionMath.mulDivRoundingUp(liquidity, priceUpper - priceLower, Q96);
            } else {
                dy = PrecisionMath.mulDiv(liquidity, priceUpper - priceLower, Q96);
            }
        }
    }

    function getDx(
        uint256 liquidity,
        uint256 priceLower,
        uint256 priceUpper,
        bool roundUp
    ) internal pure returns (uint256 dx) {
        if (roundUp) {
            dx = PrecisionMath.divRoundingUp(
                PrecisionMath.mulDivRoundingUp(
                    liquidity << 96,
                    priceUpper - priceLower,
                    priceUpper
                ),
                priceLower
            );
        } else {
            dx =
                PrecisionMath.mulDiv(liquidity << 96, priceUpper - priceLower, priceUpper) /
                priceLower;
        }
    }

    function getLiquidityForAmounts(
        uint256 priceLower,
        uint256 priceUpper,
        uint256 currentPrice,
        uint256 dy,
        uint256 dx
    ) internal pure returns (uint256 liquidity) {
        unchecked {
            if (priceUpper <= currentPrice) {
                liquidity = PrecisionMath.mulDiv(dy, Q96, priceUpper - priceLower);
            } else if (currentPrice <= priceLower) {
                liquidity = PrecisionMath.mulDiv(
                    dx,
                    PrecisionMath.mulDiv(priceLower, priceUpper, Q96),
                    priceUpper - priceLower
                );
            } else {
                uint256 liquidity0 = PrecisionMath.mulDiv(
                    dx,
                    PrecisionMath.mulDiv(priceUpper, currentPrice, Q96),
                    priceUpper - currentPrice
                );
                uint256 liquidity1 = PrecisionMath.mulDiv(dy, Q96, currentPrice - priceLower);
                liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
            }
        }
    }

    function getAmountsForLiquidity(
        uint256 priceLower,
        uint256 priceUpper,
        uint256 currentPrice,
        uint256 liquidityAmount,
        bool roundUp
    ) internal pure returns (
        uint128,
        uint128
    ) {
        uint256 dx; uint256 dy;
        if (currentPrice <= priceLower) {
            // token0 (X) is supplied
            dx = getDx(liquidityAmount, priceLower, priceUpper, roundUp);
        } else if (priceUpper <= currentPrice) {
            // token1 (y) is supplied
            dy = getDy(liquidityAmount, priceLower, priceUpper, roundUp);
        } else {
            // Both token0 (x) and token1 (y) are supplied
            dx = getDx(liquidityAmount, currentPrice, priceUpper, roundUp);
            dy = getDy(liquidityAmount, priceLower, currentPrice, roundUp);
        }
        if (dx > uint128(type(int128).max)) require(false, 'AmountsOutOfBounds()');
        if (dy > uint128(type(int128).max)) require(false, 'AmountsOutOfBounds()');
        return (uint128(dx), uint128(dy));
    }

    function getNewPrice(
        uint256 price,
        uint256 liquidity,
        uint256 amount,
        bool zeroForOne,
        bool exactIn
    ) internal pure returns (
        uint256 newPrice
    ) {
        if (exactIn) {
            if (zeroForOne) {
                uint256 liquidityPadded = liquidity << 96;
                newPrice = PrecisionMath.mulDivRoundingUp(
                                liquidityPadded,
                                price,
                                liquidityPadded + price * amount
                        );
            } else {
                newPrice = price + PrecisionMath.mulDiv(amount, Q96, liquidity);
            }
        }

    }
}
