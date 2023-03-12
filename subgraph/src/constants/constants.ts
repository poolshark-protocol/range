/* eslint-disable */
import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import { RangePoolFactory as FactoryContract } from '../../generated/templates/RangePoolTemplate/RangePoolFactory'

export let FACTORY_ADDRESS = '0xB01BF7d3C2E98179646856cfa8Eb006b4fb7dfBD'
export let WETH_ADDRESS = '0x45742D32B5b4FCF7F5C5934b7a3718b230fBeBee'

// tokens where USD value is safe to use for globals
export let WHITELIST_TOKENS: string[] = [
  '0x45742D32B5b4FCF7F5C5934b7a3718b230fBeBee', //WETH
  '0xcc49bB7bCD60D0D84a5bD3790b46b60F57301394', //DAI
]

// used for safe eth pricing 
export let STABLE_COINS: string[] = [
  '0x6b175474e89094c44da98b954eedeac495271d0f', //DAI
]

// used for safe eth pricing 
export const STABLE_POOL_ADDRESS = '0xe0e58122264262a2986828e412Bbd92f28B6D643'

// determines which token to use for eth<-> rate, true means stable is token0 in pool above 
export const STABLE_IS_TOKEN_0 = false

// minimum eth required in pool to count usd values towards global prices 
export let MINIMUM_ETH_LOCKED = BigDecimal.fromString('0')

// pool that breaks with subgraph logic 
export const ERROR_POOL = '0x8fe8d9bb8eeba3ed688069c3d6b556c9ca258248'

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let TWO_BD = BigDecimal.fromString('2')
export let BI_18 = BigInt.fromI32(18)

export let factoryContract = FactoryContract.bind(Address.fromString(FACTORY_ADDRESS))

