// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

import './IRangePoolStructs.sol';
import './IRangePoolManager.sol';

/// @notice Range Pool Interface
interface IRangePool is IRangePoolStructs {
    function mint(MintParams calldata mintParams) external;

    function burn(BurnParams calldata burnParams) external;

    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external;

    function quote(
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external view returns (
        PoolState memory,
        SwapCache memory
    );

    function collectFees() external returns (
        uint128 token0Fees,
        uint128 token1Fees
    );

    function owner() external view returns (
        IRangePoolManager
    );

    function samples(uint256) external view returns (
        uint32,
        int56,
        uint160
    );
}
