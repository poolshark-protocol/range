// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../interfaces/IRangePool.sol';
import '../interfaces/IRangePoolStructs.sol';

library Samples {

    error InvalidSampleLength();
    error SampleLengthNotAvailable();

    function initialize(
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state
    ) external returns (
        IRangePoolStructs.PoolState memory
    )
    {
        samples[0] = IRangePoolStructs.Sample({
            blockTimestamp: uint32(block.timestamp),
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });

        state.sampleLength = 1;
        state.sampleLengthNext = 5;

        return state;
        /// @dev - TWAP length of 5 is safer for oracle manipulation
    }

    function save(
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state,
        int24  tick
    ) external returns (
        uint16 sampleIndexNew,
        uint16 sampleLengthNew
    ) {
        // grab the latest sample
        IRangePoolStructs.Sample memory newSample = samples[state.sampleIndex];

        // early return if sample already created this block
        if (newSample.blockTimestamp == uint32(block.timestamp))
            return (state.sampleIndex, state.sampleLength);

        if (state.sampleLengthNext > state.sampleLength
            && state.sampleIndex == (state.sampleLength - 1)) {
            // increase sampleLengthNew if old size exceeded
            sampleLengthNew = state.sampleLengthNext;
        } else {
            sampleLengthNew = state.sampleLength;
        }
        sampleIndexNew = (state.sampleIndex + 1) % sampleLengthNew;
        samples[sampleIndexNew] = _build(newSample, uint32(block.timestamp), tick, state.liquidity);
    }

    function sample(
        address pool,
        IRangePoolStructs.SampleParams memory params
    ) external view returns (
        int56[]   memory tickSecondsAccum,
        uint160[] memory secondsPerLiquidityAccum
    ) {
        if (params.sampleLength == 0) revert InvalidSampleLength();

        tickSecondsAccum = new int56[](params.secondsAgos.length);
        secondsPerLiquidityAccum = new uint160[](params.secondsAgos.length);

        for (uint256 i = 0; i < params.secondsAgos.length; i++) {
            (
                tickSecondsAccum[i],
                secondsPerLiquidityAccum[i]
            ) = _getSample(
                IRangePool(pool),
                params,
                params.secondsAgos[i]
            );
        }
    }

    function _poolSample(
        IRangePool pool,
        uint256 sampleIndex
    ) internal view returns (
        IRangePoolStructs.Sample memory
    ) {
        (
            uint32 blockTimestamp,
            int56 tickSecondsAccum,
            uint160 liquidityPerSecondsAccum
        ) = pool.samples(sampleIndex);

        return IRangePoolStructs.Sample(
            blockTimestamp,
            tickSecondsAccum,
            liquidityPerSecondsAccum
        );
    }

    function _getSample(
        IRangePool pool,
        IRangePoolStructs.SampleParams memory params,
        uint32 secondsAgo
    ) internal view returns (
        int56   tickSecondsAccum,
        uint160 secondsPerLiquidityAccum
    ) {
        IRangePoolStructs.Sample memory latest = _poolSample(pool, params.sampleIndex);

        if (secondsAgo == 0) {
            if (latest.blockTimestamp != uint32(block.timestamp)) {
                latest = _build(
                    latest,
                    uint32(block.timestamp),
                    params.tick,
                    params.liquidity
                );
            } 
            return (
                latest.tickSecondsAccum,
                latest.secondsPerLiquidityAccum
            );
        }

        uint32 targetTime = uint32(block.timestamp) - secondsAgo;

        (
            IRangePoolStructs.Sample memory firstSample,
            IRangePoolStructs.Sample memory secondSample
        ) = _getAdjacentSamples(
                pool,
                latest,
                params,
                targetTime
        );

        if (targetTime == firstSample.blockTimestamp) {
            // first sample
            return (
                firstSample.tickSecondsAccum,
                firstSample.secondsPerLiquidityAccum
            );
        } else if (targetTime == secondSample.blockTimestamp) {
            // second sample
            return (
                secondSample.tickSecondsAccum,
                secondSample.secondsPerLiquidityAccum
            );
        } else {
            // average two samples
            int32 sampleTimeDelta = int32(secondSample.blockTimestamp - firstSample.blockTimestamp);
            int56 targetDelta = int56(int32(targetTime - firstSample.blockTimestamp));
            return (
                firstSample.tickSecondsAccum +
                    ((secondSample.tickSecondsAccum - firstSample.tickSecondsAccum) 
                    / sampleTimeDelta)
                    * targetDelta,
                firstSample.secondsPerLiquidityAccum +
                    uint160(
                        (uint256(
                            secondSample.secondsPerLiquidityAccum - firstSample.secondsPerLiquidityAccum
                        ) 
                        * uint256(uint56(targetDelta))) 
                        / uint32(sampleTimeDelta)
                    )
            );
        }
    }

    function _lte(
        uint32 timeA,
        uint32 timeB
    ) private view returns (bool) {
        uint32 currentTime = uint32(block.timestamp);
        if (timeA <= currentTime && timeB <= currentTime) return timeA <= timeB;

        uint256 timeAOverflow = timeA;
        uint256 timeBOverflow = timeB;

        if (timeA <= currentTime) {
            timeAOverflow = timeA + 2**32;
        }
        if (timeB <= currentTime) {
            timeBOverflow = timeB + 2**32;
        }

        return timeAOverflow <= timeBOverflow;
    }

    function _build(
        IRangePoolStructs.Sample memory newSample,
        uint32  blockTimestamp,
        int24   tick,
        uint128 liquidity
    ) internal pure returns (
         IRangePoolStructs.Sample memory
    ) {
        int56 timeDelta = int56(uint56(blockTimestamp - newSample.blockTimestamp));
        return
            IRangePoolStructs.Sample({
                blockTimestamp: blockTimestamp,
                tickSecondsAccum: newSample.tickSecondsAccum + int56(tick) * int32(timeDelta),
                secondsPerLiquidityAccum: newSample.secondsPerLiquidityAccum +
                    ((uint160(uint56(timeDelta)) << 128) / (liquidity > 0 ? liquidity : 1))
            });
    }

    function _binarySearch(
        IRangePool pool,
        uint32 targetTime,
        uint16 sampleIndex,
        uint16 sampleLength
    ) private view returns (
        IRangePoolStructs.Sample memory firstSample,
        IRangePoolStructs.Sample memory secondSample
    ) {
        uint256 l = (sampleIndex + 1) % sampleLength;
        uint256 r = l + sampleLength - 1;             
        uint256 i;
        while (true) {
            i = (l + r) / 2;

            firstSample = _poolSample(pool, i % sampleLength);

            if (firstSample.blockTimestamp == 0) {
                l = i + 1;
                continue;
            }
            secondSample = _poolSample(pool, (i + 1) % sampleLength);

            bool targetAtOrAfter = _lte(firstSample.blockTimestamp, targetTime);
            if (targetAtOrAfter 
                && _lte(targetTime, secondSample.blockTimestamp)) break;
            if (!targetAtOrAfter) r = i - 1;
            else l = i + 1;
        }
    }

    function _getAdjacentSamples(
        IRangePool pool,
        IRangePoolStructs.Sample memory firstSample,
        IRangePoolStructs.SampleParams memory params,
        uint32 targetTime
    ) private view returns (
        IRangePoolStructs.Sample memory,
        IRangePoolStructs.Sample memory
    ) {
        if (_lte(firstSample.blockTimestamp, targetTime)) {
            if (firstSample.blockTimestamp == targetTime) {
                return (firstSample, IRangePoolStructs.Sample(0,0,0));
            } else {
                return (firstSample, _build(firstSample, targetTime, params.tick, params.liquidity));
            }
        }
        firstSample = _poolSample(pool, (params.sampleIndex + 1) % params.sampleLength);
        if (firstSample.blockTimestamp == 0) {
            firstSample = _poolSample(pool, 0);
        }
        if(!_lte(firstSample.blockTimestamp, targetTime)) revert SampleLengthNotAvailable();

        return _binarySearch(
            pool,
            targetTime,
            params.sampleIndex,
            params.sampleLength
        );
    }
}