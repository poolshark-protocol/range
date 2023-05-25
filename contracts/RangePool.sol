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
import './libraries/pool/MintCall.sol';
import './libraries/pool/BurnCall.sol';
import './libraries/pool/SwapCall.sol';

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
        MintCache memory cache = MintCache({
            pool: poolState,
            position: positions[params.lower][params.upper],
            constants: _immutables(),
            liquidityMinted: 0
        });
        cache = MintCall.perform(params, cache, tickMap, ticks, samples);
        positions[params.lower][params.upper] = cache.position;
        poolState = cache.pool; 
    }

    function burn(
        BurnParams memory params
    ) external lock {
        BurnCache memory cache = BurnCache({
            pool: poolState,
            position: positions[params.lower][params.upper],
            constants: _immutables(),
            amount0: 0,
            amount1: 0
        });
        cache = BurnCall.perform(params, cache, tickMap, ticks, samples);
        poolState = cache.pool;
        positions[params.lower][params.upper] = cache.position;
    }

    function swap(
        SwapParams memory params
    ) external override lock returns(
        int256,
        int256
    )
    {
        if (params.amountIn == 0) return (0,0);
        SwapCache memory cache;
        cache.pool = poolState;
        cache.constants = _immutables();
        poolState = SwapCall.perform(params, cache, tickMap, ticks, samples);
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
        QuoteParams memory params
    ) external view override returns (
        uint256,
        uint256,
        uint160
    ) {
        // quote with low price limit
        PoolState memory pool = poolState;
        SwapCache memory cache;
        cache.pool = poolState;
        cache.constants = _immutables();
        // take fee from inputAmount
        (pool, cache) = Ticks.quote(
            ticks,
            tickMap,
            params,
            cache,
            pool
        );
        return (
            params.amountIn - cache.input,
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
            token0,
            token1,
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
