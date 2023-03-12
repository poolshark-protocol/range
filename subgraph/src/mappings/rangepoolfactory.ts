import { RangePoolTemplate } from '../../generated/templates'
import {
    fetchTokenSymbol,
    fetchTokenName,
    fetchTokenDecimals,
    fetchFactoryOwner,
    BIGINT_ONE,
} from './utils/helpers'
import { safeLoadFeeTier, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadTick, safeLoadToken } from './utils/loads'
import { BigInt, log } from '@graphprotocol/graph-ts'
import { RangePoolCreated } from '../../generated/RangePoolFactory/RangePoolFactory'
import { sqrtPriceX96ToTokenPrices } from './utils/price'
import { ONE_BI } from '../constants/constants'

export function handlePoolCreated(event: RangePoolCreated): void {
    let loadFeeTier = safeLoadFeeTier(event.params.fee)
    let loadRangePool = safeLoadRangePool(event.params.pool.toHexString())
    let loadRangePoolFactory = safeLoadRangePoolFactory(event.transaction.from.toHex())
    let loadToken0 = safeLoadToken(event.params.token0.toHexString())
    let loadToken1 = safeLoadToken(event.params.token1.toHexString())
    let loadMinTick = safeLoadTick(event.params.pool.toHexString(), BigInt.fromI32(887272))
    let loadMaxTick = safeLoadTick(event.params.pool.toHexString(), BigInt.fromI32(-887272))
    
    let feeTier = loadFeeTier.entity
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity
    let pool = loadRangePool.entity
    let factory = loadRangePoolFactory.entity
    let minTick = loadMinTick.entity
    let maxTick = loadMaxTick.entity

    if (!loadRangePoolFactory.exists) {
        let owner = fetchFactoryOwner(factory.id)
        factory.owner = owner
    }

    // fetch info if null
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
    pool.token0 = token0.id
    pool.token1 = token1.id
    pool.feeTier = feeTier.id
    pool.price = event.params.startPrice
    pool.nearestTick = minTick.id
    let prices = sqrtPriceX96ToTokenPrices(pool.price, token0, token1)
    pool.price0 = prices[0]
    pool.price1 = prices[1]
    pool.factory = factory.id

    factory.poolCount = factory.poolCount.plus(ONE_BI)
    factory.txnCount  = factory.txnCount.plus(ONE_BI)

    pool.save()
    factory.save()
    token0.save()
    token1.save()
    maxTick.save()
    minTick.save()

    // create the tracked contract based on the template
    RangePoolTemplate.create(event.params.pool)
}