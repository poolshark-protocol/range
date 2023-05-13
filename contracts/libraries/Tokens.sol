// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import "./PrecisionMath.sol";
import "../interfaces/IRangePoolFactory.sol";
import "../interfaces/IRangePoolStructs.sol";

/// @notice Math library that facilitates fee handling.
library Tokens {
    uint256 internal constant Q128 = 0x100000000000000000000000000000000;

    function id(
        int24 lower,
        int24 upper
    ) internal pure returns (
        uint256
    )
    {
        return uint256(keccak256(abi.encode(lower, upper)));
    }

    function balanceOf(
        address tokens,
        address owner,
        int24 lower,
        int24 upper
    ) internal view returns (
        uint256
    )
    {
        return IRangePoolERC1155(tokens).balanceOf(owner, id(lower, upper));
    }

    function totalSupply(
        address tokens,
        int24 lower,
        int24 upper
    ) internal view returns (
        uint256
    )
    {
        return IRangePoolERC1155(tokens).totalSupply(id(lower, upper));
    }

    function totalSupplyById(
        address tokens,
        uint256 _id
    ) internal view returns (
        uint256
    )
    {
        return IRangePoolERC1155(tokens).totalSupply(_id);
    } 
}