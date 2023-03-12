// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

import '../interfaces/IRangePool.sol';
import '../interfaces/IRangePoolAdmin.sol';
import '../base/events/RangePoolAdminEvents.sol';

/**
 * @dev Defines the actions which can be executed by the factory admin.
 */
contract RangePoolAdmin is IRangePoolAdmin, RangePoolAdminEvents {
    address public _owner;
    address private _feeTo;

    mapping(uint16 => int24)   public feeTiers;
    mapping(address => uint16) public protocolFees;

    error OwnerOnly();
    error FeeToOnly();
    error FeeTierAlreadyEnabled();
    error TransferredToZeroAddress();
    
    constructor() {
        _owner = msg.sender;
        _feeTo = msg.sender;
        emit OwnerTransfer(address(0), msg.sender);

        feeTiers[500] = 10;
        emit FeeTierEnabled(500, 10);

        feeTiers[3000] = 60;
        emit FeeTierEnabled(3000, 60);

        feeTiers[10000] = 200;
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
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwner(address newOwner) public virtual onlyOwner {
        if(newOwner == address(0)) revert TransferredToZeroAddress();
        _transferOwner(newOwner);
    }

    function transferFeeTo(address newFeeTo) public virtual onlyFeeTo {
        if(newFeeTo == address(0)) revert TransferredToZeroAddress();
        _transferFeeTo(newFeeTo);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwner(address newOwner) internal virtual {
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

    function enableFeeTier(
        uint16 swapFee,
        int24 tickSpacing
    ) external onlyOwner {
        if (feeTiers[swapFee] != 0) {
            revert FeeTierAlreadyEnabled();
        }
        feeTiers[swapFee] = tickSpacing;
        emit FeeTierEnabled(swapFee, tickSpacing);
    }

    function setTopPools(
        address[] calldata removePools,
        address[] calldata addPools,
        uint16 protocolFee
    ) external onlyOwner {
        for (uint i; i < removePools.length; i++) {
            protocolFees[removePools[i]] = 0;
            emit ProtocolFeeUpdated(removePools[i], 0);
        }
        for (uint i; i < addPools.length; i++) {
            protocolFees[addPools[i]] = protocolFee;
            emit ProtocolFeeUpdated(addPools[i], protocolFee);
        }
    }

    function collectTopPools(
        address[] calldata collectPools
    ) external onlyFeeTo {
        for (uint i; i < collectPools.length; i++) {
            uint128 token0Fees; uint128 token1Fees;
            (token0Fees, token1Fees) = IRangePool(collectPools[i]).collectFees();
            emit ProtocolFeeCollected(collectPools[i], token0Fees, token1Fees);
        }
    }
}