/* eslint-disable */
import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { RangePoolFactory as FactoryContract } from '../../generated/templates/RangePoolTemplate/RangePoolFactory'

export let FACTORY_ADDRESS = '0x58d8235108e12e6b725a53b57cd0b00c5edee0da'
export let WETH_ADDRESS = '0x7024879Eda80577Cbc0Cb039ad3c7081f38ABb41'

// tokens where USD value is safe to use for globals
export let WHITELIST_TOKENS: string[] = [
  '0x7024879Eda80577Cbc0Cb039ad3c7081f38ABb41', //WETH
  '0xA826F06C47597549faa74D8916EF4Da8f417F16c', //DAI
]

// used for safe eth pricing 
export let STABLE_COINS: string[] = [
  '0xA826F06C47597549faa74D8916EF4Da8f417F16c', //DAI
]

// used for safe eth pricing 
export const STABLE_POOL_ADDRESS = '0x39C459ed1EFe9f2959CF0a249fB964fE81Adf5D3'

// determines which token to use for eth<-> rate, true means stable is token0 in pool above 
export const STABLE_IS_TOKEN_0 = false

// minimum eth required in pool to count usd values towards global prices 
export let MINIMUM_ETH_LOCKED = BigDecimal.fromString('0')

// pool that breaks with subgraph logic 
export const ERROR_POOL = '0x0000000000000000000000000000000000000000'

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let TWO_BD = BigDecimal.fromString('2')
export let BI_18 = BigInt.fromI32(18)

export let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))

