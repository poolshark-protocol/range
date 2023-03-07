// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './interfaces/IRangePool.sol';
import './base/RangePoolStorage.sol';
import './libraries/Ticks.sol';
import './libraries/Positions.sol';
import './utils/SafeTransfers.sol';
import './RangePoolERC20.sol';

contract RangePool is IRangePool, RangePoolStorage, SafeTransfers {
    address internal immutable factory;
    address internal immutable token0;
    address internal immutable token1;
    uint16 public immutable swapFee;
    int24 public immutable tickSpacing;

    modifier lock() {
        if (poolState.unlocked != 1) revert Locked();
        poolState.unlocked = 2;
        _;
        poolState.unlocked = 1;
    }

    modifier factoryOnly() {
        if (factory != msg.sender) revert FactoryOnly();
        _;
    }

    error Debug();

    constructor(
        address _token0,
        address _token1,
        int24 _tickSpacing,
        uint16 _swapFee,
        uint160 _startPrice
    ) {
        // set addresses
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;

        // set global state
        PoolState memory pool = PoolState(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ProtocolFees(0,0));
        pool.price = _startPrice;
        pool.unlocked = 1;
        pool.nearestTick = TickMath.MIN_TICK;

        // set immutables
        swapFee = _swapFee;
        tickSpacing = _tickSpacing;

        // create min and max ticks
        Ticks.initialize(ticks);

        // initialize pool state
        poolState = pool;
    }

    //TODO: handle support of calldata and memory params
    //TODO: handle incorrect ratio of assets deposited
    //TODO: add ERC-721 interface
    //TODO: add documentation here to note params
    function mint(MintParams calldata mintParams) external lock {
        PoolState memory pool = poolState;
        MintParams memory params = mintParams;
        Position memory position = positions[params.fungible ? address(this) : params.to][
            params.lower
        ][params.upper];
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
                    pool,
                    CompoundParams(params.lower, params.upper, params.fungible)
                );
            }
        }
        //TODO: if fees > 0 emit PositionUpdated event
        // update position with latest fees accrued
        (pool, position, liquidityMinted) = Positions.add(position, ticks, pool, params, uint128(liquidityMinted), positionToken);
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
    function burn(BurnParams calldata burnParams) external lock {
        PoolState memory pool = poolState;
        BurnParams memory params = burnParams;
        Position memory position = positions[params.fungible ? address(this) : msg.sender][
            params.lower
        ][params.upper];
        IRangePoolERC20 positionToken = tokens[params.lower][params.upper];
        if (params.fungible) {
            if (address(positionToken) == address(0)) {
                revert RangeErc20NotFound();
            }
            /// @dev - burn will revert if insufficient balance
            positionToken.burn(msg.sender, params.amount);
            if (params.amount > 0)
                params.amount = uint128(uint256(params.amount) 
                                        * uint256(position.liquidity) 
                                        / (positionToken.totalSupply() + params.amount));
        }

        // Ensure no overflow happens when we cast from uint128 to int128.
        if (params.amount > uint128(type(int128).max)) revert LiquidityOverflow();
        // update position and get new params.lower and params.upper
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
                    params.fungible ? positionToken.totalSupply() : 0
                )
        );
        //TODO: fungible position only gets fraction of fees
        //TODO: add PositionUpdated event
        (pool, position, amount0, amount1) = Positions.remove(
            position,
            ticks,
            pool,
            params,
            amount0,
            amount1
        );
        if (params.fungible) {
            position.amount0 -= amount0;
            position.amount1 -= amount1;
            if (position.amount0 > 0 || position.amount1 > 0) {
                (position, pool) = Positions.compound(
                    position,
                    ticks,
                    pool,
                    CompoundParams(params.lower, params.upper, params.fungible)
                );
            }
            _transferOut(params.to, token0, amount0);
            _transferOut(params.to, token1, amount1);
        } else if (params.collect) {
            amount0 = position.amount0;
            amount1 = position.amount1;
            // zero out balances
            position.amount0 = 0;
            position.amount1 = 0;
            // transfer out balances
            _transferOut(msg.sender, token0, amount0);
            _transferOut(msg.sender, token1, amount1);
            // emit collect event 
            // emit Collect(msg.sender, amount0, amount1);
        }
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
        returns (uint256, uint256)
    {
        if (amountIn == 0) return (0, 0);
        _transferIn(zeroForOne ? token0 : token1, amountIn);

        PoolState memory pool = poolState;
        SwapCache memory cache;

        (pool, cache) = Ticks.swap(
            ticks,
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
        return (amountIn - cache.input, cache.output);
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
        
        (pool, cache) = Ticks.quote(ticks, zeroForOne, priceLimit, swapFee, amountIn, pool);
        
        cache.input  = amountIn - cache.input;
        cache.output = cache.output;
        return (pool, cache);
    }

    function collectFees() public factoryOnly {
        _transferOut(IRangePoolFactory(factory).feeTo(), token0, poolState.protocolFees.token0);
        _transferOut(IRangePoolFactory(factory).feeTo(), token1, poolState.protocolFees.token1);
        poolState.protocolFees.token0 = 0;
        poolState.protocolFees.token1 = 0;
    }
}
