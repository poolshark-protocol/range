// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './TickMath.sol';
import './Ticks.sol';
import '../interfaces/IRangePoolStructs.sol';
import './PrecisionMath.sol';
import './DyDxMath.sol';

/// @notice Position management library for ranged liquidity.
library Positions {
    error NotEnoughPositionLiquidity();
    error InvalidClaimTick();
    error LiquidityOverflow();
    error WrongTickClaimedAt();
    error PositionNotUpdated();
    error InvalidLowerTick();
    error InvalidUpperTick();
    error InvalidPositionAmount();
    error InvalidPositionBoundsOrder();
    error InvalidPositionBoundsTwap();
    error NotImplementedYet();

    uint256 internal constant Q96 = 0x1000000000000000000000000;
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    using Positions for mapping(int24 => IRangePoolStructs.Tick);

    function getMaxLiquidity(int24 tickSpacing) external pure returns (uint128) {
        return type(uint128).max / uint128(uint24(TickMath.MAX_TICK) / (2 * uint24(tickSpacing)));
    }

    function validate(
        IRangePoolStructs.MintParams memory params,
        IRangePoolStructs.PoolState memory state
    ) external pure returns (IRangePoolStructs.MintParams memory, uint256 liquidityMinted) {
        //TODO: check amount is < max int128
        if (params.lower % int24(state.tickSpacing) != 0) revert InvalidLowerTick();
        if (params.lower <= TickMath.MIN_TICK) revert InvalidLowerTick();
        if (params.upper % int24(state.tickSpacing) != 0) revert InvalidUpperTick();
        if (params.upper <= TickMath.MAX_TICK) revert InvalidUpperTick();
        if (params.lower >= params.upper) revert InvalidPositionBoundsOrder();
        uint256 priceLower = uint256(TickMath.getSqrtRatioAtTick(params.lower));
        uint256 priceUpper = uint256(TickMath.getSqrtRatioAtTick(params.upper));

        liquidityMinted = DyDxMath.getLiquidityForAmounts(
            priceLower,
            priceUpper,
            state.price,
            params.amount1,
            params.amount0
        );
        //TODO: handle partial mints due to incorrect reserve ratio
        if (liquidityMinted > uint128(type(int128).max)) revert LiquidityOverflow();

        return (params, liquidityMinted);
    }

    function add(
        mapping(address => mapping(int24 => mapping(int24 => IRangePoolStructs.Position)))
            storage positions,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        IRangePoolStructs.MintParams memory params,
        uint128 amount
    ) external returns (IRangePoolStructs.PoolState memory) {
        IRangePoolStructs.PositionCache memory cache = IRangePoolStructs.PositionCache({
            position: positions[params.fungible ? msg.sender : params.to][params.lower][
                params.upper
            ],
            priceLower: TickMath.getSqrtRatioAtTick(params.lower),
            priceUpper: TickMath.getSqrtRatioAtTick(params.upper)
        });

        if (params.amount0 == 0 && params.amount1 == 0) return (state);

        Ticks.insert(
            ticks,
            state,
            params.lowerOld,
            params.lower,
            params.upperOld,
            params.upper,
            amount
        );

        cache.position.liquidity += uint128(amount);

        positions[params.fungible ? msg.sender : params.to][params.lower][params.upper] = cache
            .position;

        return (state);
    }

    function remove(
        mapping(address => mapping(int24 => mapping(int24 => IRangePoolStructs.Position)))
            storage positions,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        IRangePoolStructs.BurnParams memory params,
        address owner,
        uint128 amount0,
        uint128 amount1
    ) external returns (IRangePoolStructs.PoolState memory, uint128, uint128) {
        IRangePoolStructs.PositionCache memory cache = IRangePoolStructs.PositionCache({
            position: positions[params.to][params.lower][params.upper],
            priceLower: TickMath.getSqrtRatioAtTick(params.lower),
            priceUpper: TickMath.getSqrtRatioAtTick(params.upper)
        });

        if (params.amount == 0) return (state, amount0, amount1);

        Ticks.remove(ticks, state, params.lower, params.upper, uint128(params.amount));

        uint128 amount0Removed;
        uint128 amount1Removed;
        (amount0Removed, amount1Removed) = DyDxMath.getAmountsForLiquidity(
            cache.priceLower,
            cache.priceUpper,
            state.price,
            params.amount,
            false
        );
        amount0 += amount0Removed;
        amount1 += amount1Removed;

        cache.position.amount0 += amount0Removed;
        cache.position.amount1 += amount1Removed;
        cache.position.liquidity -= uint128(params.amount);

        positions[owner][params.lower][params.upper] = cache.position;

        return (state, amount0, amount1);
    }

    function compound(
        IRangePoolStructs.Position memory position,
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        IRangePoolStructs.CompoundParams memory params
    ) external returns (IRangePoolStructs.Position memory, IRangePoolStructs.PoolState memory) {
        uint160 priceLower = TickMath.getSqrtRatioAtTick(params.lower);
        uint160 priceUpper = TickMath.getSqrtRatioAtTick(params.upper);

        uint256 liquidityMinted = DyDxMath.getLiquidityForAmounts(
            priceLower,
            priceUpper,
            state.price,
            position.amount1,
            position.amount0
        );

        state = Ticks.insert(
            ticks,
            state,
            -887272,
            params.lower,
            887272,
            params.upper,
            uint128(liquidityMinted)
        );

        position.amount0 = 0;
        position.amount1 = 0;
        position.liquidity += uint128(liquidityMinted);

        return (position, state);
    }

    function update(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.Position memory position,
        IRangePoolStructs.PoolState memory state,
        IRangePoolStructs.UpdateParams memory params
    ) internal view returns (IRangePoolStructs.Position memory, uint128, uint128) {
        (uint256 rangeFeeGrowth0, uint256 rangeFeeGrowth1) = rangeFeeGrowth(
            ticks,
            state,
            params.lower,
            params.upper
        );

        uint128 amount0Fees = uint128(
            PrecisionMath.mulDiv(
                rangeFeeGrowth0 - position.feeGrowthInside0Last,
                position.liquidity,
                Q128
            )
        );

        uint128 amount1Fees = uint128(
            PrecisionMath.mulDiv(
                rangeFeeGrowth1 - position.feeGrowthInside1Last,
                position.liquidity,
                Q128
            )
        );

        position.feeGrowthInside0Last = rangeFeeGrowth0;
        position.feeGrowthInside1Last = rangeFeeGrowth1;

        if (params.fungible) {
            uint128 feesBurned0 = uint128(
                (uint256(amount0Fees) * uint256(uint128(params.amount))) / params.totalSupply
            );
            uint128 feesBurned1 = uint128(
                (uint256(amount1Fees) * uint256(uint128(params.amount))) / params.totalSupply
            );

            amount0Fees -= feesBurned0;
            amount1Fees -= feesBurned1;

            position.amount0 += uint128(amount0Fees);
            position.amount1 += uint128(amount1Fees);

            return (position, feesBurned0, feesBurned1);
        }
        position.amount0 += uint128(amount0Fees);
        position.amount1 += uint128(amount1Fees);

        return (position, amount0Fees, amount1Fees);
    }

    function rangeFeeGrowth(
        mapping(int24 => IRangePoolStructs.Tick) storage ticks,
        IRangePoolStructs.PoolState memory state,
        int24 lower,
        int24 upper
    ) public view returns (uint256 feeGrowthInside0, uint256 feeGrowthInside1) {
        int24 current = state.nearestTick;

        IRangePoolStructs.Tick memory lowerTick = ticks[lower];
        IRangePoolStructs.Tick memory upperTick = ticks[upper];

        uint256 _feeGrowthGlobal0 = state.feeGrowthGlobal0;
        uint256 _feeGrowthGlobal1 = state.feeGrowthGlobal1;
        uint256 feeGrowthBelow0;
        uint256 feeGrowthBelow1;
        uint256 feeGrowthAbove0;
        uint256 feeGrowthAbove1;

        if (lower <= current) {
            feeGrowthBelow0 = lowerTick.feeGrowthOutside0;
            feeGrowthBelow1 = lowerTick.feeGrowthOutside1;
        } else {
            feeGrowthBelow0 = _feeGrowthGlobal0 - lowerTick.feeGrowthOutside0;
            feeGrowthBelow1 = _feeGrowthGlobal1 - lowerTick.feeGrowthOutside1;
        }

        if (current < upper) {
            feeGrowthAbove0 = upperTick.feeGrowthOutside0;
            feeGrowthAbove1 = upperTick.feeGrowthOutside1;
        } else {
            feeGrowthAbove0 = _feeGrowthGlobal0 - upperTick.feeGrowthOutside0;
            feeGrowthAbove1 = _feeGrowthGlobal1 - upperTick.feeGrowthOutside1;
        }

        feeGrowthInside0 = _feeGrowthGlobal0 - feeGrowthBelow0 - feeGrowthAbove0;
        feeGrowthInside1 = _feeGrowthGlobal1 - feeGrowthBelow1 - feeGrowthAbove1;
    }
}
