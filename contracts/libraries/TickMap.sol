// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './TickMath.sol';
import '../interfaces/IRangePoolStructs.sol';
import 'hardhat/console.sol';

library TickMap {

    error TickIndexOverflow();
    error TickIndexUnderflow();
    error BlockIndexOverflow();

    function set(
        IRangePoolStructs.TickMap storage tickMap,
        int24 tick
    ) external returns (
        bool exists
    )    
    {
        (
            uint256 tickIndex,
            uint256 wordIndex,
            uint256 blockIndex
        ) = getIndices(tick);

        // check if bit is already set
        uint256 word = tickMap.ticks[wordIndex] | 1 << (tickIndex & 0xFF);
        if (word == tickMap.ticks[wordIndex]) {
            return true;
        }

        tickMap.ticks[wordIndex]     = word; 
        tickMap.words[blockIndex]   |= 1 << (wordIndex & 0xFF); // same as modulus 255
        tickMap.blocks              |= 1 << blockIndex;
        return false;
    }

    function unset(
        IRangePoolStructs.TickMap storage tickMap,
        int24 tick
    ) external {
        (
            uint256 tickIndex,
            uint256 wordIndex,
            uint256 blockIndex
        ) = getIndices(tick);

        tickMap.ticks[wordIndex] &= ~(1 << (tickIndex & 0xFF));
        if (tickMap.ticks[wordIndex] == 0) {
            tickMap.words[blockIndex] &= ~(1 << (wordIndex & 0xFF));
            if (tickMap.words[blockIndex] == 0) {
                tickMap.blocks &= ~(1 << blockIndex);
            }
        }
    }

    function get(
        IRangePoolStructs.TickMap storage tickMap,
        int24 tick
    ) external view returns (
        bool exists
    ) {
        (
            uint256 tickIndex,
            uint256 wordIndex,
        ) = getIndices(tick);

        // check if bit is already set
        uint256 word = tickMap.ticks[wordIndex] | 1 << (tickIndex & 0xFF);
        if (word == tickMap.ticks[wordIndex]) {
            return true;
        }
        return false;
    }

    function previous(
        IRangePoolStructs.TickMap storage tickMap,
        int24 tick
    ) external view returns (
        int24 previousTick
    ) {
        unchecked {
            (
              uint256 tickIndex,
              uint256 wordIndex,
              uint256 blockIndex
            ) = getIndices(tick);

            uint256 word = tickMap.ticks[wordIndex] & ((1 << (tickIndex & 0xFF)) - 1);
            if (word == 0) {
                uint256 block_ = tickMap.words[blockIndex] & ((1 << (wordIndex & 0xFF)) - 1);
                if (block_ == 0) {
                    uint256 blockMap = tickMap.blocks & ((1 << blockIndex) - 1);
                    // assert(blockMap != 0);
                    // if blockMap == 0 return type(int24).min() or MIN_TICK

                    blockIndex = _msb(blockMap);
                    block_ = tickMap.words[blockIndex];
                }
                wordIndex = (blockIndex << 8) | _msb(block_);
                word = tickMap.ticks[wordIndex];
            }
            previousTick = _tick((wordIndex << 8) | _msb(word));
        }
    }

    function next(
        IRangePoolStructs.TickMap storage tickMap,
        int24 tick
    ) external view returns (
        int24 nextTick
    ) {
        unchecked {
            (
              uint256 tickIndex,
              uint256 wordIndex,
              uint256 blockIndex
            ) = getIndices(tick);
            uint256 word = tickMap.ticks[wordIndex] & ~((1 << ((tickIndex & 0xFF) + 1)) - 1);
            if (word == 0) {
                uint256 block_ = tickMap.words[blockIndex] & ~((1 << ((wordIndex & 0xFF) + 1)) - 1);
                if (block_ == 0) {
                    uint256 blockMap = tickMap.blocks & ~((1 << blockIndex + 1) - 1);
                    // assert(blockMap != 0);
                    //if blockMap == 0 return type(int24).max()

                    blockIndex = _lsb(blockMap);
                    block_ = tickMap.words[blockIndex];
                }
                wordIndex = (blockIndex << 8) | _lsb(block_);
                word = tickMap.ticks[wordIndex];
            }
            nextTick = _tick((wordIndex << 8) | _lsb(word));
        }
    }

    function getIndices(
        int24 tick
    ) public pure returns (
            uint256 tickIndex,
            uint256 wordIndex,
            uint256 blockIndex
        )
    {
        unchecked {
            if (tick > TickMath.MAX_TICK) revert TickIndexOverflow();
            if (tick < TickMath.MIN_TICK) revert TickIndexUnderflow();
            tickIndex = uint256(int256((tick - TickMath.MIN_TICK)));
            wordIndex = tickIndex >> 8;   // 2^8 ticks per word
            blockIndex = tickIndex >> 16; // 2^8 words per block
            if (blockIndex > 255) revert BlockIndexOverflow();
        }
    }

    function _tick (
        uint256 tickIndex
    ) internal pure returns (
        int24 tick
    ) {
        unchecked {
            if (tickIndex > uint24(TickMath.MAX_TICK * 2)) revert TickIndexOverflow();
            tick = int24(int256(tickIndex) + TickMath.MIN_TICK);
        }
    }

    function _msb(
        uint256 x
    ) internal pure returns (
        uint8 r
    ) {
        unchecked {
            assert(x > 0);
            if (x >= 0x100000000000000000000000000000000) {
                x >>= 128;
                r += 128;
            }
            if (x >= 0x10000000000000000) {
                x >>= 64;
                r += 64;
            }
            if (x >= 0x100000000) {
                x >>= 32;
                r += 32;
            }
            if (x >= 0x10000) {
                x >>= 16;
                r += 16;
            }
            if (x >= 0x100) {
                x >>= 8;
                r += 8;
            }
            if (x >= 0x10) {
                x >>= 4;
                r += 4;
            }
            if (x >= 0x4) {
                x >>= 2;
                r += 2;
            }
            if (x >= 0x2) r += 1;
        }
    }

    function _lsb(
        uint256 x
    ) internal pure returns (
        uint8 r
    ) {
        unchecked {
            assert(x > 0); // if x is 0 return 0
            r = 255;
            if (x & type(uint128).max > 0) {
                r -= 128;
            } else {
                x >>= 128;
            }
            if (x & type(uint64).max > 0) {
                r -= 64;
            } else {
                x >>= 64;
            }
            if (x & type(uint32).max > 0) {
                r -= 32;
            } else {
                x >>= 32;
            }
            if (x & type(uint16).max > 0) {
                r -= 16;
            } else {
                x >>= 16;
            }
            if (x & type(uint8).max > 0) {
                r -= 8;
            } else {
                x >>= 8;
            }
            if (x & 0xf > 0) {
                r -= 4;
            } else {
                x >>= 4;
            }
            if (x & 0x3 > 0) {
                r -= 2;
            } else {
                x >>= 2;
            }
            if (x & 0x1 > 0) r -= 1;
        }
    }
    
}