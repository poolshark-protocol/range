import {
    BigInt,
    Bytes,
} from '@graphprotocol/graph-ts'
import {
    safeLoadRangePool,
    safeLoadPosition,
    safeLoadTick,
    safeLoadToken,
    safeLoadBasePrice,
    safeLoadRangePoolFactory,
    safeLoadPositionToken,
    safeLoadPositionFraction,
} from '../utils/loads'
import { Mint, MintFungible } from '../../../generated/RangePoolFactory/RangePool'
import { convertTokenToDecimal } from '../utils/helpers'
import { ONE_BI } from '../../constants/constants'
import { updateDerivedTVLAmounts } from '../utils/tvl'

export function handleMint(event: Mint): void {
    let recipientParam = event.params.recipient.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper 
    let liquidityMintedParam = event.params.liquidityMinted
    let amount0Param = event.params.amount0
    let amoun1Param = event.params.amount1
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadBasePrice = safeLoadBasePrice('eth')
    let loadRangePool = safeLoadRangePool(poolAddress)
    let basePrice = loadBasePrice.entity
    let pool = loadRangePool.entity

    if (!loadRangePool.exists) {
        //something went wrong
    }

    let loadRangePoolFactory = safeLoadRangePoolFactory(pool.factory)
    let loadToken0 = safeLoadToken(pool.token0)
    let loadToken1 = safeLoadToken(pool.token1)
    let factory = loadRangePoolFactory.entity
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity

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
        recipientParam,
        lower,
        upper
    )
    let position = loadPosition.entity
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    if (
        pool.nearestTick !== null &&
        lower.le(pool.nearestTick) &&
        upper.gt(pool.nearestTick)
      ) {
        pool.liquidity = pool.liquidity.plus(liquidityMintedParam)
    }
    position.liquidity = position.liquidity.plus(liquidityMintedParam)

    lowerTick.liquidityDelta = lowerTick.liquidityDelta.plus(liquidityMintedParam)
    upperTick.liquidityDelta = upperTick.liquidityDelta.minus(liquidityMintedParam)
    upperTick.liquidityDeltaMinus = upperTick.liquidityDeltaMinus.plus(liquidityMintedParam)

    if (!loadPosition.exists) {
        position.lower = lower
        position.upper = upper
        position.owner = Bytes.fromHexString(recipientParam) as Bytes
        position.pool = pool.id
        position.createdAtBlockNumber = event.block.number
        position.createdAtTimestamp = event.block.timestamp
    }
    position.updatedAtBlockNumber = event.block.number
    position.updatedAtTimestamp = event.block.timestamp

    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
    let amountUsd = amount0
      .times(token0.ethPrice.times(basePrice.ethUsd))
      .plus(amount1.times(token1.ethPrice.times(basePrice.ethUsd)))
    
    token0.txnCount = token0.txnCount.plus(ONE_BI)
    token1.txnCount = token1.txnCount.plus(ONE_BI)
    pool.txnCount = pool.txnCount.plus(ONE_BI)
    factory.txnCount = factory.txnCount.plus(ONE_BI)

    let oldPoolTVLETH = pool.totalValueLockedEth
    token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
    token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
    pool.totalValueLocked0 = pool.totalValueLocked0.plus(amount0)
    pool.totalValueLocked1 = pool.totalValueLocked1.plus(amount1)
    updateDerivedTVLAmounts(pool, factory, oldPoolTVLETH)
    
    basePrice.save()
    pool.save()
    factory.save()
    token0.save()
    token1.save()
    lowerTick.save()
    upperTick.save()
    position.save()    
}

export function handleMintFungible(event: MintFungible): void {
    //TODO: fix event to emit 'recipient' and make new deployment
    let recipientParam = event.transaction.from.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper 
    let liquidityMintedParam = event.params.liquidityMinted
    //TODO: emit tokenId
    let tokenMintedParam = event.params.liquidityMinted
    let amount0Param = event.params.amount0
    let amoun1Param = event.params.amount1
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadBasePrice = safeLoadBasePrice('eth')
    let loadRangePool = safeLoadRangePool(poolAddress)
    let basePrice = loadBasePrice.entity
    let pool = loadRangePool.entity

    let loadRangePoolFactory = safeLoadRangePoolFactory(pool.factory)
    let loadToken0 = safeLoadToken(pool.token0)
    let loadToken1 = safeLoadToken(pool.token1)
    let factory = loadRangePoolFactory.entity
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity

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
        recipientParam,
        lower,
        upper
    )
    // let loadPositionToken = safeLoadPositionToken(
    //     positionTokenParam
    // )
    // let loadPositionFraction = safeLoadPositionFraction(
    //     positionTokenParam,
    //     recipientParam
    // )
    let position = loadPosition.entity
    // let positionToken = loadPositionToken.entity
    // let positionTokenFraction = loadPositionFraction.entity
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    lowerTick.liquidityDelta = lowerTick.liquidityDelta.plus(liquidityMintedParam)
    upperTick.liquidityDelta = upperTick.liquidityDelta.minus(liquidityMintedParam)
    upperTick.liquidityDeltaMinus = upperTick.liquidityDeltaMinus.plus(liquidityMintedParam)

    if (!loadPosition.exists) {
        position.lower = lower
        position.upper = upper
        position.owner = Bytes.fromHexString(recipientParam) as Bytes
        position.pool = pool.id
        position.createdAtBlockNumber = event.block.number
        position.createdAtTimestamp = event.block.timestamp
    }
    position.updatedAtBlockNumber = event.block.number
    position.updatedAtTimestamp = event.block.timestamp

    // if (!loadPositionToken.exists) {
    //     positionToken.position = position.id
    // }
    // positionToken.totalSupply = positionToken.totalSupply.plus(tokenMintedParam)

    // if (!loadPositionFraction.exists) {
    //     let positionTokenFractions = positionToken.fractions
    //     positionTokenFractions.push(positionTokenFraction.id)
    //     positionToken.fractions = positionTokenFractions
    //     positionTokenFraction.amount = positionTokenFraction.amount.plus(tokenMintedParam)
    // }
    // positionTokenFraction.updatedAtBlockNumber = event.block.number
    // positionTokenFraction.updatedAtTimestamp = event.block.timestamp

    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
    let amountUsd = amount0
      .times(token0.ethPrice.times(basePrice.ethUsd))
      .plus(amount1.times(token1.ethPrice.times(basePrice.ethUsd)))
    
    token0.txnCount = token0.txnCount.plus(ONE_BI)
    token1.txnCount = token1.txnCount.plus(ONE_BI)
    pool.txnCount = pool.txnCount.plus(ONE_BI)
    factory.txnCount = factory.txnCount.plus(ONE_BI)

    let oldPoolTVLETH = pool.totalValueLockedEth
    token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
    token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
    pool.totalValueLocked0 = pool.totalValueLocked0.plus(amount0)
    pool.totalValueLocked1 = pool.totalValueLocked1.plus(amount1)
    updateDerivedTVLAmounts(pool, factory, oldPoolTVLETH)

    if (
        pool.nearestTick !== null &&
        lower.le(pool.nearestTick) &&
        upper.gt(pool.nearestTick)
      ) {
        pool.liquidity = pool.liquidity.plus(liquidityMintedParam)
    }
    position.liquidity = position.liquidity.plus(liquidityMintedParam)
    
    basePrice.save()
    pool.save()
    factory.save()
    token0.save()
    token1.save()
    lowerTick.save()
    upperTick.save()
    position.save() 
    // positionToken.save()
    // positionTokenFraction.save()
}
