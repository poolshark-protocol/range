import { FeeTierEnabled, FeeToTransfer, OwnerTransfer, ProtocolFeeCollected, ProtocolFeeUpdated } from '../../generated/RangePoolAdmin/RangePoolAdmin'
import { safeLoadFeeTier, safeLoadManager } from './utils/loads'

export function handleFeeTierEnabled(event: FeeTierEnabled): void {
    let swapFeeParam     = event.params.swapFee
    let tickSpacingParam = event.params.tickSpacing

    let loadFeeTier = safeLoadFeeTier(swapFeeParam)

    let feeTier = loadFeeTier.entity

    if(!loadFeeTier.exists) {
        feeTier.tickSpacing = tickSpacingParam
        feeTier.createdAtTimestamp = event.block.timestamp
        feeTier.createdAtBlockNumber = event.block.number
    }
    feeTier.save()
}

export function handleFeeToTransfer(event: FeeToTransfer): void {
    let previousFeeToParam = event.params.previousFeeTo
    let newFeeToParam      = event.params.newFeeTo

    let loadManager = safeLoadManager(event.address.toHex())

    let manager = loadManager.entity

    if(!loadManager.exists) {
        manager.feeTo = newFeeToParam
    }
}

export function handleOwnerTransfer(event: OwnerTransfer): void {
    let previousOwnerParam = event.params.previousOwner
    let newOwnerParam      = event.params.newOwner

    let loadManager = safeLoadManager(event.address.toHex())

    let manager = loadManager.entity

    if(!loadManager.exists) {
        manager.owner = newOwnerParam
    }
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
}

export function handleProtocolFeeUpdated(event: ProtocolFeeUpdated): void {
}