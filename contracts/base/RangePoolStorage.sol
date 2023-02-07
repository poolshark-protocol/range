// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import "../interfaces/IRangePoolStructs.sol";
import "../interfaces/IRangePoolFactory.sol";
import "../utils/RangePoolErrors.sol";

abstract contract RangePoolStorage is IRangePoolStructs, RangePoolErrors {
    PoolState public poolState;

    address public feeTo;
    mapping(int24 => Tick) public ticks; /// @dev Ticks containing token1 as output
    mapping(address => mapping(int24 => mapping(int24 => Position)))
        public positions; //nonfungible positions
}
