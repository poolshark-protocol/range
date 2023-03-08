// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './RangePool.sol';
import './interfaces/IRangePoolFactory.sol';
import './base/RangePoolFactoryStorage.sol';
import './base/RangePoolFactoryEvents.sol';

contract RangePoolFactory is
    IRangePoolFactory,
    RangePoolFactoryStorage,
    RangePoolFactoryEvents
{
    error IdenticalTokenAddresses();
    error InvalidTokenDecimals();
    error PoolAlreadyExists();
    error FeeTierNotSupported();

    constructor(address owner_) {
        _owner = IRangePoolAdmin(owner_);
    }

    function createRangePool(
        address fromToken,
        address destToken,
        uint16 swapFee,
        uint160 startPrice
    ) external override returns (address pool) {
        // validate token pair
        if (fromToken == destToken) {
            revert IdenticalTokenAddresses();
        }
        address token0 = fromToken < destToken ? fromToken : destToken;
        address token1 = fromToken < destToken ? destToken : fromToken;
        if (ERC20(token0).decimals() == 0) revert InvalidTokenDecimals();
        if (ERC20(token1).decimals() == 0) revert InvalidTokenDecimals();

        // generate key for pool
        bytes32 key = keccak256(abi.encode(token0, token1, swapFee));
        if (rangePools[key] != address(0)) {
            revert PoolAlreadyExists();
        }

        // check fee tier exists and get tick spacing
        int24 tickSpacing = _owner.feeTiers(swapFee);
        if (tickSpacing == 0) {
            revert FeeTierNotSupported();
        }

        // launch pool and save address
        pool = address(new RangePool(token0, token1, int24(tickSpacing), swapFee, startPrice, _owner));

        rangePools[key] = pool;

        // emit event for indexers
        emit RangePoolCreated(token0, token1, swapFee, pool);
    }

    function getRangePool(
        address fromToken,
        address destToken,
        uint256 fee
    ) public view override returns (address) {
        // set lexographical token address ordering
        address token0 = fromToken < destToken ? fromToken : destToken;
        address token1 = fromToken < destToken ? destToken : fromToken;

        // get pool address from mapping
        bytes32 key = keccak256(abi.encode(token0, token1, fee));

        return rangePools[key];
    }

    function owner() public view override returns (address) {
        return address(_owner);
    }
}
