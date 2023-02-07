// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import './interfaces/IRangePoolERC20.sol';

contract RangePoolERC20 is IRangePoolERC20, ERC20Permit {
    address owner;
    uint8 _decimals;
    
    error OnlyOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(
    ) ERC20('Poolshark Range LP', 'RANGE') ERC20Permit('Poolshark Range LP')
     {
        owner = msg.sender;
        _decimals = 18;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}