// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import '../../interfaces/IRangePoolStructs.sol';
import '../../interfaces/IRangePoolFactory.sol';
import '../../interfaces/IRangePoolERC20.sol';
import '../../interfaces/IRangePool.sol';
import '../../interfaces/IRangePoolAdmin.sol';
import '../../utils/RangePoolErrors.sol';

abstract contract RangePoolStorage is IRangePoolStructs, IRangePool {
    PoolState public poolState;
    IRangePoolAdmin internal _owner;
    mapping(int24 => Tick) public ticks; /// @dev Ticks with liquidity and fee data
    mapping(address => mapping(int24 => mapping(int24 => Position))) public positions; /// @dev - nonfungible positions
    mapping(int24 => mapping(int24 => IRangePoolERC20)) public tokens; /// @dev - fungible positions
}
