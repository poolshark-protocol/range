import { FeeTierEnabled, FeeToTransfer, OwnerTransfer, ProtocolFeeCollected, ProtocolFeeUpdated } from '../../generated/RangePoolAdmin/RangePoolAdmin'
import { safeLoadFeeTier, safeLoadManager, safeLoadRangePoolFactory } from './utils/loads'
import { BigInt } from '@graphprotocol/graph-ts'
import { FACTORY_ADDRESS } from '../constants/constants'

export function handleFeeTierEnabled(event: FeeTierEnabled): void {
    let swapFeeParam     = event.params.swapFee
    let tickSpacingParam = event.params.tickSpacing

    let loadManager = safeLoadManager(event.address.toHex())
    let loadFeeTier = safeLoadFeeTier(BigInt.fromI32(swapFeeParam))

    let manager = loadManager.entity
    let feeTier = loadFeeTier.entity

    if(!loadFeeTier.exists) {
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
    let loadFactory = safeLoadRangePoolFactory(FACTORY_ADDRESS)

    let manager = loadManager.entity
    let factory = loadFactory.entity

    if(!loadManager.exists) {
        manager.owner = newOwnerParam
        manager.feeTo = newOwnerParam
    }
    if(!loadFactory.exists) {
        factory.owner = manager.id
    }
    manager.save()
    factory.save()
}

export function handleProtocolFeeCollected(event: ProtocolFeeCollected): void {
}

export function handleProtocolFeeUpdated(event: ProtocolFeeUpdated): void {
}