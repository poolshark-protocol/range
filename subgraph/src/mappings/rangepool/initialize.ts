import { safeLoadBasePrice, safeLoadPosition, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadTick, safeLoadToken } from "../utils/loads"
import {
    BigInt
} from '@graphprotocol/graph-ts'
import { convertTokenToDecimal } from "../utils/helpers"
import { Initialize } from "../../../generated/RangePoolFactory/RangePool"
import { findEthPerToken, sqrtPriceX96ToTokenPrices } from "../utils/price"

export function handleInitialize(event: Initialize): void {
    let startPriceParam = event.params.startPrice
    let tickAtPriceParam = event.params.tickAtPrice
    let minTickParam = event.params.minTick
    let maxTickParam = event.params.maxTick
    let poolAddress = event.address.toHex()

    let min = BigInt.fromI32(minTickParam)
    let max = BigInt.fromI32(maxTickParam)

    let loadMinTick = safeLoadTick(poolAddress, min)
    let loadMaxTick = safeLoadTick(poolAddress, max)
    let minTick = loadMinTick.entity
    let maxTick = loadMaxTick.entity

    let loadRangePool = safeLoadRangePool(poolAddress)
    let pool = loadRangePool.entity
    let loadToken0 = safeLoadToken(pool.token0)
    let loadToken1 = safeLoadToken(pool.token1)
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity

    pool.price = startPriceParam
    pool.tickAtPrice = BigInt.fromI32(tickAtPriceParam)
    let prices = sqrtPriceX96ToTokenPrices(pool.price, token0, token1)
    pool.price0 = prices[0]
    pool.price1 = prices[1]

    minTick.save()
    maxTick.save()
    pool.save()

    let loadBasePrice = safeLoadBasePrice('eth')
    let basePrice = loadBasePrice.entity

    // price updates
    token0.ethPrice = findEthPerToken(token0, token1, basePrice)
    token1.ethPrice = findEthPerToken(token1, token0, basePrice)
    token0.usdPrice = token0.ethPrice.times(basePrice.USD)
    token1.usdPrice = token1.ethPrice.times(basePrice.USD)

    basePrice.save()
    token0.save()
    token1.save()
}