// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.13;

import '../interfaces/IPool.sol';
import '../interfaces/callbacks/IPoolsharkSwapCallback.sol';
import '../libraries/utils/SafeTransfersLib.sol';
import '../base/PoolsharkStructs.sol';

contract PoolRouter is
    IPoolsharkSwapCallback,
    PoolsharkStructs
{
    address public immutable factory;

    struct SwapCallbackData {
        address sender;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    /// @inheritdoc IPoolsharkSwapCallback
    function poolsharkSwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        address token0 = IPool(msg.sender).token0();
        address token1 = IPool(msg.sender).token1();
        SwapCallbackData memory _data = abi.decode(data, (SwapCallbackData));
        if (amount0Delta < 0) {
            SafeTransfersLib.transferInto(token0, _data.sender, uint256(-amount0Delta));
        } else {
            SafeTransfersLib.transferInto(token1, _data.sender, uint256(-amount1Delta));
        }
    }

    function multiCall(
        address[] memory pools,
        SwapParams[] memory params 
    ) external {
        if (pools.length != params.length) require(false, 'InputArrayLengthsMismatch()');
        for (uint i = 0; i < pools.length; i++) {
            params[i].callbackData = abi.encode(SwapCallbackData({sender: msg.sender}));
            IPool(pools[i]).swap(params[i]);
        }
    }
}