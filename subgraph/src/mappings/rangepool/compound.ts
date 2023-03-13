import { safeLoadPosition, safeLoadRangePool, safeLoadRangePoolFactory, safeLoadToken } from "../utils/loads"
import {
    BigInt
} from '@graphprotocol/graph-ts'
import { convertTokenToDecimal } from "../utils/helpers"
import { Compound } from "../../../generated/RangePoolFactory/RangePool"

export function handleCompound(event: Compound): void {
    let ownerParam = event.params.owner.toHex()
    let lowerParam = event.params.lower
    let upperParam = event.params.upper
    let liquidityCompoundedParam = event.params.liquidityCompounded
    let positionAmount0Param = event.params.positionAmount0
    let positionAmount1Param = event.params.positionAmount1
    let poolAddress = event.address.toHex()
    let senderParam = event.transaction.from

    let lower = BigInt.fromI32(lowerParam)
    let upper = BigInt.fromI32(upperParam)

    let loadRangePool = safeLoadRangePool(poolAddress)
    let pool = loadRangePool.entity
    let loadRangePoolFactory = safeLoadRangePoolFactory(pool.factory)
    let loadToken0 = safeLoadToken(pool.token0)
    let loadToken1 = safeLoadToken(pool.token1)
    let factory = loadRangePoolFactory.entity
    let token0 = loadToken0.entity
    let token1 = loadToken1.entity

    let loadPosition = safeLoadPosition(
        poolAddress,
        ownerParam,
        lower,
        upper
    )
    let position = loadPosition.entity

    if (!loadPosition.exists) {
        //throw an error
    }
    //TODO: update pool with compounded liquidity
    // convert amounts to decimal values
    let amount0 = convertTokenToDecimal(positionAmount0Param, token0.decimals)
    let amount1 = convertTokenToDecimal(positionAmount0Param, token1.decimals)
    position.liquidity = position.liquidity.plus(liquidityCompoundedParam)
    position.amount0 = amount0
    position.amount1 = amount1
    position.save()
}