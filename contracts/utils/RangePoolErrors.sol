// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

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

abstract contract RangePoolERC1155Errors {
    error SpenderNotApproved(address owner, address spender);
    error TransferFromOrToAddress0();
    error MintToAddress0();
    error BurnFromAddress0();
    error BurnExceedsBalance(address from, uint256 id, uint256 amount);
    error LengthMismatch(uint256 accountsLength, uint256 idsLength);
    error SelfApproval(address owner);
    error TransferExceedsBalance(address from, uint256 id, uint256 amount);
    error TransferToSelf();
    error ERC1155NotSupported();
}

abstract contract CoverTransferErrors {
    error TransferFailed(address from, address dest);
}
