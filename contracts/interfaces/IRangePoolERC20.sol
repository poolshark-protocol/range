// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol';

interface IRangePoolERC20 is IERC20, IERC20Permit {
    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
