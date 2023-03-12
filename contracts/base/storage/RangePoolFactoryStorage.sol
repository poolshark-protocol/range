// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../../interfaces/IRangePoolAdmin.sol';

abstract contract RangePoolFactoryStorage {
    IRangePoolAdmin public _owner;
    mapping(bytes32 => address) public rangePools;
}