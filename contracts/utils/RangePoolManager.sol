// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (access/Ownable.sol)

pragma solidity ^0.8.0;

import '../interfaces/IRangePool.sol';
import '../interfaces/IRangePoolManager.sol';
import '../base/events/RangePoolManagerEvents.sol';

/**
 * @dev Defines the actions which can be executed by the factory admin.
 */
contract RangePoolManager is 
    IRangePoolManager,
    RangePoolManagerEvents
{
    address public _owner;
    address private _feeTo;
    address private _factory;
    uint16 internal constant MAX_FEE = 1e4; // @dev - max fee of 1%

    mapping(uint16 => int24)   public feeTiers;
    mapping(address => uint16) public protocolFees;

    error OwnerOnly();
    error FeeToOnly();
    error FeeTierAlreadyEnabled();
    error TransferredToZeroAddress();
    error FeeTierTickSpacingInvalid();
    error ProtocolFeeMaxExceeded();
    
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
     * @dev Returns the address of the current feeTo.
     */
    function feeTo() public view virtual returns (address) {
        return _feeTo;
    }

    function factory() public view virtual returns (address) {
        return _factory;
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
        if(tickSpacing <= 0 || tickSpacing >= 16384) revert FeeTierTickSpacingInvalid();
        feeTiers[swapFee] = tickSpacing;
        emit FeeTierEnabled(swapFee, tickSpacing);
    }

    function setFactory(
        address factory_
    ) external onlyOwner {
        emit FactoryChanged(_factory, factory_);
        _factory = factory_;
    }

    function setTopPools(
        address[] calldata removePools,
        address[] calldata addPools,
        uint16 protocolFee
    ) external onlyOwner {
        if (protocolFee > MAX_FEE) revert ProtocolFeeMaxExceeded();
        uint128[] memory token0Fees = new uint128[](removePools.length);
        uint128[] memory token1Fees = new uint128[](removePools.length);
        for (uint i; i < removePools.length; i++) {
            (token0Fees[i], token1Fees[i]) = IRangePool(removePools[i]).fees(0, true); 
        }
        if (removePools.length > 0) {
            emit ProtocolFeeUpdated(removePools, protocolFee);
            emit ProtocolFeeCollected(removePools, token0Fees, token1Fees);
        }
        token0Fees = new uint128[](addPools.length);
        token1Fees = new uint128[](addPools.length);
        for (uint i; i < addPools.length; i++) {
            (token0Fees[i], token1Fees[i]) = IRangePool(addPools[i]).fees(protocolFee, true);
        }
        if (addPools.length > 0) {
            emit ProtocolFeeUpdated(removePools, protocolFee);
            emit ProtocolFeeCollected(removePools, token0Fees, token1Fees);
        }
    }

    function collectTopPools(
        address[] calldata collectPools
    ) external onlyFeeTo {
        uint128[] memory token0Fees = new uint128[](collectPools.length);
        uint128[] memory token1Fees = new uint128[](collectPools.length);
        for (uint i; i < collectPools.length; i++) {
            (token0Fees[i], token1Fees[i]) = IRangePool(collectPools[i]).fees(0, false);
            emit ProtocolFeeCollected(collectPools, token0Fees, token1Fees);
        }
    }
}
