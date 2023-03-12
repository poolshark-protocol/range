// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

interface IRangePoolFactory {
    function createRangePool(
        address fromToken,
        address destToken,
        uint16 fee,
        uint160 startPrice
    ) external returns (address book);

    function getRangePool(
        address fromToken,
        address destToken,
        uint256 fee
    ) external view returns (address);

    function owner() external view returns(address);
}
