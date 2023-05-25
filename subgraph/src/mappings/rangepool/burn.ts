import { Address, store } from "@graphprotocol/graph-ts"
import { Burn } from "../../../generated/RangePoolFactory/RangePool"
import { safeLoadBasePrice, safeLoadPositionById, safeLoadPositionFraction, safeLoadPositionToken, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadTick, safeLoadToken } from "../utils/loads"
import {
    BigInt,
} from '@graphprotocol/graph-ts'
import { ONE_BI } from "../../constants/constants"
import { updateDerivedTVLAmounts } from "../utils/tvl"
import { BIGINT_ZERO, convertTokenToDecimal } from "../utils/helpers"
import { findEthPerToken } from "../utils/price"

export function handleBurn(event: Burn): void {
    let recipientParam = event.params.recipient.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper
    let tokenIdParam = event.params.tokenId
    let tokenBurnedParam = event.params.tokenBurned
    let liquidityBurnedParam = event.params.liquidityBurned
    let amount0Param = event.params.amount0
    let amoun1Param = event.params.amount1
    let poolAddress = event.address.toHex()
    let msgSender = event.transaction.from.toHex()

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadPositionToken = safeLoadPositionToken(
        poolAddress,
        tokenIdParam
    )
    let positionToken = loadPositionToken.entity
    let loadPositionFraction = safeLoadPositionFraction(
        poolAddress,
        tokenIdParam,
        Address.fromString(msgSender)
    )
    let positionFraction = loadPositionFraction.entity
    let loadPosition = safeLoadPositionById(positionToken.position)
    let position = loadPosition.entity

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
    let lowerTick = loadLowerTick.entity
    let upperTick = loadUpperTick.entity

    // convert amounts to decimal values
    let amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
    let amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
    let amountUsd = amount0
        .times(token0.ethPrice.times(basePrice.USD))
        .plus(amount1.times(token1.ethPrice.times(basePrice.USD)))

    if (positionFraction.amount.equals(tokenBurnedParam)) {
        let positionTokenFractions = positionToken.fractions
        let fractionIndex = positionTokenFractions.indexOf(positionFraction.id)
        positionTokenFractions.splice(fractionIndex, 1)
        positionToken.fractions = positionTokenFractions
        store.remove('PositionFraction', poolAddress.concat(tokenIdParam.toHex()).concat(msgSender))
    } else {
        positionFraction.amount = positionFraction.amount.minus(tokenBurnedParam)
        positionFraction.updatedAtBlockNumber = event.block.number
        positionFraction.updatedAtTimestamp = event.block.timestamp
        positionFraction.save()
    }

    if (position.liquidity.equals(liquidityBurnedParam)) {
        store.remove('Position', poolAddress
                                    .concat(poolAddress)
                                    .concat(lower.toString())
                                    .concat(upper.toString()))
    } else {
        position.liquidity = position.liquidity.minus(liquidityBurnedParam)
        position.updatedAtBlockNumber = event.block.number
        position.updatedAtTimestamp = event.block.timestamp
        position.save()
    }
    if (positionToken.totalSupply.equals(tokenBurnedParam)) {
        store.remove('PositionToken', poolAddress.concat(tokenIdParam.toHex()))
    } else {
        positionToken.totalSupply = positionToken.totalSupply.minus(tokenBurnedParam)
        positionToken.save()
    }
    lowerTick.liquidityDelta = lowerTick.liquidityDelta.minus(liquidityBurnedParam)
    upperTick.liquidityDelta = upperTick.liquidityDelta.plus(liquidityBurnedParam)
    upperTick.liquidityDeltaMinus = upperTick.liquidityDeltaMinus.minus(liquidityBurnedParam)
    
    // remove from store to sync up with pool
    if(lowerTick.liquidityDelta.equals(BIGINT_ZERO) && lowerTick.liquidityDeltaMinus.equals(BIGINT_ZERO)) {
        store.remove('Tick', poolAddress.concat(lower.toString()))
    } else {
        lowerTick.save()
    }
    if(upperTick.liquidityDelta.equals(BIGINT_ZERO) && upperTick.liquidityDeltaMinus.equals(BIGINT_ZERO)) {
        store.remove('Tick', poolAddress.concat(upper.toString()))
    } else {
        upperTick.save()
    }

    token0.txnCount = token0.txnCount.plus(ONE_BI)
    token1.txnCount = token1.txnCount.plus(ONE_BI)
    pool.txnCount = pool.txnCount.plus(ONE_BI)
    factory.txnCount = factory.txnCount.plus(ONE_BI)

    // eth price updates
    token0.ethPrice = findEthPerToken(token0, token1)
    token1.ethPrice = findEthPerToken(token1, token0)
    token0.usdPrice = token0.ethPrice.times(basePrice.USD)
    token1.usdPrice = token1.ethPrice.times(basePrice.USD)

    // tvl updates
    let oldPoolTotalValueLockedEth = pool.totalValueLockedEth
    token0.totalValueLocked = token0.totalValueLocked.minus(amount0)
    token1.totalValueLocked = token1.totalValueLocked.minus(amount1)
    pool.totalValueLocked0 = pool.totalValueLocked0.minus(amount0)
    pool.totalValueLocked1 = pool.totalValueLocked1.minus(amount1)
    let updateTvlRet = updateDerivedTVLAmounts(token0, token1, pool, factory, oldPoolTotalValueLockedEth)
    token0 = updateTvlRet.token0
    token1 = updateTvlRet.token1
    pool = updateTvlRet.pool
    factory = updateTvlRet.factory

    if (
        pool.tickAtPrice !== null &&
        lower.le(pool.tickAtPrice) &&
        upper.gt(pool.tickAtPrice)
      ) {
        pool.liquidity = pool.liquidity.minus(liquidityBurnedParam)
    }
    token0.save()
    token1.save()
    pool.save()
    factory.save()
    basePrice.save()
}