import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { RangePool, Position, Tick, Token, FeeTier, RangePoolManager, RangePoolFactory } from '../../../generated/schema'
import { ONE_BD } from '../../constants/constants'
import {
    fetchTokenSymbol,
    fetchTokenName,
    fetchTokenDecimals,
} from './helpers'
import { bigDecimalExponated, safeDiv } from './math'

class LoadTokenRet {
    entity: Token
    exists: boolean
}
export function safeLoadToken(address: string): LoadTokenRet {
    let exists = true

    let tokenEntity = Token.load(address)

    if (!tokenEntity) {
        tokenEntity = new Token(address)
        log.info('{}', [address])
        let tokenAddress = Address.fromString(address)
        tokenEntity.symbol = fetchTokenSymbol(tokenAddress)
        tokenEntity.name = fetchTokenName(tokenAddress)
        tokenEntity.decimals = fetchTokenDecimals(tokenAddress)

        exists = false
    }

    return {
        entity: tokenEntity,
        exists: exists,
    }
}

class LoadManagerRet {
    entity: RangePoolManager
    exists: boolean
}
export function safeLoadManager(address: string): LoadManagerRet {
    let exists = true

    let feeTierEntity = RangePoolManager.load(address)

    if (!feeTierEntity) {
        feeTierEntity = new RangePoolManager(address)
        exists = false
    }

    return {
        entity: feeTierEntity,
        exists: exists,
    }
}

class LoadFeeTierRet {
    entity: FeeTier
    exists: boolean
}
export function safeLoadFeeTier(fee: BigInt): LoadFeeTierRet {
    let exists = true

    let feeTierEntity = FeeTier.load(fee.toHex())

    if (!feeTierEntity) {
        feeTierEntity = new FeeTier(fee.toHex())
        exists = false
    }

    return {
        entity: feeTierEntity,
        exists: exists,
    }
}

class LoadTickRet {
    entity: Tick
    exists: boolean
}
export function safeLoadTick(address: string, index: BigInt): LoadTickRet {
    let exists = true

    let tickId = address
    .concat(index.toString())

    let tickEntity = Tick.load(tickId)

    if (!tickEntity) {
        tickEntity = new Tick(tickId)
        tickEntity.pool = address
        tickEntity.index = index
        tickEntity.previousTick = index.equals(BigInt.fromString("20")) ? BigInt.fromI32(-887272) : BigInt.fromI32(20)
        tickEntity.nextTick = index.equals(BigInt.fromString("20")) ? BigInt.fromI32(30) : BigInt.fromI32(887272)
        // 1.0001^tick is token1/token0.
        tickEntity.price0 = bigDecimalExponated(BigDecimal.fromString('1.0001'), BigInt.fromI32(tickEntity.index.toI32()))
        tickEntity.price1 = safeDiv(ONE_BD, tickEntity.price0)
        exists = false
    }

    return {
        entity: tickEntity,
        exists: exists,
    }
}

class LoadRangePoolRet {
    entity: RangePool
    exists: boolean
}
export function safeLoadRangePool(poolAddress: string): LoadRangePoolRet {
    let exists = true
    let rangePoolEntity = RangePool.load(poolAddress)

    if (!rangePoolEntity) {
        rangePoolEntity = new RangePool(poolAddress)
        exists = false
    }

    return {
        entity: rangePoolEntity,
        exists: exists,
    }
}

class LoadRangePoolFactoryRet {
    entity: RangePoolFactory
    exists: boolean
}
export function safeLoadRangePoolFactory(factoryAddress: string): LoadRangePoolFactoryRet {
    let exists = true
    let rangePoolFactoryEntity = RangePoolFactory.load(factoryAddress)

    if (!rangePoolFactoryEntity) {
        rangePoolFactoryEntity = new RangePoolFactory(factoryAddress)
        exists = false
    }

    return {
        entity: rangePoolFactoryEntity,
        exists: exists,
    }
}

class LoadPositionRet {
    entity: Position
    exists: boolean
}
export function safeLoadPosition(
    poolAddress: string,
    owner: string,
    lower: BigInt,
    upper: BigInt
): LoadPositionRet {
    let exists = true
    let fromToken: string

    let positionId = poolAddress
        .concat(owner)
        .concat(lower.toString())
        .concat(upper.toString())

    let positionEntity = Position.load(positionId)

    if (!positionEntity) {
        positionEntity = new Position(positionId)

        exists = false
    }

    return {
        entity: positionEntity,
        exists: exists,
    }
}
