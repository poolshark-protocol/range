// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../interfaces/IRangePoolStructs.sol';

library TwapSamples {
    function initialize(
        IRangePoolStructs.TwapSample[65535] storage samples,
        uint32 startBlockTimestamp
    ) internal returns (
        uint16 cardinality,
        uint16 cardinalityNext
    )
    {
        samples[0] = IRangePoolStructs.TwapSample({
            blockTimestamp: startBlockTimestamp,
            tickSecondsSum: 0,
            secondsPerLiquiditySum: 0
        });
        return (1, 5); /// @dev - TWAP length of 5 is safer for oracle manipulation
    }

    function save(
        IRangePoolStructs.TwapSample[65535] storage samples,
        uint16 sampleIndex,
        uint16 sampleLength,
        uint16 sampleLengthNext,
        int24  tick,
        uint32 blockTimestamp,
        uint128 liquidity
    ) internal returns (
        uint16 sampleIndexNew,
        uint16 sampleLengthNew
    ) {
        IRangePoolStructs.TwapSample memory newSample = samples[sampleIndex];

        if (newSample.blockTimestamp == blockTimestamp) 
            return (sampleIndex, sampleLength);

        if (sampleLengthNext > sampleLength
            && sampleIndex == (sampleLength - 1)) {
            sampleLengthNew = sampleLengthNext;
        } else {
            sampleLengthNew = sampleLength;
        }
        sampleIndexNew = (sampleIndex + 1) % sampleLengthNew;
        samples[sampleIndexNew] = _build(newSample, blockTimestamp, tick, liquidity);
    }

    function _build(
        IRangePoolStructs.TwapSample memory newSample,
        uint32  blockTimestamp,
        int24   tick,
        uint128 liquidity
    ) internal pure returns (
         IRangePoolStructs.TwapSample memory
    ) {
        int56 timeDelta = int56(uint56(blockTimestamp - newSample.blockTimestamp));
        return
            IRangePoolStructs.TwapSample({
                blockTimestamp: blockTimestamp,
                tickSecondsSum: newSample.tickSecondsSum + int56(tick) * int32(timeDelta),
                secondsPerLiquiditySum: newSample.secondsPerLiquiditySum +
                    ((uint160(uint56(timeDelta)) << 128) / (liquidity > 0 ? liquidity : 1))
            });
    }
}