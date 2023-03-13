/* eslint-disable */
import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { RangePoolFactory as FactoryContract } from '../../generated/templates/RangePoolTemplate/RangePoolFactory'

export let FACTORY_ADDRESS = '{{factory_address}}'
export let WETH_ADDRESS = '{{weth_address}}'

// tokens where USD value is safe to use for globals
export let WHITELIST_TOKENS: string[] = [
  {{#whitelist_tokens}}
  '{{address}}', //{{blurb}}
  {{/whitelist_tokens}}
]

// used for safe eth pricing 
export let STABLE_COINS: string[] = [
  {{#stablecoins}}
  '{{address}}', //{{blurb}}
  {{/stablecoins}}
]

// used for safe eth pricing 
export const STABLE_POOL_ADDRESS = '{{stable_pool_address}}'

// determines which token to use for eth<-> rate, true means stable is token0 in pool above 
export const STABLE_IS_TOKEN_0 = {{stableIsToken0}}

// minimum eth required in pool to count usd values towards global prices 
export let MINIMUM_ETH_LOCKED = BigDecimal.fromString('{{min_eth}}')

// pool that breaks with subgraph logic 
export const ERROR_POOL = '{{error_pool}}'

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let TWO_BD = BigDecimal.fromString('2')
export let BI_18 = BigInt.fromI32(18)

export let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))

