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
    uint16 internal constant MAX_FEE = 10000;
    address internal immutable factory;
    address internal immutable token0;
    address internal immutable token1;

    modifier lock() {
        if (poolState.unlocked != 1) revert Locked();
        poolState.unlocked = 2;
        _;
        poolState.unlocked = 1;
    }

    constructor(
        address _token0,
        address _token1,
        int24 _tickSpacing,
        uint16 _swapFee,
        uint160 _startPrice
    ) {
        // validate swap fee
        if (_swapFee > MAX_FEE) revert InvalidSwapFee();

        // set addresses
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        feeTo = IRangePoolFactory(msg.sender).owner();

        // set global state
        PoolState memory pool = PoolState(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        pool.swapFee = _swapFee;
        pool.tickSpacing = _tickSpacing;
        pool.price = _startPrice;
        pool.unlocked = 1;

        // create min and max ticks
        Ticks.initialize(ticks);
    }

    //TODO: add ERC-721 interface
    //TODO: add documentation here to note params
    function mint(MintParams calldata mintParams) external lock {
        PoolState memory pool = poolState;
        MintParams memory params = mintParams;
        uint256 liquidityMinted;
        (params, liquidityMinted) = Positions.validate(params, pool);
        _transferIn(token0, params.amount0);
        _transferIn(token1, params.amount1);

        Position memory position = positions[params.fungible ? msg.sender : params.to][
            params.lower
        ][params.upper];
        IRangePoolERC20 positionToken = tokens[params.lower][params.upper];
        //TODO: is this dangerous?
        unchecked {
            //TODO: if fees > 0 emit PositionUpdated event
            // update position with latest fees accrued

            (position, , ) = Positions.update(
                ticks,
                position,
                pool,
                UpdateParams(
                    params.fungible ? address(this) : params.to,
                    params.lower,
                    params.upper,
                    uint128(liquidityMinted),
                    params.fungible,
                    params.fungible ? positionToken.totalSupply() : 0
                )
            );
            pool = Positions.add(positions, ticks, pool, params, uint128(liquidityMinted));
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
            liquidityMinted = (liquidityMinted * positionToken.totalSupply() /
                    (position.liquidity - liquidityMinted));  /// @dev - fees existed prior to mint => mint less tokens
            positionToken.mint(
                params.to,
                liquidityMinted
            );
        }
        positions[params.fungible ? address(this) : params.to][params.lower][
            params.upper
        ] = position;

        emit Mint(params.to, params.lower, params.upper, uint128(liquidityMinted), params.fungible);
    }

    function compound(CompoundParams calldata params) public lock {
        PoolState memory pool = poolState;

        uint128 amount0;
        uint128 amount1;
        Position memory position = positions[params.fungible ? address(this) : msg.sender][
            params.lower
        ][params.upper];
        (position, amount0, amount1) = Positions.update(
            ticks,
            position,
            poolState,
            UpdateParams(msg.sender, params.lower, params.upper, 0, false, 0)
        );

        (position, pool) = Positions.compound(position, ticks, pool, params);

        //TODO: Compound event
    }

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
            positions[params.fungible ? address(this) : msg.sender][params.lower][params.upper],
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
        (pool, amount0, amount1) = Positions.remove(
            positions,
            ticks,
            pool,
            params,
            params.fungible ? address(this) : msg.sender,
            amount0,
            amount1
        );

        //TODO: implement autocompounding

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
        }

        emit Burn(params.fungible ? address(this) : msg.sender, params.lower, params.upper, params.amount);
        poolState = pool;
    }

    function collect(
        int24 lower,
        int24 upper
    ) public lock returns (uint256 amount0, uint256 amount1) {
        Position memory position = positions[msg.sender][lower][upper];
        (positions[msg.sender][lower][upper], , ) = Positions.update(
            ticks,
            position,
            poolState,
            UpdateParams(msg.sender, lower, upper, 0, false, 0)
        );
        amount0 = positions[msg.sender][lower][upper].amount0;
        amount1 = positions[msg.sender][lower][upper].amount1;
        /// zero out balances
        positions[msg.sender][lower][upper].amount0 = 0;
        positions[msg.sender][lower][upper].amount1 = 0;
        /// transfer out balances
        _transferOut(msg.sender, token0, amount0);
        _transferOut(msg.sender, token1, amount1);

        emit Collect(msg.sender, amount0, amount1);
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
        // bytes calldata data
        lock
        returns (uint256, uint256)
    {
        PoolState memory pool = poolState;
        TickMath.validatePrice(priceLimit);
        if (amountIn == 0) return (0, 0);
        _transferIn(zeroForOne ? token0 : token1, amountIn);

        SwapCache memory cache = SwapCache({
            input: amountIn,
            output: 0,
            feeAmount: PrecisionMath.mulDivRoundingUp(amountIn, pool.swapFee, 1e6)
        });
        // take fee from input amount
        cache.input -= cache.feeAmount;

        while (pool.price != priceLimit && cache.input != 0) {
            (pool, cache) = Ticks.quote(ticks, zeroForOne, priceLimit, pool, cache);
        }
        // handle fee return and transfer out
        if (zeroForOne) {
            if (cache.input > 0) {
                uint128 feeReturn = uint128(
                    (((cache.input * 1e18) / (amountIn - cache.feeAmount)) * cache.feeAmount) / 1e18
                );
                cache.feeAmount -= feeReturn;
                pool.feeGrowthGlobal0 += uint128(cache.feeAmount);
                _transferOut(recipient, token0, cache.input + feeReturn);
            }
            _transferOut(recipient, token1, cache.output);
            emit Swap(recipient, token0, token1, amountIn - cache.input, cache.output);
        } else {
            if (cache.input > 0) {
                uint128 feeReturn = uint128(
                    (((cache.input * 1e18) / (amountIn - cache.feeAmount)) * cache.feeAmount) / 1e18
                );
                cache.feeAmount -= feeReturn;
                pool.feeGrowthGlobal1 += uint128(cache.feeAmount);
                _transferOut(recipient, token1, cache.input + feeReturn);
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
    ) external view override returns (uint256 inAmount, uint256 outAmount) {
        PoolState memory pool = poolState;
        SwapCache memory cache = SwapCache({
            input: amountIn,
            output: 0,
            feeAmount: PrecisionMath.mulDivRoundingUp(amountIn, pool.swapFee, 1e6)
        });
        // take fee from inputAmount
        cache.input -= cache.feeAmount;

        while (pool.price != priceLimit && cache.input != 0) {
            (pool, cache) = Ticks.quote(ticks, zeroForOne, priceLimit, pool, cache);
        }
        if (zeroForOne) {
            if (cache.input > 0) {
                uint128 feeReturn = uint128(
                    (((cache.input * 1e18) / (amountIn - cache.feeAmount)) * cache.feeAmount) / 1e18
                );
                cache.input += feeReturn;
            }
        } else {
            if (cache.input > 0) {
                uint128 feeReturn = uint128(
                    (((cache.input * 1e18) / (amountIn - cache.feeAmount)) * cache.feeAmount) / 1e18
                );
                cache.input += feeReturn;
            }
        }
        inAmount = amountIn - cache.input;
        outAmount = cache.output;
    }
}
