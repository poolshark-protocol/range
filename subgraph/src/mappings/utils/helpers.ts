import { log, BigInt, BigDecimal, Address, Bytes } from '@graphprotocol/graph-ts'
import { ERC20 } from '../../../generated/RangePoolFactory/ERC20'
import { ERC20SymbolBytes } from '../../../generated/RangePoolFactory/ERC20SymbolBytes'
import { ERC20NameBytes } from '../../../generated/RangePoolFactory/ERC20NameBytes'
import { RangePoolFactory } from '../../../generated/schema'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export let BIGINT_ZERO = BigInt.fromI32(0)
export let BIGINT_ONE = BigInt.fromI32(1)
export let BIGDECIMAL_ZERO = BigDecimal.fromString('0')
export let BIGDECIMAL_ONE = BigDecimal.fromString('1')
export let BIGDECIMAL_ONE_PERCENT = BigDecimal.fromString('0.01')
export let BIGINT_18 = BigInt.fromI32(18)

export function fetchFactoryOwner(factoryId: string): Bytes {
    let factoryAddress = Address.fromString(factoryId)
    let contract = RangePoolFactory.bind(factoryAddress)
    let owner = ZERO_ADDRESS
    let ownerResult = contract.try_owner()
    if (!ownerResult.reverted) {
        owner = ownerResult.value
    }
    return Bytes.fromHexString(owner)
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (
        let i = BIGINT_ZERO;
        i.lt(decimals as BigInt);
        i = i.plus(BIGINT_ONE)
    ) {
        bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
}

export function bigDecimalExp18(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000')
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
    return eth.toBigDecimal().div(exponentToBigDecimal(BigInt.fromI32(18)))
}

export function convertTokenToDecimal(
    tokenAmount: BigInt,
    exchangeDecimals: BigInt
): BigDecimal {
    if (exchangeDecimals == BIGINT_ZERO) {
        return tokenAmount.toBigDecimal()
    }
    return tokenAmount
        .toBigDecimal()
        .div(exponentToBigDecimal(exchangeDecimals))
}

export function equalToZero(value: BigDecimal): boolean {
    const formattedVal = parseFloat(value.toString())
    const zero = parseFloat(BIGDECIMAL_ZERO.toString())
    if (zero == formattedVal) {
        return true
    }
    return false
}

export function isNullEthValue(value: string): boolean {
    return (
        value ==
        '0x0000000000000000000000000000000000000000000000000000000000000001'
    )
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    // hard coded overrides
    if (
        tokenAddress.toHexString() ==
        '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a'
    ) {
        return 'DGD'
    }
    if (
        tokenAddress.toHexString() ==
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'
    ) {
        return 'AAVE'
    }

    let contract = ERC20.bind(tokenAddress)
    let contractSymbolBytes = ERC20SymbolBytes.bind(tokenAddress)

    // try types string and bytes32 for symbol
    let symbolValue = 'unknown'
    let symbolResult = contract.try_symbol()
    if (symbolResult.reverted) {
        let symbolResultBytes = contractSymbolBytes.try_symbol()
        if (!symbolResultBytes.reverted) {
            // for broken pairs that have no symbol function exposed
            if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
                symbolValue = symbolResultBytes.value.toString()
            }
        }
    } else {
        symbolValue = symbolResult.value
    }

    return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
    // hard coded overrides
    if (
        tokenAddress.toHexString() ==
        '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a'
    ) {
        return 'DGD'
    }
    if (
        tokenAddress.toHexString() ==
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'
    ) {
        return 'Aave Token'
    }

    let contract = ERC20.bind(tokenAddress)
    let contractNameBytes = ERC20NameBytes.bind(tokenAddress)

    // try types string and bytes32 for name
    let nameValue = 'unknown'
    let nameResult = contract.try_name()
    if (nameResult.reverted) {
        let nameResultBytes = contractNameBytes.try_name()
        if (!nameResultBytes.reverted) {
            // for broken exchanges that have no name function exposed
            if (!isNullEthValue(nameResultBytes.value.toHexString())) {
                nameValue = nameResultBytes.value.toString()
            }
        }
    } else {
        nameValue = nameResult.value
    }

    return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress)
    let totalSupplyValue = BigInt.fromI32(0)
    let totalSupplyResult = contract.try_totalSupply()
    if (!totalSupplyResult.reverted) {
        totalSupplyValue = totalSupplyResult.value
    }
    return BigInt.fromI32(totalSupplyValue)
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    // hardcode overrides
    if (
        tokenAddress.toHexString() ==
        '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9'
    ) {
        return BigInt.fromI32(18)
    }

    let contract = ERC20.bind(tokenAddress)
    // try types uint8 for decimals
    let decimalValue = 0
    let decimalResult = contract.try_decimals()
    if (!decimalResult.reverted) {
        decimalValue = decimalResult.value
    }
    return BigInt.fromI32(decimalValue)
}
