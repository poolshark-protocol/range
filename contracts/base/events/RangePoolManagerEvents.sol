// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

abstract contract RangePoolManagerEvents {
    event FactoryChanged(address indexed previousFactory, address indexed newFactory);
    event FeeTierEnabled(uint16 swapFee, int24 tickSpacing);
    event FeeToTransfer(address indexed previousFeeTo, address indexed newFeeTo);
    event OwnerTransfer(address indexed previousOwner, address indexed newOwner);
    event ProtocolFeeUpdated(address[] pool, uint16 protocolFee);
    event ProtocolFeeCollected(address[] pool, uint128[] token0Fees, uint128[] token1Fees);
}
