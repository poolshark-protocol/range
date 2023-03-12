import { store } from "@graphprotocol/graph-ts"
import { Burn } from "../../../generated/RangePoolFactory/RangePool"
import { safeLoadPosition, safeLoadRangePool } from "../utils/loads"
import {
    BigInt,
    Bytes,
} from '@graphprotocol/graph-ts'

export function handleBurn(event: Burn): void {
    let ownerParam = event.params.owner.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper
    let liquidityBurnedParam = event.params.liquidityBurned
    let poolAddress = event.address.toHex()
    let senderParam = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadPosition = safeLoadPosition(
        poolAddress,
        ownerParam,
        lower,
        upper
    )
    let loadRangePool = safeLoadRangePool(poolAddress)

    let position = loadPosition.entity
    let pool = loadRangePool.entity

    if (!loadPosition.exists) {
        //throw an error
    }
    if (position.liquidity == liquidityBurnedParam) {
        store.remove('Position', position.id)
    } else {
        position.liquidity = position.liquidity.minus(liquidityBurnedParam)
    }
    position.save()
}