// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

abstract contract RangePoolErrors {
    error Locked();
    error FactoryOnly();
    error InvalidToken();
    error InvalidPosition();
    error InvalidSwapFee();
    error InvalidTickSpread();
    error LiquidityOverflow();
    error RangeErc20NotFound();
    error RangeErc20InsufficientBalance();
    error InvalidTick();
    error NotEnoughOutputLiquidity();
    error WaitUntilEnoughObservations();
}

abstract contract CoverTransferErrors {
    error TransferFailed(address from, address dest);
}
