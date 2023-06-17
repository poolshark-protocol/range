import {
    Address,
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
    safeLoadMintLog,
} from '../utils/loads'
import { Mint, MintFungible } from '../../../generated/RangePoolFactory/RangePool'
import { convertTokenToDecimal } from '../utils/helpers'
import { ONE_BI } from '../../constants/constants'
import { updateDerivedTVLAmounts } from '../utils/tvl'
import { findEthPerToken } from '../utils/price'

export function handleMintFungible(event: MintFungible): void {
    //TODO: fix event to emit 'recipient' and make new deployment
    let recipientParam = event.params.recipient
    let lowerParam = event.params.lower
    let upperParam = event.params.upper 
    let liquidityMintedParam = event.params.liquidityMinted
    //TODO: emit tokenId
    let tokenIdParam = event.params.tokenId
    let tokenMintedParam = event.params.tokenMinted
    let amount0Param = event.params.amount0
    let amoun1Param = event.params.amount1
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    // log mint action
    let loadMintLog = safeLoadMintLog(event.transaction.hash, poolAddress, lower, upper)
    let mintLog = loadMintLog.entity
    if (!loadMintLog.exists) {
        mintLog.sender = msgSender
        mintLog.recipient = recipientParam
        mintLog.lower = lower
        mintLog.upper = upper
        mintLog.tokenId = tokenIdParam
        mintLog.pool = poolAddress
    }
    mintLog.tokenMinted = mintLog.tokenMinted.plus(tokenMintedParam)
    mintLog.liquidityMinted = mintLog.liquidityMinted.plus(liquidityMintedParam)
    mintLog.save()

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
        poolAddress, 
        lower,
        upper
    )
    let loadPositionToken = safeLoadPositionToken(
        poolAddress,
        tokenIdParam
    )
    let loadPositionFraction = safeLoadPositionFraction(
        poolAddress,
        tokenIdParam,
        recipientParam
    )
    let position = loadPosition.entity
    let positionToken = loadPositionToken.entity
    let positionTokenFraction = loadPositionFraction.entity
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    lowerTick.liquidityDelta = lowerTick.liquidityDelta.plus(liquidityMintedParam)
    upperTick.liquidityDelta = upperTick.liquidityDelta.minus(liquidityMintedParam)
    upperTick.liquidityDeltaMinus = upperTick.liquidityDeltaMinus.plus(liquidityMintedParam)

    if (!loadPosition.exists) {
        position.lower = lower
        position.upper = upper
        position.owner = Bytes.fromHexString(recipientParam.toHex()) as Bytes
        position.pool = pool.id
        position.createdAtBlockNumber = event.block.number
        position.createdAtTimestamp = event.block.timestamp
    }
    position.liquidity = position.liquidity.plus(liquidityMintedParam)
    position.updatedAtBlockNumber = event.block.number
    position.updatedAtTimestamp = event.block.timestamp

    if (!loadPositionToken.exists) {
        positionToken.position = position.id
        positionToken.tokenId = tokenIdParam
    }
    positionToken.totalSupply = positionToken.totalSupply.plus(tokenMintedParam)

    if (!loadPositionFraction.exists) {
        let positionTokenFractions = positionToken.fractions
        positionTokenFractions.push(positionTokenFraction.id)
        positionToken.fractions = positionTokenFractions
    }
    positionTokenFraction.amount = positionTokenFraction.amount.plus(tokenMintedParam)
    positionTokenFraction.updatedAtBlockNumber = event.block.number
    positionTokenFraction.updatedAtTimestamp = event.block.timestamp

    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
    let amountUsd = amount0
    .times(token0.ethPrice.times(basePrice.USD))
    .plus(amount1.times(token1.ethPrice.times(basePrice.USD)))
    
    token0.txnCount = token0.txnCount.plus(ONE_BI)
    token1.txnCount = token1.txnCount.plus(ONE_BI)
    pool.txnCount = pool.txnCount.plus(ONE_BI)
    factory.txnCount = factory.txnCount.plus(ONE_BI)

    // eth price updates
    token0.ethPrice = findEthPerToken(token0, token1)
    token1.ethPrice = findEthPerToken(token1, token0)
    token0.usdPrice = token0.ethPrice.times(basePrice.USD)
    token1.usdPrice = token1.ethPrice.times(basePrice.USD)

    let oldPoolTVLETH = pool.totalValueLockedEth
    token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
    token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
    pool.totalValueLocked0 = pool.totalValueLocked0.plus(amount0)
    pool.totalValueLocked1 = pool.totalValueLocked1.plus(amount1)
    let updateTvlRet = updateDerivedTVLAmounts(token0, token1, pool, factory, oldPoolTVLETH)
    token0 = updateTvlRet.token0
    token1 = updateTvlRet.token1
    pool = updateTvlRet.pool
    factory = updateTvlRet.factory

    if (
        pool.tickAtPrice !== null &&
        lower.le(pool.tickAtPrice) &&
        upper.gt(pool.tickAtPrice)
      ) {
        pool.liquidity = pool.liquidity.plus(liquidityMintedParam)
    }
    
    basePrice.save()
    pool.save()
    factory.save()
    token0.save()
    token1.save()
    lowerTick.save()
    upperTick.save()
    position.save() 
    positionToken.save()
    positionTokenFraction.save()
}
