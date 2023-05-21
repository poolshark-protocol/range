/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { BigDecimal, log } from '@graphprotocol/graph-ts'
import { BasePrice, RangePoolFactory, RangePool, Token } from '../../../generated/schema'
import { AmountType, getAdjustedAmounts } from './price'
import { ZERO_ADDRESS } from './helpers'
import { safeLoadBasePrice, safeLoadToken } from './loads'


class UpdateDerivedTVLAmountsRet {
  token0: Token
  token1: Token
  pool: RangePool
  factory: RangePoolFactory
}
/**
 * Updates all dervived TVL values. This includes all ETH and USD
 * TVL metrics for a given pool, as well as in the aggregate factory.
 *
 * NOTE: tokens locked should be updated before this function is called,
 * as this logic starts its calculations based on TVL for token0 and token1
 * in the pool.
 *
 * This function should be used whenever the TVL of tokens changes within a pool.
 * Aka: mint, burn, swap, collect
 *
 * @param pool
 * @param factory
 * @param oldPoolTotalValueLockedETH
 * @returns tvlReturnInter
 */
export function updateDerivedTVLAmounts(
  token0: Token,
  token1: Token,
  pool: RangePool,
  factory: RangePoolFactory,
  oldRangePoolTotalValueLockedEth: BigDecimal
): UpdateDerivedTVLAmountsRet {
  let basePrice = safeLoadBasePrice('eth').entity

  if (token0 === null || token1 === null || basePrice === null) {
    return {
      token0: safeLoadToken(ZERO_ADDRESS).entity,
      token1: safeLoadToken(ZERO_ADDRESS).entity,
      pool,
      factory
    }
  }
  log.info('token0 ethPrice: {} :: basePrice: {}', [token0.ethPrice.toString(), basePrice.USD.toString()])
  log.info('token1 ethPrice: {} :: basePrice: {}', [token1.ethPrice.toString(), basePrice.USD.toString()])
  // Update token TVL values.
  token0.totalValueLockedUsd = token0.totalValueLocked.times(token0.ethPrice.times(basePrice.USD))
  token1.totalValueLockedUsd = token1.totalValueLocked.times(token1.ethPrice.times(basePrice.USD))

  // Get tracked and untracked amounts based on tokens in pool.
  let amounts: AmountType = getAdjustedAmounts(pool.totalValueLocked0, token0, pool.totalValueLocked1, token1, basePrice)

  // Update pool TVL values.
  pool.totalValueLockedEth = amounts.eth
  pool.totalValueLockedUsd = amounts.usd
  // Reset factory amounts before adding new TVL value.
  factory.totalValueLockedEth = factory.totalValueLockedEth.minus(oldRangePoolTotalValueLockedEth)

  // Add new TVL based on pool.
  factory.totalValueLockedEth = factory.totalValueLockedEth.plus(amounts.eth)
  factory.totalValueLockedUsd = factory.totalValueLockedEth.times(basePrice.USD)

  // Save entities.
  return {
    token0,
    token1,
    pool,
    factory
  }
}
