//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';

contract Token20 is ERC20, ERC20Burnable {
    uint8 _decimals;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 decimals_
    ) ERC20(tokenName, tokenSymbol) {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setDecimals(uint8 decimals_) public {
        _decimals = decimals_;
    }
}
