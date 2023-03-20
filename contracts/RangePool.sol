// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import './RangePoolERC20.sol';
import './base/storage/RangePoolStorage.sol';
import './interfaces/IRangePool.sol';
import './libraries/Positions.sol';
import './libraries/Ticks.sol';
import './utils/RangePoolErrors.sol';
import './utils/SafeTransfers.sol';

contract RangePool is RangePoolStorage, RangePoolErrors, SafeTransfers {
    address internal immutable token0;
    address internal immutable token1;
    uint16 public immutable swapFee;
    int24 public immutable tickSpacing;
    address internal immutable _factory;

    error OwnerOnly();

    modifier lock() {
        if (poolState.unlocked != 1) revert Locked();
        poolState.unlocked = 2;
        _;
        poolState.unlocked = 1;
    }

    modifier onlyOwner() {
        if (address(_owner) != msg.sender) revert OwnerOnly();
        _;
    }

    constructor(
        address _token0,
        address _token1,
        int24 _tickSpacing,
        uint16 _swapFee,
        uint160 _startPrice,
        IRangePoolAdmin owner_
    ) {
        // set addresses
        _factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        _owner  = owner_;

        // set global state
        PoolState memory pool;
        pool.price = _startPrice;
        pool.unlocked = 1;
        pool.nearestTick = TickMath.MIN_TICK;

        // set immutables
        swapFee = _swapFee;
        tickSpacing = _tickSpacing;

        // create min and max ticks
        Ticks.initialize(tickMap);

        // initialize pool state
        poolState = pool;
    }

    function mint(MintParams memory params) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.fungible ? address(this) 
                                                             : params.to]
                                            [params.lower][params.upper];
        IRangePoolERC20 positionToken;
        if(params.fungible) {
            positionToken = tokens[params.lower][params.upper];
            if (address(positionToken) == address(0)) {
                positionToken = new RangePoolERC20();
                tokens[params.lower][params.upper] = positionToken;
            }
        }
        (position, , ) = Positions.update(
                ticks,
                position,
                pool,
                UpdateParams(
                    params.fungible ? address(this) : params.to,
                    params.lower,
                    params.upper,
                    0,
                    params.fungible,
                    params.fungible ? positionToken.totalSupply() : 0
                )
        );
        uint256 liquidityMinted;
        //TODO: check fees and modify liquidity accordingly
        (params, liquidityMinted) = Positions.validate(params, pool, tickSpacing);
        _transferIn(token0, params.amount0);
        _transferIn(token1, params.amount1);

        if (params.fungible) {
            if (position.amount0 > 0 || position.amount1 > 0) {
                (position, pool) = Positions.compound(
                    position,
                    ticks,
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
        }
        //TODO: if fees > 0 emit PositionUpdated event
        // update position with latest fees accrued
        (pool, position, liquidityMinted) = Positions.add(
            position,
            ticks,
            tickMap,
            pool, 
            params, 
            AddParams(
                uint128(liquidityMinted),
                uint128(liquidityMinted),
                params.fungible ? positionToken.totalSupply() : 0,
                positionToken
            )
        );
        if (params.fungible) {
            positionToken.mint(
                params.to,
                liquidityMinted
            );
        }
        positions[params.fungible ? address(this) : params.to][params.lower][
            params.upper
        ] = position;
        poolState = pool;
        
    }

    //TODO: support both calldata and memory params
    function burn(BurnParams memory params) external lock {
        PoolState memory pool = poolState;
        Position memory position = positions[params.fungible ? address(this) 
                                                             : msg.sender]
                                            [params.lower][params.upper];
        IRangePoolERC20 positionToken = tokens[params.lower][params.upper];
        if (params.fungible) {
            if (address(positionToken) == address(0)) {
                revert RangeErc20NotFound();
            }
            /// @dev - burn will revert if insufficient balance
            positionToken.burn(msg.sender, params.amount);
        }
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
                    params.fungible,
                    params.fungible ? (positionToken.totalSupply() + params.amount) : 0
                )
        );
        (pool, position, amount0, amount1) = Positions.remove(
            position,
            ticks,
            tickMap,
            pool,
            params,
            RemoveParams(
                amount0,
                amount1,
                params.fungible ? positionToken.totalSupply() + params.amount : 0,
                positionToken
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
        if (position.amount0 > 0 || position.amount1 > 0) {
            (position, pool) = Positions.compound(
                position,
                ticks,
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
        // emit Burn(params.fungible ? address(this) : msg.sender, params.lower, params.upper, params.amount);
    }

    //TODO: block the swap if there is an overflow on fee growth
    function swap(
        address recipient,
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    )
        external
        override
        lock
    {
        if (amountIn == 0) return;
        _transferIn(zeroForOne ? token0 : token1, amountIn);

        PoolState memory pool = poolState;
        SwapCache memory cache;
        (pool, cache) = Ticks.swap(
            ticks,
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

    function quote(
        bool zeroForOne,
        uint256 amountIn,
        uint160 priceLimit
    ) public view override returns (
        PoolState memory,
        SwapCache memory
    ) {
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

    function collectFees() public onlyOwner returns (uint128 token0Fees, uint128 token1Fees) {
        token0Fees = poolState.protocolFees.token0;
        token1Fees = poolState.protocolFees.token1;
        _transferOut(_owner.feeTo(), token0, token0Fees);
        _transferOut(_owner.feeTo(), token1, token1Fees);
        poolState.protocolFees.token0 = 0;
        poolState.protocolFees.token1 = 0;
    }

    function owner() external view returns (IRangePoolAdmin) {
        return _owner;
    }
}
