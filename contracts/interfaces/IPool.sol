// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

import '../base/PoolsharkStructs.sol';

interface IPool is PoolsharkStructs {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(
        SwapParams memory params
    ) external returns (
        int256 amount0,
        int256 amount1
    );
}
