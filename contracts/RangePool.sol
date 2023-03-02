// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './interfaces/IRangePool.sol';
import './base/RangePoolStorage.sol';
import './base/RangePoolEvents.sol';
import './libraries/Ticks.sol';
import './libraries/Positions.sol';
import './utils/SafeTransfers.sol';
import './RangePoolERC20.sol';

contract RangePool is IRangePool, RangePoolStorage, RangePoolEvents, SafeTransfers {
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
        feeTo = IRangePoolFactory(msg.sender).owner();

        // set global state
        PoolState memory pool = PoolState(0, 0, 0, 0, 0, 0, 0, 0, 0);
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
        
        Position memory position = positions[params.fungible ? msg.sender : params.to][
            params.lower
        ][params.upper];
        IRangePoolERC20 positionToken = tokens[params.lower][params.upper];
        uint256 liquidityMinted;
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

        (params, liquidityMinted) = Positions.validate(params, pool, tickSpacing);
        _transferIn(token0, params.amount0);
        _transferIn(token1, params.amount1);
        //TODO: is this dangerous?
        unchecked {
            //TODO: if fees > 0 emit PositionUpdated event
            // update position with latest fees accrued
            console.log('nearest tick check');
            console.logInt(pool.nearestTick);
            console.log('nearest tick check');
            console.logInt(pool.nearestTick);
            (pool, position) = Positions.add(position, ticks, pool, params, uint128(liquidityMinted));
        }

        if (params.fungible) {
            if (position.amount0 > 0 || position.amount1 > 0) {
                (position, pool) = Positions.compound(
                    position,
                    ticks,
                    pool,
                    CompoundParams(params.lower, params.upper, params.fungible)
                );
            }
            if (address(positionToken) == address(0)) {
                positionToken = new RangePoolERC20();
                tokens[params.lower][params.upper] = positionToken;
            }
            if (position.liquidity != liquidityMinted) {
                liquidityMinted = (liquidityMinted * positionToken.totalSupply() /
                    (position.liquidity - liquidityMinted));  /// @dev - fees existed prior to mint => mint less tokens
            }
            positionToken.mint(
                params.to,
                liquidityMinted
            );
        }
        positions[params.fungible ? address(this) : params.to][params.lower][
            params.upper
        ] = position;
        poolState = pool;
        emit Mint(params.to, params.lower, params.upper, uint128(liquidityMinted), params.fungible);
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
            params.amount = uint128(params.amount * position.liquidity / positionToken.totalSupply());
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
        // console.log('amount checks');
        // console.log(ERC20(token0).balanceOf(address(this)));
        // console.log(position.amount0);
        // console.log(ERC20(token1).balanceOf(address(this)));
        // console.log(position.amount1);
        if (params.fungible) {
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
            console.log(ERC20(token0).balanceOf(address(this)));
            console.log(position.amount0);
            console.log(ERC20(token1).balanceOf(address(this)));
            console.log(position.amount1);
            position.amount0 = 0;
            position.amount1 = 0;
            // transfer out balances
            _transferOut(msg.sender, token0, amount0);
            _transferOut(msg.sender, token1, amount1);
            // emit collect event 
            emit Collect(msg.sender, amount0, amount1);
        }
        poolState = pool;
        positions[params.fungible ? address(this) : msg.sender][
            params.lower
        ][params.upper] = position;
        emit Burn(params.fungible ? address(this) : msg.sender, params.lower, params.upper, params.amount);
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
        SwapCache memory cache = SwapCache({
            cross: true,
            crossTick: zeroForOne ? pool.nearestTick : ticks[pool.nearestTick].nextTick,
            swapFee: swapFee,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickInput: 0,
            feeReturn: PrecisionMath.mulDivRoundingUp(amountIn, swapFee, 1e6),
            feeGrowthGlobalIn: zeroForOne ? pool.feeGrowthGlobal0 : pool.feeGrowthGlobal1
        });
        // take fee from input amount
        cache.input -= cache.feeReturn;

        (pool, cache) = Ticks.swap(ticks, zeroForOne, priceLimit, pool, cache);

        // handle fee return and transfer out
        if (zeroForOne) {
            if (cache.input > 0) {
                _transferOut(recipient, token0, cache.input);
            }
            _transferOut(recipient, token1, cache.output);
            emit Swap(recipient, token0, token1, amountIn - cache.input, cache.output);
        } else {
            if (cache.input > 0) {
                _transferOut(recipient, token1, cache.input);
            }
            _transferOut(recipient, token0, cache.output);
            emit Swap(recipient, token1, token0, amountIn - cache.input, cache.output);
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
        SwapCache memory cache = SwapCache({
            cross: true,
            crossTick: zeroForOne ? pool.nearestTick : ticks[pool.nearestTick].nextTick,
            swapFee: swapFee,
            input: amountIn,
            output: 0,
            amountIn: amountIn,
            tickInput: 0,
            feeReturn: PrecisionMath.mulDivRoundingUp(amountIn, swapFee, 1e6),
            feeGrowthGlobalIn: zeroForOne ? pool.feeGrowthGlobal0 : pool.feeGrowthGlobal1
        });
        // take fee from inputAmount
        cache.input -= cache.feeReturn;
        (pool, cache) = Ticks.quote(ticks, zeroForOne, priceLimit, pool, cache);
        
        cache.input  = amountIn - cache.input;
        cache.output = cache.output;
        return (pool, cache);
    }
}
