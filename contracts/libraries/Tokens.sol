// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./PrecisionMath.sol";
import "../interfaces/IRangePoolFactory.sol";
import '../interfaces/IRangePoolManager.sol';
import "../interfaces/IRangePoolStructs.sol";

/// @notice Math library that facilitates fee handling.
library Tokens {
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function create(IRangePoolManager owner) internal returns (
        IRangePoolERC1155
    ) {
        return owner.createTokens();
    }

    function id(
        int24 lower,
        int24 upper
    ) internal pure returns (
        uint256
    )
    {
        return uint256(keccak256(abi.encode(lower, upper)));
    }

    function totalSupply(
        IRangePoolERC1155 tokens,
        int24 lower,
        int24 upper
    ) internal view returns (
        uint256
    )
    {
        return IRangePoolERC1155(tokens).totalSupply(id(lower, upper));
    }

    function totalSupplyById(
        IRangePoolERC1155 tokens,
        uint256 _id
    ) internal view returns (
        uint256
    )
    {
        return IRangePoolERC1155(tokens).totalSupply(_id);
    } 
}