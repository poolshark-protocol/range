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
    mapping(int24 => Tick) public ticks;        /// @dev - liquidity and fee data
    mapping(address => mapping(int24 => mapping(int24 => Position))) public positions; /// @dev - nonfungible positions
}
