// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.13;

import './IRangePoolStructs.sol';
import './IRangePoolManager.sol';

interface IRangePool is IRangePoolStructs {
    function mint(
        MintParams memory mintParams
    ) external;

    function burn(
        BurnParams memory burnParams
    ) external;

    function swap(
        SwapParams memory params
    ) external returns (
        int256 amount0,
        int256 amount1
    );

    function quote(
        QuoteParams memory params
    ) external view returns (
        uint256 inAmount,
        uint256 outAmount,
        uint160 priceAfter
    );

    function sample(
        uint32[] memory secondsAgo
    ) external view returns (
        int56[]   memory tickSecondsAccum,
        uint160[] memory secondsPerLiquidityAccum 
    );

    function snapshot(
        SnapshotParams memory params
    ) external view returns(
        int56   tickSecondsAccum,
        uint160 secondsPerLiquidityAccum,
        uint32  secondsGrowth,
        uint128 feesOwed0,
        uint128 feesOwed1
    );

    function increaseSampleLength(
        uint16 sampleLengthNext
    ) external;

    function fees(
        uint16 protocolFee,
        bool setFee
    ) external returns (
        uint128 token0Fees,
        uint128 token1Fees
    );

    function owner() external view returns (
        address
    );

    function tickSpacing() external view returns (
        int24
    );

    function samples(uint256) external view returns (
        uint32,
        int56,
        uint160
    );

    function poolState() external view returns (
        uint8,
        uint16,
        int24,
        int56,
        uint160,
        uint160,
        uint128,
        uint128,
        uint200,
        uint200,
        SampleState memory,
        ProtocolFees memory
    );

    function ticks(int24) external view returns (
        int128,
        uint200,
        uint200,
        int56,
        uint160
    );

    function positions(int24, int24) external view returns (
        uint128,
        uint128,
        uint128,
        uint256,
        uint256
    );
}
