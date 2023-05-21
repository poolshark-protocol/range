import { RangePoolTemplate } from '../../generated/templates'
import {
    fetchTokenSymbol,
    fetchTokenName,
    fetchTokenDecimals,
    fetchFactoryOwner,
    BIGINT_ONE,
    BIGDECIMAL_ZERO,
    BIGINT_ZERO,
} from './utils/helpers'
import { safeLoadBasePrice, safeLoadFeeTier, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadTick, safeLoadToken } from './utils/loads'
import { BigInt, log } from '@graphprotocol/graph-ts'
import { RangePoolCreated } from '../../generated/RangePoolFactory/RangePoolFactory'
import { sqrtPriceX96ToTokenPrices } from './utils/price'
import { ONE_BI } from '../constants/constants'

export function handleRangePoolCreated(event: RangePoolCreated): void {
    let loadBasePrice = safeLoadBasePrice('eth')
    let loadFeeTier = safeLoadFeeTier(BigInt.fromI32(event.params.fee))
    let loadRangePool = safeLoadRangePool(event.params.pool.toHexString())
    let loadRangePoolFactory = safeLoadRangePoolFactory(event.address.toHex())
    let loadToken0 = safeLoadToken(event.params.token0.toHexString())
    let loadToken1 = safeLoadToken(event.params.token1.toHexString())
    let loadMinTick = safeLoadTick(event.params.pool.toHexString(), BigInt.fromI32(887272))
    let loadMaxTick = safeLoadTick(event.params.pool.toHexString(), BigInt.fromI32(-887272))
    
    let basePrice = loadBasePrice.entity
    let feeTier = loadFeeTier.entity
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity
    let pool = loadRangePool.entity
    let factory = loadRangePoolFactory.entity
    let minTick = loadMinTick.entity
    let maxTick = loadMaxTick.entity

    log.info("factory address: {}", [factory.id])

    if (!loadRangePoolFactory.exists) {
        //something is wrong
    }
    if (!loadBasePrice.exists) {
        basePrice.USD = BIGDECIMAL_ZERO
        basePrice.save()
    }
    if (!loadToken0.exists) {
        token0.symbol = fetchTokenSymbol(event.params.token0)
        token0.name = fetchTokenName(event.params.token0)
        let decimals = fetchTokenDecimals(event.params.token0)
        // bail if we couldn't figure out the decimals
        if (decimals === null) {
            log.debug('token0 decimals null', [])
            return
        }
        token0.decimals = decimals
    }
    if (!loadToken0.exists) {
        token1.symbol = fetchTokenSymbol(event.params.token1)
        token1.name = fetchTokenName(event.params.token1)
        let decimals = fetchTokenDecimals(event.params.token1)
        // bail if we couldn't figure out the decimals
        if (decimals === null) {
            log.debug('token1 decimals null', [])
            return
        }
        token1.decimals = decimals
    }
    // calculate tick at initial sqrt price

    pool.token0 = token0.id
    pool.token1 = token1.id
    pool.feeTier = feeTier.id
    pool.price = event.params.startPrice
    pool.tickAtPrice = BIGINT_ZERO
    let prices = sqrtPriceX96ToTokenPrices(pool.price, token0, token1)
    pool.price0 = prices[0]
    pool.price1 = prices[1]
    
    pool.factory = factory.id
    pool.createdAtBlockNumber = event.block.number
    pool.createdAtTimestamp   = event.block.timestamp
    pool.updatedAtBlockNumber = event.block.number
    pool.updatedAtTimestamp   = event.block.timestamp

    factory.poolCount = factory.poolCount.plus(ONE_BI)
    factory.txnCount  = factory.txnCount.plus(ONE_BI)

    pool.save()
    factory.save()
    token0.save()
    token1.save()
    maxTick.save()
    minTick.save()

    RangePoolTemplate.create(event.params.pool)
}