// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../../interfaces/IRangePoolFactory.sol';
import '../../interfaces/IRangePoolERC1155.sol';
import '../../interfaces/IRangePool.sol';
import '../../interfaces/IRangePoolManager.sol';
import '../../utils/RangePoolErrors.sol';

abstract contract RangePoolStorage is IRangePoolStructs, IRangePool {
    PoolState public poolState;
    IRangePoolManager public owner;
    TickMap public tickMap;
    //TODO: convert to mapping
    TwapSample[65535] public twapSamples;
    mapping(int24 => Tick) public ticks;        /// @dev - liquidity and fee data
    //TODO: no address needed if all are owned by the pool
    mapping(address => mapping(int24 => mapping(int24 => Position))) public positions; /// @dev - nonfungible positions
}
