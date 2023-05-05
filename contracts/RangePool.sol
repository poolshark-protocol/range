// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import './base/storage/RangePoolStorage.sol';
import './interfaces/IRangePool.sol';
import './RangePoolERC1155.sol';
import './libraries/Positions.sol';
import './libraries/Ticks.sol';
import './libraries/Tokens.sol';
import './utils/RangePoolErrors.sol';
import './utils/SafeTransfers.sol';

contract RangePool is 
    RangePoolERC1155,
    RangePoolStorage,
    RangePoolErrors,
    SafeTransfers
{
    address internal immutable token0;
    address internal immutable token1;
    uint16 public immutable swapFee;
    int24 public immutable tickSpacing;
    address internal immutable _factory;

    modifier lock() {
        _prelock();
        _;
        _postlock();
    }

    constructor(
        address _token0,
        address _token1,
        int24 _tickSpacing,
        uint16 _swapFee,
        uint160 _startPrice,
        IRangePoolManager _owner
    ) {
        // validate start price
        TickMath.validatePrice(_startPrice);

        // set addresses
        _factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        owner  = _owner;

        // set global state
        PoolState memory pool;
        pool.price = _startPrice;
        pool.tickAtPrice = TickMath.getTickAtSqrtRatio(pool.price);
        pool.unlocked = 1;

        // set immutables
        swapFee = _swapFee;
        tickSpacing = _tickSpacing;

        // create ticks and sample
        pool = Ticks.initialize(
            tickMap,
            samples,
            pool
        );

        // save pool state
        poolState = pool;
    }

    function mint(MintParams memory params) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.fungible ? address(this) 
                                                             : params.to]
                                            [params.lower][params.upper];
        console.log('mint fee growth', pool.feeGrowthGlobal1);
        (position, , ) = Positions.update(
                ticks,
                position,
                pool,
                UpdateParams(
                    params.fungible ? address(this) : params.to,
                    params.lower,
                    params.upper,
                    0,
                    params.fungible
                )
        );
        uint256 liquidityMinted;
        (params, liquidityMinted) = Positions.validate(params, pool);
        if (params.amount0 > 0) _transferIn(token0, params.amount0);
        if (params.amount1 > 0) _transferIn(token1, params.amount1);
        if (position.amount0 > 0 || position.amount1 > 0) {
            (position, pool) = Positions.compound(
                position,
                ticks,
                samples,
                tickMap,
                pool,
                CompoundParams(
                    params.fungible ? address(this) : params.to, 
                    params.lower,
                    params.upper,
                    params.fungible
                )
            );
        }
        //TODO: if fees > 0 emit PositionUpdated event
        // update position with latest fees accrued
        (pool, position, liquidityMinted) = Positions.add(
            position,
            ticks,
            samples,
            tickMap,
            AddParams(
                pool, 
                params,
                uint128(liquidityMinted),
                uint128(liquidityMinted)
            )
        );
        positions[params.fungible ? address(this) : params.to][params.lower][
            params.upper
        ] = position;
        poolState = pool;   
    }

    function burn(
        BurnParams memory params
    ) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.fungible ? address(this) 
                                                             : msg.sender]
                                            [params.lower][params.upper];
        uint128 amount0;
        uint128 amount1;
        (
            position,
            amount0,
            amount1
        ) = Positions.update(
                ticks,
                position,
                pool,
                UpdateParams(
                    params.fungible ? address(this) : msg.sender,
                    params.lower,
                    params.upper,
                    uint128(params.amount),
                    params.fungible
                )
        );
        (pool, position, amount0, amount1) = Positions.remove(
            position,
            ticks,
            samples,
            tickMap,
            pool,
            params,
            RemoveParams(
                amount0,
                amount1
            )
        );
        if (params.fungible) {
            position.amount0 -= amount0;
            position.amount1 -= amount1;
        } else if (params.collect) {
            amount0 = position.amount0;
            amount1 = position.amount1;
            // zero out balances
            position.amount0 = 0;
            position.amount1 = 0;
        }
        /// @dev - always compound for fungible
        /// @dev - only comound for nonfungible is collect is false
        if (position.amount0 > 0 || position.amount1 > 0) {
            (position, pool) = Positions.compound(
                position,
                ticks,
                samples,
                tickMap,
                pool,
                CompoundParams(
                    params.fungible ? address(this) : msg.sender,
                    params.lower,
                    params.upper,
                    params.fungible
                )
            );
        }
        _transferOut(params.to, token0, amount0);
        _transferOut(params.to, token1, amount1);
        poolState = pool;
        positions[params.fungible ? address(this) : msg.sender][
            params.lower
        ][params.upper] = position;
    }

    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external override lock
    {
        if (amountIn == 0) return;
        _transferIn(zeroForOne ? token0 : token1, amountIn);
        PoolState memory pool = poolState;
        SwapCache memory cache;
        (pool, cache) = Ticks.swap(
            ticks,
            samples,
            tickMap,
            recipient,
            zeroForOne,
            priceLimit,
            swapFee,
            amountIn,
            pool
        );

        // handle fee return and transfer out
        if (zeroForOne) {
            if (cache.input > 0) {
                _transferOut(recipient, token0, cache.input);
            }
            _transferOut(recipient, token1, cache.output);
        } else {
            if (cache.input > 0) {
                _transferOut(recipient, token1, cache.input);
            }
            _transferOut(recipient, token0, cache.output);
        }
        poolState = pool;
    }

    function increaseSampleLength(
        uint16 sampleLengthNext
    ) external override lock {
        poolState = Samples.expand(
            samples,
            poolState,
            sampleLengthNext
        );
    }

    function quote(
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external view override returns (
        PoolState memory,
        SwapCache memory
    ) {
        // figure out price limit for user
        // quote with low price limit
        PoolState memory pool = poolState;
        SwapCache memory cache;
        // take fee from inputAmount
        
        (pool, cache) = Ticks.quote(
            ticks,
            tickMap,
            zeroForOne,
            priceLimit,
            swapFee,
            amountIn,
            pool
        );
        cache.input  = amountIn - cache.input;
        cache.output = cache.output;
        return (pool, cache);
    }

    function collectProtocolFees() external lock returns (
        uint128 token0Fees,
        uint128 token1Fees
    ) {
        token0Fees = poolState.protocolFees.token0;
        token1Fees = poolState.protocolFees.token1;
        poolState.protocolFees.token0 = 0;
        poolState.protocolFees.token1 = 0;
        _transferOut(owner.feeTo(), token0, token0Fees);
        _transferOut(owner.feeTo(), token1, token1Fees);
    }

    function _prelock() private {
        if (poolState.unlocked != 1) revert Locked();
        poolState.unlocked = 2;
    }

    function _postlock() private {
        poolState.unlocked = 1;
    }
}
