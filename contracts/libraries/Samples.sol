// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import './TickMath.sol';
import '../interfaces/IRangePool.sol';
import '../interfaces/IRangePoolStructs.sol';

library Samples {

    error InvalidSampleLength();
    error SampleArrayUninitialized();
    error SampleLengthNotAvailable();

    event SampleRecorded(
        int56 tickSecondsAccum,
        uint160 secondsPerLiquidityAccum
    );

    event SampleLengthIncreased(
        uint16 sampleLengthNext
    );

    function initialize(
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state
    ) internal returns (
        IRangePoolStructs.PoolState memory
    )
    {
        samples[0] = IRangePoolStructs.Sample({
            blockTimestamp: uint32(block.timestamp),
            tickSecondsAccum: 0,
            secondsPerLiquidityAccum: 0
        });

        state.samples.length = 1;
        state.samples.lengthNext = 5;

        return state;
        /// @dev - TWAP length of 5 is safer for oracle manipulation
    }

    function save(
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state,
        int24  tick
    ) internal returns (
        uint16 sampleIndexNew,
        uint16 sampleLengthNew
    ) {
        // grab the latest sample
        IRangePoolStructs.Sample memory newSample = samples[state.samples.index];

        // early return if timestamp has not advanced 2 seconds
        if (newSample.blockTimestamp + 2 > uint32(block.timestamp))
            return (state.samples.index, state.samples.length);

        if (state.samples.lengthNext > state.samples.length
            && state.samples.index == (state.samples.length - 1)) {
            // increase sampleLengthNew if old size exceeded
            sampleLengthNew = state.samples.lengthNext;
        } else {
            sampleLengthNew = state.samples.length;
        }
        sampleIndexNew = (state.samples.index + 1) % sampleLengthNew;
        samples[sampleIndexNew] = _build(newSample, uint32(block.timestamp), tick, state.liquidity);

        emit SampleRecorded(
            samples[sampleIndexNew].tickSecondsAccum,
            samples[sampleIndexNew].secondsPerLiquidityAccum
        );
    }

    function expand(
        IRangePoolStructs.Sample[65535] storage samples,
        IRangePoolStructs.PoolState memory state,
        uint16 sampleLengthNext
    ) internal returns (
        IRangePoolStructs.PoolState memory
    ) {
        if (sampleLengthNext <= state.samples.lengthNext) return state;
        for (uint16 i = state.samples.lengthNext; i < sampleLengthNext; i++) {
            samples[i].blockTimestamp = 1;
        }
        state.samples.lengthNext = sampleLengthNext;
        emit SampleLengthIncreased(sampleLengthNext);
        return state;
    }

    function get(
        address pool,
        IRangePoolStructs.SampleParams memory params
    ) internal view returns (
        int56[]   memory tickSecondsAccum,
        uint160[] memory secondsPerLiquidityAccum,
        uint160 averagePrice,
        uint128 averageLiquidity,
        int24 averageTick
    ) {
        if (params.sampleLength == 0) require(false, 'InvalidSampleLength()');
        uint256 secondsAgoLength = params.secondsAgo.length;
        if (secondsAgoLength == 0) require(false, 'SecondsAgoArrayEmpty()');

        tickSecondsAccum = new int56[](params.secondsAgo.length);
        secondsPerLiquidityAccum = new uint160[](params.secondsAgo.length);

        if (params.secondsAgo.length == 1) params.secondsAgo[1] = params.secondsAgo[0] + 2;

        for (uint256 i = 0; i < secondsAgoLength; i++) {
            if (i > 0 && params.secondsAgo[i] <= params.secondsAgo[i-1]) require(false, 'SecondsAgoArrayOutOfOrder()');
            (
                tickSecondsAccum[i],
                secondsPerLiquidityAccum[i]
            ) = getSingle(
                IRangePool(pool),
                params,
                params.secondsAgo[i]
            );
        }
        averageTick = int24((tickSecondsAccum[secondsAgoLength - 1] - tickSecondsAccum[0]) 
                                / int32(params.secondsAgo[secondsAgoLength - 1] - params.secondsAgo[0]));
        averagePrice = TickMath.getSqrtRatioAtTick(averageTick);
        averageLiquidity = uint128((secondsPerLiquidityAccum[secondsAgoLength - 1] - secondsPerLiquidityAccum[0]) 
                                   / (params.secondsAgo[secondsAgoLength - 1] - params.secondsAgo[0]));
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

    function getSingle(
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
        //(sample1.tickSecondsAccum - sample2.tickSecondsAccum) / (time2 - time1)
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
        uint256 oldIndex = (sampleIndex + 1) % sampleLength;
        uint256 newIndex = oldIndex + sampleLength - 1;             
        uint256 index;
        while (true) {
            // start in the middle
            index = (oldIndex + newIndex) / 2;

            // get the first sample
            firstSample = _poolSample(pool, index % sampleLength);

            // if sample is uninitialized
            if (firstSample.blockTimestamp == 0) {
                // skip this index and continue
                oldIndex = index + 1;
                continue;
            }
            // else grab second sample
            secondSample = _poolSample(pool, (index + 1) % sampleLength);

            // check if target time within first and second sample
            bool targetAfterFirst   = _lte(firstSample.blockTimestamp, targetTime);
            bool targetBeforeSecond = _lte(targetTime, secondSample.blockTimestamp);
            if (targetAfterFirst && targetBeforeSecond) break;
            if (!targetAfterFirst) newIndex = index - 1;
            else oldIndex = index + 1;
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
        if(!_lte(firstSample.blockTimestamp, targetTime)) require(false, 'SampleLengthNotAvailable()');

        return _binarySearch(
            pool,
            targetTime,
            params.sampleIndex,
            params.sampleLength
        );
    }
}