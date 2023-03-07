// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import './IRangePoolStructs.sol';

/// @notice Range Pool Interface
interface IRangePool is IRangePoolStructs {
    function mint(MintParams calldata mintParams) external;

    function burn(BurnParams calldata burnParams) external;

    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external returns (
        // bytes calldata data
        uint256 inputAmount,
        uint256 outputAmount
    );

    function quote(
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external view returns (
        PoolState memory,
        SwapCache memory
    );

    function collectFees() external;
}
