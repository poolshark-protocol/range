// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import './RangePool.sol';
import './interfaces/IRangePoolFactory.sol';
import './base/storage/RangePoolFactoryStorage.sol';
import './base/events/RangePoolFactoryEvents.sol';

contract RangePoolFactory is
    IRangePoolFactory,
    RangePoolFactoryStorage,
    RangePoolFactoryEvents
{
    address public immutable owner;
    error InvalidTokenAddress();
    error PoolAlreadyExists();
    error FeeTierNotSupported();

    constructor(address _owner) {
        owner = _owner;
    }

    function createRangePool(
        address tokenIn,
        address tokenOut,
        uint16  swapFee,
        uint160 startPrice
    ) external override returns (address pool) {
        // validate token pair
        if (tokenIn == tokenOut || tokenIn == address(0) || tokenOut == address(0)) {
            revert InvalidTokenAddress();
        }
        address token0 = tokenIn < tokenOut ? tokenIn : tokenOut;
        address token1 = tokenIn < tokenOut ? tokenOut : tokenIn;
        if (ERC20(token0).decimals() == 0) revert InvalidTokenAddress();
        if (ERC20(token1).decimals() == 0) revert InvalidTokenAddress();

        // generate key for pool
        bytes32 key = keccak256(abi.encode(token0, token1, swapFee));
        if (rangePools[key] != address(0)) {
            revert PoolAlreadyExists();
        }

        // check fee tier exists and get tick spacing
        int24 tickSpacing = IRangePoolManager(owner).feeTiers(swapFee);
        if (tickSpacing == 0) {
            revert FeeTierNotSupported();
        }

        // launch pool and save address
        pool = address(new RangePool(token0, token1, owner, startPrice, int24(tickSpacing), swapFee));

        rangePools[key] = pool;

        // emit event for indexers
        emit RangePoolCreated(token0, token1, swapFee, pool, startPrice);
    }

    function getRangePool(
        address tokenIn,
        address tokenOut,
        uint256 swapFee
    ) public view override returns (address) {
        // set lexographical token address ordering
        address token0 = tokenIn < tokenOut ? tokenIn : tokenOut;
        address token1 = tokenIn < tokenOut ? tokenOut : tokenIn;

        // get pool address from mapping
        bytes32 key = keccak256(abi.encode(token0, token1, swapFee));

        return rangePools[key];
    }
}
