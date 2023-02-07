// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import './IRangePoolStructs.sol';

/// @notice Range Pool Interface
interface IRangePool is IRangePoolStructs {
    function mint(
        MintParams calldata mintParams
    ) external;

    function burn(
        BurnParams calldata burnParams
    ) external;

    function collect(int24 lower, int24 upper) external returns (uint256 amount0, uint256 amount1);

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

    function quote(
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external view returns (uint256 inAmount, uint256 outAmount);
}
