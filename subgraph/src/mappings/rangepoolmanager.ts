import { FeeTierEnabled, FeeToTransfer, OwnerTransfer, ProtocolFeeCollected, ProtocolFeeUpdated } from '../../generated/RangePoolManager/RangePoolManager'
import { safeLoadFeeTier, safeLoadManager, safeLoadRangePoolFactory } from './utils/loads'
import { BigInt, log } from '@graphprotocol/graph-ts'
import { FactoryChanged } from '../../generated/RangePoolManager/RangePoolManager'

export function handleFeeTierEnabled(event: FeeTierEnabled): void {
    let swapFeeParam     = event.params.swapFee
    let tickSpacingParam = event.params.tickSpacing

    let loadManager = safeLoadManager(event.address.toHex())
    let loadFeeTier = safeLoadFeeTier(BigInt.fromI32(swapFeeParam))

    let manager = loadManager.entity
    let feeTier = loadFeeTier.entity

    if(!loadFeeTier.exists) {
        feeTier.feeAmount = BigInt.fromString(feeTier.id)
        feeTier.tickSpacing = BigInt.fromI32(tickSpacingParam)
        feeTier.createdAtTimestamp = event.block.timestamp
        feeTier.createdAtBlockNumber = event.block.number
        feeTier.save()
        let managerFeeTiers = manager.feeTiers
        managerFeeTiers.push(feeTier.id)
        manager.feeTiers = managerFeeTiers
        manager.save()
    } else {
        //something went wrong

    }
}

export function handleFactoryChanged(event: FactoryChanged): void {
    let loadRangePoolFactory = safeLoadRangePoolFactory(event.params.newFactory.toHex())
    let factory = loadRangePoolFactory.entity
    log.info("factory address: {}", [factory.id])
    factory.owner = event.address.toHex()
    factory.save()
}

export function handleFeeToTransfer(event: FeeToTransfer): void {
    let previousFeeToParam = event.params.previousFeeTo
    let newFeeToParam      = event.params.newFeeTo

    let loadManager = safeLoadManager(event.address.toHex())

    let manager = loadManager.entity

    if(!loadManager.exists) {
        manager.feeTo = newFeeToParam
    }
    manager.save()
}

export function handleOwnerTransfer(event: OwnerTransfer): void {
    let previousOwnerParam = event.params.previousOwner
    let newOwnerParam      = event.params.newOwner

    let loadManager = safeLoadManager(event.address.toHex())

    let manager = loadManager.entity

    if(!loadManager.exists) {
        manager.owner = newOwnerParam
        manager.feeTo = newOwnerParam
    }
    manager.save()
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
}

export function handleProtocolFeeUpdated(event: ProtocolFeeUpdated): void {
}