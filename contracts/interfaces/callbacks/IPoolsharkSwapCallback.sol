// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

/// @title Callback for swaps
/// @notice Any contract that calls the `swap` function must implement this interface.
interface IPoolsharkSwapCallback {
    /// @notice Called to `msg.sender` after executing a swap.
    /// @dev In the implementation you must pay the pool tokens owed for the swap.
    /// amount0Delta and amount1Delta can both be 0 if no tokens were swapped.
    /// @param amount0Delta The amount of token0 either received by (positive) or sent from (negative) the user.
    /// @param amount1Delta The amount of token1 either received by (positive) or sent from (negative) the user.
    function poolsharkSwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}