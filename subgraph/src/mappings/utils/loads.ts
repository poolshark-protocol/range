import { Address, BigDecimal, BigInt, Bytes, ethereum, log } from '@graphprotocol/graph-ts'
import { RangePool, Position, Tick, Token, FeeTier, RangePoolManager, RangePoolFactory, BasePrice, Transaction, Swap, PositionToken, PositionFraction, MintLog, BurnLog } from '../../../generated/schema'
import { ONE_BD } from '../../constants/constants'
import {
    fetchTokenSymbol,
    fetchTokenName,
    fetchTokenDecimals,
    BIGINT_ZERO,
} from './helpers'
import { bigDecimalExponated, safeDiv } from './math'
import { getEthPriceInUSD } from './price'

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

    let managerEntity = RangePoolManager.load(address)

    if (!managerEntity) {
        managerEntity = new RangePoolManager(address)
        exists = false
    }

    return {
        entity: managerEntity,
        exists: exists,
    }
}

class LoadMintLogRet {
    entity: MintLog
    exists: boolean
}
export function safeLoadMintLog(txnHash: Bytes, pool: string, lower: BigInt, upper: BigInt): LoadMintLogRet {
    let exists = true

    let mintLogId = txnHash.toString()
                    .concat('-')
                    .concat(pool)
                    .concat('-')
                    .concat(upper.toString())
                    .concat('-')
                    .concat(lower.toString())

    let mintLogEntity = MintLog.load(mintLogId)

    if (!mintLogEntity) {
        mintLogEntity = new MintLog(mintLogId)
        exists = false
    }

    return {
        entity: mintLogEntity,
        exists: exists,
    }
}

class LoadBurnLogRet {
    entity: BurnLog
    exists: boolean
}
export function safeLoadBurnLog(txnHash: Bytes, pool: string, lower: BigInt, upper: BigInt): LoadBurnLogRet {
    let exists = true

    let burnLogId = txnHash.toString()
                    .concat('-')
                    .concat(pool)
                    .concat('-')
                    .concat(upper.toString())
                    .concat('-')
                    .concat(lower.toString())

    let burnLogEntity = BurnLog.load(burnLogId)

    if (!burnLogEntity) {
        burnLogEntity = new BurnLog(burnLogId)
        exists = false
    }

    return {
        entity: burnLogEntity,
        exists: exists,
    }
}

class LoadBasePriceRet {
    entity: BasePrice
    exists: boolean
}
export function safeLoadBasePrice(name: string): LoadBasePriceRet {
    let exists = true

    let basePriceEntity = BasePrice.load(name)

    if (!basePriceEntity) {
        basePriceEntity = new BasePrice(name)
        exists = false
    }

    basePriceEntity.USD = getEthPriceInUSD()

    return {
        entity: basePriceEntity,
        exists: exists,
    }
}

class LoadTransactionRet {
    entity: Transaction
    exists: boolean
}
export function safeLoadTransaction(event: ethereum.Event): LoadTransactionRet {
    let exists = true

    let transactionEntity = Transaction.load(event.transaction.hash.toHex())

    if (!transactionEntity) {
        transactionEntity = new Transaction(event.transaction.hash.toHex())
        transactionEntity.sender = event.transaction.from
        transactionEntity.blockNumber = event.block.number
        transactionEntity.timestamp = event.block.timestamp
        transactionEntity.gasLimit = event.transaction.gasLimit
        transactionEntity.gasPrice = event.transaction.gasPrice
        exists = false
    }

    return {
        entity: transactionEntity,
        exists: exists,
    }
}

class LoadSwapRet {
    entity: Swap
    exists: boolean
}
export function safeLoadSwap(event: ethereum.Event, pool: RangePool): LoadSwapRet {
    let exists = true

    let swapId = event.transaction.hash.toHex()
                 .concat('-')
                 .concat(pool.txnCount.toString())
    let swapEntity = Swap.load(swapId)

    if (!swapEntity) {
        swapEntity = new Swap(swapId)
        swapEntity.pool = pool.id
        exists = false
    }

    return {
        entity: swapEntity,
        exists: exists,
    }
}

class LoadFeeTierRet {
    entity: FeeTier
    exists: boolean
}
export function safeLoadFeeTier(fee: BigInt): LoadFeeTierRet {
    let exists = true

    let feeTierEntity = FeeTier.load(fee.toString())

    if (!feeTierEntity) {
        feeTierEntity = new FeeTier(fee.toString())
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
        rangePoolEntity.liquidity = BIGINT_ZERO
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
export function safeLoadPositionById(
    positionId: string
): LoadPositionRet {
    let exists = true
    let fromToken: string

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

class LoadPositionTokenRet {
    entity: PositionToken
    exists: boolean
}
export function safeLoadPositionToken(
    poolAddress: string,
    tokenId: BigInt
): LoadPositionTokenRet {
    let exists = true

    let positionTokenId = poolAddress.concat(tokenId.toString())

    let positionTokenEntity = PositionToken.load(positionTokenId)

    if (!positionTokenEntity) {
        positionTokenEntity = new PositionToken(positionTokenId)
        positionTokenEntity.pool = poolAddress
        positionTokenEntity.totalSupply = BIGINT_ZERO
        positionTokenEntity.fractions = new Array<string>();
        exists = false
    }

    return {
        entity: positionTokenEntity,
        exists: exists,
    }
}

class LoadPositionFractionRet {
    entity: PositionFraction
    exists: boolean
}
export function safeLoadPositionFraction(
    poolAddress: string,
    tokenId: BigInt,
    owner: Address
): LoadPositionFractionRet {
    let exists = true

    let positionTokenId = poolAddress.concat(tokenId.toString())
    let positionFractionId = poolAddress.concat(tokenId.toString()).concat(owner.toHex())

    let positionFractionEntity = PositionFraction.load(positionFractionId)

    if (!positionFractionEntity) {
        positionFractionEntity = new PositionFraction(positionFractionId)
        positionFractionEntity.owner = owner
        positionFractionEntity.token = positionTokenId
        positionFractionEntity.amount = BIGINT_ZERO
        exists = false
    }

    return {
        entity: positionFractionEntity,
        exists: exists,
    }
}
