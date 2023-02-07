// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

interface IPositionManager {
    function mintCallback(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        bool native
    ) external;
}
