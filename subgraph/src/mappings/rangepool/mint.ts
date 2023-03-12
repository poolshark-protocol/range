import {
    BigInt,
    Bytes,
} from '@graphprotocol/graph-ts'
import {
    safeLoadRangePool,
    safeLoadPosition,
    safeLoadTick,
    safeLoadToken,
} from '../utils/loads'
import { Position } from '../../../generated/schema'
import { Burn, Mint } from '../../../generated/RangePoolFactory/RangePool'

export function handleMint(event: Mint): void {
    let ownerParam = event.params.owner.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper 
    let liquidityMintedParam = event.params.liquidityMinted
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadLowerTick = safeLoadTick(
        poolAddress,
        lower
    )
    let loadUpperTick = safeLoadTick(
        poolAddress,
        upper
    )
    let loadPosition = safeLoadPosition(
        poolAddress,
        ownerParam,
        lower,
        upper
    )
    let loadRangePool = safeLoadRangePool(poolAddress)

    let position = loadPosition.entity
    let pool = loadRangePool.entity
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    if (!loadPosition.exists) {
        position.lower = lower
        position.upper = upper
        position.owner = Bytes.fromHexString(ownerParam) as Bytes
        position.createdAtBlockNumber = event.block.number
        position.createdAtTimestamp = event.block.timestamp
    }
    position.liquidity = position.liquidity.plus(liquidityMintedParam)
    position.save()
    lowerTick.save()
    upperTick.save()
}

export function handleMintFungible(event: Mint): void {
    let ownerParam = event.params.owner.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper 
    let liquidityMintedParam = event.params.liquidityMinted
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadLowerTick = safeLoadTick(
        poolAddress,
        lower
    )
    let loadUpperTick = safeLoadTick(
        poolAddress,
        upper
    )
    let loadPosition = safeLoadPosition(
        poolAddress,
        ownerParam,
        lower,
        upper
    )
    let loadRangePool = safeLoadRangePool(poolAddress)

    let position = loadPosition.entity
    let pool = loadRangePool.entity
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    if (!loadPosition.exists) {
        position.lower = lower
        position.upper = upper
        position.owner = Bytes.fromHexString(ownerParam) as Bytes
        position.createdAtBlockNumber = event.block.number
        position.createdAtTimestamp = event.block.timestamp
    }
    position.liquidity = position.liquidity.plus(liquidityMintedParam)
    position.save()
    lowerTick.save()
    upperTick.save()
}
