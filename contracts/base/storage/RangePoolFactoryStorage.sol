// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolManager.sol';

abstract contract RangePoolFactoryStorage {
    IRangePoolManager public _owner;
    mapping(bytes32 => address) public rangePools;
}