// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

import './interfaces/IRangePool.sol';
import './interfaces/IRangePoolAdmin.sol';

/**
 * @dev Defines the actions which can be executed by the factory admin.
 */
contract RangePoolAdmin is IRangePoolAdmin {
    address public _owner;
    address private _feeTo;

    mapping(uint16 => int24) public feeTierTickSpacing;
    mapping(address => uint16) public protocolFees;

    error OwnerOnly();
    error FeeToOnly();
    error TransferredToZeroAddress();

    event FeeTierEnabled(uint16 swapFee, int24 tickSpacing);
    event OwnerTransfer(address indexed previousOwner, address indexed newOwner);
    event FeeToTransfer(address indexed previousFeeTo, address indexed newFeeTo);
    
    constructor() {
        _owner = msg.sender;
        _feeTo = msg.sender;
        emit OwnerTransfer(address(0), msg.sender);

        feeTierTickSpacing[500] = 10;
        emit FeeTierEnabled(500, 10);

        feeTierTickSpacing[3000] = 60;
        emit FeeTierEnabled(3000, 60);

        feeTierTickSpacing[10000] = 200;
        emit FeeTierEnabled(10000, 200);
    }
    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    modifier onlyFeeTo() {
        _checkFeeTo();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function feeTo() public view virtual returns (address) {
        return _feeTo;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != msg.sender) revert OwnerOnly();
    }

    /**
     * @dev Throws if the sender is not the feeTo.
     */
    function _checkFeeTo() internal view virtual {
        if (feeTo() != msg.sender) revert FeeToOnly();
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if(newOwner == address(0)) revert TransferredToZeroAddress();
        _transferOwnership(newOwner);
    }

    function transferFeeTo(address newFeeTo) public virtual onlyFeeTo {
        if(newFeeTo == address(0)) revert TransferredToZeroAddress();
        _transferFeeTo(newFeeTo);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnerTransfer(oldOwner, newOwner);
    }

    /**
     * @dev Transfers fee collection to a new account (`newFeeTo`).
     * Internal function without access restriction.
     */
    function _transferFeeTo(address newFeeTo) internal virtual {
        address oldFeeTo = _feeTo;
        _feeTo = newFeeTo;
        emit OwnerTransfer(oldFeeTo, newFeeTo);
    }

    function setTopPools(
        address[] calldata removePools,
        address[] calldata addPools,
        uint16 protocolFee
    ) external onlyOwner {
        for (uint i; i < removePools.length; i++) {
            protocolFees[removePools[i]] = 0;
        }
        for (uint i; i < removePools.length; i++) {
            protocolFees[addPools[i]] = protocolFee;
        }
    }

    function collectRangePools(
        address[] calldata collectPools
    ) external onlyFeeTo {
        for (uint i; i < collectPools.length; i++) {
            IRangePool(collectPools[i]).collectFees();
        }
    }
    // loop over each pool in the list and set protocol fee on old pools and new pools
    // can call the mapping on the factory to get the protocol fee instead of updating it on the pool
}