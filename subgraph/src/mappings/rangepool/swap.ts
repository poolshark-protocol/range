import { BigDecimal, BigInt } from "@graphprotocol/graph-ts"
import { safeLoadBasePrice, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadSwap, safeLoadToken, safeLoadTransaction } from "../utils/loads"
import { convertTokenToDecimal } from "../utils/helpers"
import { ZERO_BD, TWO_BD, ONE_BI } from "../../constants/constants"
import { AmountType, findEthPerToken, getAdjustedAmounts, getEthPriceInUSD, sqrtPriceX96ToTokenPrices } from "../utils/price"
import { updateDerivedTVLAmounts } from "../utils/tvl"
import { Swap } from "../../../generated/RangePoolFactory/RangePool"

export function handleSwap(event: Swap): void {
    let amountInParam = event.params.amountIn
    let amountOutParam = event.params.amountOut
    let liquidityParam = event.params.liquidity
    let tickAtPriceParam = event.params.tickAtPrice
    let priceParam = event.params.price
    let recipientParam = event.params.recipient
    let zeroForOneParam = event.params.zeroForOne
    let poolAddress = event.address.toHex()
    let senderParam = event.transaction.from

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

    let amount0: BigDecimal; let amount1: BigDecimal;
    if (zeroForOneParam) {
        amount0 = convertTokenToDecimal(amountInParam, token0.decimals)
        amount1 = convertTokenToDecimal(amountOutParam, token1.decimals)
    } else {
        amount1 = convertTokenToDecimal(amountInParam, token1.decimals)
        amount0 = convertTokenToDecimal(amountOutParam, token0.decimals)
    }

    let amount0Abs = amount0.times(BigDecimal.fromString(amount0.lt(ZERO_BD) ? '-1' : '1'))
    let amount1Abs = amount1.times(BigDecimal.fromString(amount1.lt(ZERO_BD) ? '-1' : '1'))
    let volumeAmounts: AmountType = getAdjustedAmounts(amount0Abs, token0, amount1Abs, token1)
    let volumeEth = volumeAmounts.eth.div(TWO_BD)
    let volumeUsd = volumeAmounts.usd.div(TWO_BD)
    // not being indexed for now
    let volumeUsdUntracked = volumeAmounts.usdUntracked.div(TWO_BD)

    let feesEth = volumeEth.times(BigDecimal.fromString(pool.feeTier)).div(BigDecimal.fromString('1000000'))
    let feesUsd = volumeUsd.times(BigDecimal.fromString(pool.feeTier)).div(BigDecimal.fromString('1000000'))

    factory.txnCount = factory.txnCount.plus(ONE_BI)
    pool.txnCount = pool.txnCount.plus(ONE_BI)
    token0.txnCount = token0.txnCount.plus(ONE_BI)
    token1.txnCount = token1.txnCount.plus(ONE_BI)

    factory.feesEthTotal = factory.feesEthTotal.plus(feesEth)
    factory.feesUsdTotal = factory.feesUsdTotal.plus(feesUsd)
    pool.feesUsd = pool.feesUsd.plus(feesUsd)
    pool.feesEth = pool.feesEth.plus(feesEth)
    token0.feesEthTotal = token0.feesEthTotal.plus(feesEth)
    token0.feesUsdTotal = token0.feesUsdTotal.plus(feesUsd)
    token1.feesEthTotal = token1.feesEthTotal.plus(feesEth)
    token1.feesUsdTotal = token1.feesUsdTotal.plus(feesUsd)

    factory.volumeEthTotal = factory.volumeEthTotal.plus(volumeEth)
    factory.volumeUsdTotal = factory.volumeUsdTotal.plus(volumeUsd)
    pool.volumeToken0 = pool.volumeToken0.plus(amount0Abs)
    pool.volumeToken1 = pool.volumeToken1.plus(amount1Abs)
    pool.volumeUsd = pool.volumeUsd.plus(volumeUsd)
    token0.volume = token0.volume.plus(amount0Abs)
    token0.volumeUsd = token0.volumeUsd.plus(volumeUsd)
    token1.volume = token1.volume.plus(amount1Abs)
    token1.volumeUsd = token1.volumeUsd.plus(volumeUsd)

    pool.liquidity = liquidityParam
    pool.nearestTick = BigInt.fromI32(tickAtPriceParam)
    pool.price = priceParam

    let prices = sqrtPriceX96ToTokenPrices(pool.price, token0, token1)
    pool.price0 = prices[0]
    pool.price1 = prices[1]
    pool.save()

    basePrice.ethUsd = getEthPriceInUSD()
    basePrice.save()
    token0.ethPrice = findEthPerToken(token0)
    token1.ethPrice = findEthPerToken(token1)

    let oldPoolTVLEth = pool.totalValueLockedEth
    pool.totalValueLocked0 = pool.totalValueLocked0.plus(amount0)
    pool.totalValueLocked1 = pool.totalValueLocked1.plus(amount1)
    token0.totalValueLocked = token0.totalValueLocked.plus(amount0)
    token1.totalValueLocked = token1.totalValueLocked.plus(amount1)
    updateDerivedTVLAmounts(pool, factory, oldPoolTVLEth)

    let transaction = safeLoadTransaction(event).entity
    let loadSwap = safeLoadSwap(event, pool)
    let swap = loadSwap.entity
    if (!loadSwap.exists) {
        swap.transaction = transaction.id
        swap.recipient = recipientParam
        swap.timestamp = transaction.timestamp
        swap.pool = pool.id
        swap.zeroForOne = zeroForOneParam
        swap.amount0 = amount0
        swap.amount1 = amount1
        swap.amountUsd = volumeUsd
        swap.priceAfter = priceParam
        swap.tickAfter = BigInt.fromI32(tickAtPriceParam)
        swap.txnIndex = pool.txnCount
    }

    //TODO: add hour and daily data
    basePrice.save()
    pool.save()
    factory.save()
    token0.save()
    token1.save()
    transaction.save()
    swap.save()
}