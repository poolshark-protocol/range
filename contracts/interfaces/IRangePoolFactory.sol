// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import './IRangePoolAdmin.sol';

abstract contract IRangePoolFactory {
    IRangePoolAdmin public _owner;
    
    mapping(bytes32 => address) public rangePools;

    event RangePoolCreated(
        address indexed token0,
        address indexed token1,
        uint24 indexed fee,
        address pool
    );

    function createRangePool(
        address fromToken,
        address destToken,
        uint16 fee,
        uint160 startPrice
    ) external virtual returns (address book);

    function getRangePool(
        address fromToken,
        address destToken,
        uint256 fee
    ) external view virtual returns (address);

    function owner() external view virtual returns(address);
}
