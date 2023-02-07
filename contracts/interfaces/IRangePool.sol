// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import './IRangePoolStructs.sol';

/// @notice Range Pool Interface
interface IRangePool is IRangePoolStructs {
    function collect(int24 lower, int24 upper) external returns (uint256 amount0, uint256 amount1);

    function mint(
        address recipient,
        int24 lowerOld,
        int24 lower,
        int24 upperOld,
        int24 upper,
        uint128 amount0,
        uint128 amount1
    ) external;

    function burn(
        int24 lower,
        int24 upper,
        uint128 amount
    ) external;

    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    )
        external
        returns (
            // bytes calldata data
            uint256 inputAmount,
            uint256 outputAmount
        );
}
