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
    address public immutable owner;
    address internal immutable token0;
    address internal immutable token1;
    uint16 public immutable swapFee;
    int24 public immutable tickSpacing;

    modifier lock() {
        _prelock();
        _;
        _postlock();
    }

    modifier onlyManager() {
        _onlyManager();
        _;
    }

    constructor(
        address _token0,
        address _token1,
        address _owner,
        uint160 _startPrice,
        int24 _tickSpacing,
        uint16 _swapFee
    ) {
        // set addresses
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
            pool,
            tickSpacing
        );

        // save pool state
        poolState = pool;
    }

    function mint(
        MintParams memory params
    ) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.lower][params.upper];
        (position, , ) = Positions.update(
                ticks,
                position,
                pool,
                UpdateParams(
                    params.lower,
                    params.upper,
                    0
                )
        );
        uint256 liquidityMinted;
        (params, liquidityMinted) = Positions.validate(params, pool, _immutables());
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
                    params.lower,
                    params.upper
                )
            );
        }
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
        positions[params.lower][params.upper] = position;
        poolState = pool; 
    }

    function burn(
        BurnParams memory params
    ) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.lower][params.upper];
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
                    params.lower,
                    params.upper,
                    uint128(params.amount)
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
        position.amount0 -= amount0;
        position.amount1 -= amount1;
        if (position.amount0 > 0 || position.amount1 > 0) {
            (position, pool) = Positions.compound(
                position,
                ticks,
                samples,
                tickMap,
                pool,
                CompoundParams(
                    params.lower,
                    params.upper
                )
            );
        }
        if (amount0 > 0) _transferOut(params.to, token0, amount0);
        if (amount1 > 0) _transferOut(params.to, token1, amount1);
        poolState = pool;
        positions[params.lower][params.upper] = position;
    }

    function swap(
        address recipient,
        address refundRecipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) external override lock returns(
        int256,
        int256
    )
    {
        if (amountIn == 0) return (0,0);
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
        if (zeroForOne) {
            if (cache.input > 0) {
                _transferOut(refundRecipient, token0, cache.input);
            }
            _transferOut(recipient, token1, cache.output);
        } else {
            if (cache.input > 0) {
                _transferOut(refundRecipient, token1, cache.input);
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
        uint256,
        uint256,
        uint160
    ) {
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
        return (
            amountIn - cache.input,
            cache.output,
            pool.price
        );
    }

    function snapshot(
       SnapshotParams memory params 
    ) external view returns (
        int56   tickSecondsAccum,
        uint160 secondsPerLiquidityAccum,
        uint32  secondsGrowth,
        uint128 feesOwed0,
        uint128 feesOwed1
    ) {
        return Positions.snapshot(
            address(this),
            params.owner,
            params.lower,
            params.upper
        );
    }

    function fees(
        uint16 protocolFee,
        bool setFee
    ) external lock onlyManager returns (
        uint128 token0Fees,
        uint128 token1Fees
    ) {
        if (setFee) poolState.protocolFee = protocolFee;
        address feeTo = IRangePoolManager(owner).feeTo();
        token0Fees = poolState.protocolFees.token0;
        token1Fees = poolState.protocolFees.token1;
        poolState.protocolFees.token0 = 0;
        poolState.protocolFees.token1 = 0;
        _transferOut(feeTo, token0, token0Fees);
        _transferOut(feeTo, token1, token1Fees);
    }

    function _immutables() private view returns (Immutables memory) {
        return Immutables(
            swapFee,
            tickSpacing
        );
    }

    function _onlyManager() private view {
        if (msg.sender != owner) revert ManagerOnly();
    }

    function _prelock() private {
        if (poolState.unlocked != 1) revert Locked();
        poolState.unlocked = 2;
    }

    function _postlock() private {
        poolState.unlocked = 1;
    }
}
